/// <reference lib="es2018" />
/// <reference types="openai" />

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

export async function onRequestPost({ env, request }) {
  try {
    const { message, custom_prompt, history, aiName, index, model = "qwen-plus" } = await request.json();
    
    const modelConfig = Array.from(modelConfigs).find(config => config.model === model);

    if (!modelConfig) {
      throw new Error(`不支持的模型类型: ${model}`);
    }

    // 从环境变量中获取 API key
    const apiKey = env[modelConfig.apiKey];
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

    // 创建 OpenAI 客户端实例
    const openai = new OpenAI({
      apiKey: apiKey,
      baseURL: modelConfig.baseURL,
      defaultHeaders: (('headers' in modelConfig && modelConfig.headers) ? {
        [Object.keys(modelConfig.headers)[0]]: modelConfig.headers[Object.keys(modelConfig.headers)[0]].replace('{apiKey}', apiKey)
      } : undefined),
    });

    // 根据不同的模型配置不同的参数
    const requestConfig: RequestConfig = {
      model,
      messages,
      temperature: 0.7,
      max_tokens: 1000,
    };

    // 特殊模型的参数调整
    switch (model) {
      case "moonshot-v1-8k":
        requestConfig.temperature = 0.3;
        requestConfig.stream = false;
        break;
      case "glm-4-plus":
        requestConfig.do_sample = true;
        requestConfig.top_p = 0.7;
        requestConfig.stream = true;
        break;
      case "doubao-1.5-lite-32k":
        requestConfig.stream = true;
        break;
      default:
        requestConfig.stream = true;
    }

    // 发送请求
    if (requestConfig.stream) {
      const stream = await openai.chat.completions.create(requestConfig);

      // 创建 ReadableStream
      const readable = new ReadableStream({
        async start(controller) {
          try {
            for await (const chunk of stream as AsyncIterable<CompletionResponse>) {
              const content = chunk.choices?.[0]?.delta?.content || '';
              if (content) {
                // 去除可能的前导空格和标点
                const trimmedContent = content.replace(/^[\s,，。\.]+/, '');
                if (trimmedContent) {
                  controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ content: trimmedContent })}\n\n`));
                }
              }
            }
            controller.close();
          } catch (error) {
            console.error('Stream Error:', error);
            // 尝试从错误中提取更多信息
            const errorMessage = error instanceof Error ? error.message : String(error);
            controller.error(new Error(`Stream processing failed: ${errorMessage}`));
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
    } else {
      // 非流式响应
      const result = await openai.chat.completions.create(requestConfig);
      const content = result.choices?.[0]?.message?.content;
      
      if (!content) {
        throw new Error('API returned empty response');
      }

      return new Response(JSON.stringify({ content }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
  } catch (error) {
    console.error('API Error:', error);
    // 构建详细的错误响应
    const errorResponse = {
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      detail: String(error),
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    };

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { 
        'Content-Type': 'application/json',
        'X-Error-Type': error instanceof Error ? error.name : 'UnknownError'
      }
    });
  }
}