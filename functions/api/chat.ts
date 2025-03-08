/// <reference lib="es2018" />
/// <reference types="openai" />

// 添加 OpenAI 类型声明
declare module 'openai' {
  class OpenAIApi {
    constructor(config: { apiKey: string; baseURL?: string; defaultHeaders?: Record<string, string> });
    chat: {
      completions: {
        create(params: any): Promise<any>;
      };
    };
  }
  export default OpenAIApi;
}

import OpenAI from 'openai';
import { modelConfigs } from '../../src/config/aiCharacters';

interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

interface CompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index?: number;
    message?: { role: string; content: string };
    delta?: { content: string };
    finish_reason?: string;
  }>;
}

interface RequestConfig {
  model: string;
  messages: Message[];
  temperature: number;
  max_tokens: number;
  stream?: boolean;
  do_sample?: boolean;
  top_p?: number;
}

// 解析 SSE 数据
function parseSSEResponse(chunk: Uint8Array): string {
  const text = new TextDecoder().decode(chunk);
  const lines = text.split('\n');
  let content = '';
  
  for (const line of lines) {
    if (line.startsWith('data: ')) {
      try {
        const data = JSON.parse(line.slice(6));
        if (data.choices?.[0]?.delta?.content) {
          content += data.choices[0].delta.content;
        }
      } catch (e) {
        console.error('解析 SSE 数据失败:', e);
      }
    }
  }
  return content;
}

export async function onRequestPost({ env, request }) {
  let currentModel = '';
  let currentApiKey = '';
  let currentModelConfig = null;
  
  try {
    const { message, custom_prompt, history, aiName, index, model = "qwen-plus" } = await request.json();
    
    currentModel = model;
    const modelConfig = Array.from(modelConfigs).find(config => config.model === model);
    currentModelConfig = modelConfig;

    if (!modelConfig) {
      throw new Error(`不支持的模型类型: ${model}`);
    }

    // 从环境变量中获取 API key
    const apiKey = env[modelConfig.apiKey];
    currentApiKey = apiKey;
    
    if (!apiKey) {
      throw new Error(`${model} 的API密钥未配置 (${modelConfig.apiKey})`);
    }

    // 根据性格设置不同的系统提示语
    const systemPrompt = custom_prompt + "\n 注意重要：1、你在群里叫" + aiName + "，你的回复中不要添加任何前缀，直接输出内容；2、如果用户提出玩游戏，比如成语接龙等，严格按照游戏规则，不要说一大堆，要简短精炼; 3、不要重复别人的话！4、不要在回复前添加自己的名字或其他人的名字作为前缀！"

    // 构建完整的消息历史
    const messages: Message[] = [
      { role: "system", content: systemPrompt },
      ...history.map(msg => ({
        role: msg.role as "system" | "user" | "assistant",
        content: msg.content
      })).slice(-10),
      ...(index === 0 ? [{ role: "user", content: message }] : [])
    ];

    if (index > 0) {
      messages.splice(messages.length - index, 0, { role: "user", content: message });
    }

    // 根据不同的模型处理请求
    switch (model) {
      case "moonshot-v1-8k": {
        // Kimi - 使用 OpenAI 客户端
        const openai = new OpenAI({
          apiKey: apiKey,
          baseURL: modelConfig.baseURL
        });

        const stream = await openai.chat.completions.create({
          model: "moonshot-v1-8k",
          messages,
          temperature: 0.3,
          stream: true
        });

        const readable = new ReadableStream({
          async start(controller) {
            try {
              for await (const chunk of stream as AsyncIterable<CompletionResponse>) {
                const content = chunk.choices?.[0]?.delta?.content || '';
                if (content) {
                  const trimmedContent = content.replace(/^[\s,，。\.]+/, '');
                  if (trimmedContent) {
                    controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ content: trimmedContent })}\n\n`));
                  }
                }
              }
              controller.close();
            } catch (error) {
              console.error('Kimi 流式响应处理失败:', error);
              controller.error(new Error(`Kimi 流式响应处理失败: ${error.message}`));
            }
          }
        });

        return new Response(readable, {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
          }
        });
      }

      case "glm-4-plus": {
        // 智谱 - 流式响应
        const glmRequest = {
          model: "glm-4-plus",
          messages,
          temperature: 0.7,
          max_tokens: 1000,
          stream: true,
          do_sample: true,
          top_p: 0.7
        };

        try {
          const response = await fetch(`${modelConfig.baseURL}/v4/chat/completions`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify(glmRequest)
          });

          if (!response.ok) {
            const errorText = await response.text();
            console.error('智谱 API Error:', {
              status: response.status,
              statusText: response.statusText,
              error: errorText,
              requestConfig: { ...glmRequest, messages: '[已省略]' }
            });
            throw new Error(`智谱 API error: ${response.status} ${response.statusText} - ${errorText}`);
          }

          // 创建 ReadableStream 处理流式响应
          const readable = new ReadableStream({
            async start(controller) {
              try {
                const reader = response.body.getReader();
                let buffer = '';

                while (true) {
                  const { done, value } = await reader.read();
                  if (done) {
                    if (buffer) {
                      const content = parseSSEResponse(new TextEncoder().encode(buffer));
                      if (content) {
                        controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ content })}\n\n`));
                      }
                    }
                    controller.close();
                    break;
                  }

                  const chunk = new TextDecoder().decode(value);
                  buffer += chunk;
                  const lines = buffer.split('\n\n');
                  buffer = lines.pop() || '';

                  for (const line of lines) {
                    if (line.trim()) {
                      const content = parseSSEResponse(new TextEncoder().encode(line));
                      if (content) {
                        controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ content })}\n\n`));
                      }
                    }
                  }
                }
              } catch (error) {
                console.error('智谱流式响应处理失败:', error);
                controller.error(new Error(`智谱流式响应处理失败: ${error.message}`));
              }
            }
          });

          return new Response(readable, {
            headers: {
              'Content-Type': 'text/event-stream',
              'Cache-Control': 'no-cache',
              'Connection': 'keep-alive'
            }
          });
        } catch (error) {
          console.error('智谱 API 请求失败:', error);
          throw error;
        }
      }

      case "doubao-1.5-lite-32k": {
        // 豆包 - 使用 OpenAI 客户端
        const openai = new OpenAI({
          apiKey: apiKey,
          baseURL: modelConfig.baseURL,
          defaultHeaders: modelConfig.headers ? {
            'Authorization': `Bearer ${apiKey}`
          } : undefined
        });

        const stream = await openai.chat.completions.create({
          model: "doubao-1.5-lite-32k",
          messages,
          temperature: 0.7,
          max_tokens: 1000,
          stream: true
        });

        const readable = new ReadableStream({
          async start(controller) {
            try {
              for await (const chunk of stream as AsyncIterable<CompletionResponse>) {
                const content = chunk.choices?.[0]?.delta?.content || '';
                if (content) {
                  const trimmedContent = content.replace(/^[\s,，。\.]+/, '');
                  if (trimmedContent) {
                    controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ content: trimmedContent })}\n\n`));
                  }
                }
              }
              controller.close();
            } catch (error) {
              console.error('豆包流式响应处理失败:', error);
              controller.error(new Error(`豆包流式响应处理失败: ${error.message}`));
            }
          }
        });

        return new Response(readable, {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
          }
        });
      }

      default: {
        // 其他模型使用 OpenAI 客户端
        const openai = new OpenAI({
          apiKey: apiKey,
          baseURL: modelConfig.baseURL,
          defaultHeaders: (('headers' in modelConfig && modelConfig.headers) ? {
            [Object.keys(modelConfig.headers)[0]]: modelConfig.headers[Object.keys(modelConfig.headers)[0]].replace('{apiKey}', apiKey)
          } : undefined),
        });

        const stream = await openai.chat.completions.create({
          model,
          messages,
          temperature: 0.7,
          max_tokens: 1000,
          stream: true
        });

        const readable = new ReadableStream({
          async start(controller) {
            try {
              for await (const chunk of stream as AsyncIterable<CompletionResponse>) {
                const content = chunk.choices?.[0]?.delta?.content || '';
                if (content) {
                  const trimmedContent = content.replace(/^[\s,，。\.]+/, '');
                  if (trimmedContent) {
                    controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ content: trimmedContent })}\n\n`));
                  }
                }
              }
              controller.close();
            } catch (error) {
              console.error('Stream Error:', error);
              controller.error(new Error(`Stream processing failed: ${error.message}`));
            }
          },
        });

        return new Response(readable, {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
          },
        });
      }
    }
  } catch (error) {
    console.error('API Error:', error);
    
    // 构建更详细的错误响应
    const errorResponse = {
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      detail: String(error),
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
      model: currentModel,
      apiKeyName: currentModelConfig?.apiKey,
      baseURL: currentModelConfig?.baseURL,
      hasApiKey: !!currentApiKey,
    };

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { 
        'Content-Type': 'application/json',
        'X-Error-Type': error instanceof Error ? error.name : 'UnknownError',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });
  }
}