/// <reference lib="es2018" />
/// <reference types="openai" />

// 添加 OpenAI 类型声明
declare module 'openai' {
  class OpenAI {
    constructor(config: { apiKey: string; baseURL?: string; defaultHeaders?: Record<string, string> });
    chat: {
      completions: {
        create(params: any): Promise<any>;
      };
    };
  }
  export default OpenAI;
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
    const messages = [
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
        try {
          const kimiRequest = {
            model: "moonshot-v1-8k",
            messages,
            temperature: 0.7,
            max_tokens: 1000,
            stream: true  // 修改为流式响应
          };

          const response = await fetch(modelConfig.baseURL, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify(kimiRequest)
          });

          if (!response.ok) {
            const errorText = await response.text();
            console.error('Kimi API Error:', {
              status: response.status,
              statusText: response.statusText,
              error: errorText,
              requestConfig: { ...kimiRequest, messages: '[已省略]' }
            });
            
            // 返回一个友好的错误消息，而不是抛出错误
            const readable = new ReadableStream({
              start(controller) {
                const content = "抱歉，我现在无法回应，请稍后再试。";
                controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ content })}\n\n`));
                controller.close();
              }
            });
            
            return new Response(readable, {
              headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive'
              }
            });
          }

          // 创建 ReadableStream 处理流式响应
          const readable = new ReadableStream({
            async start(controller) {
              try {
                const reader = response.body.getReader();
                let buffer = '';
                let hasContent = false;
                let isFirstChunk = true;

                while (true) {
                  const { done, value } = await reader.read();
                  if (done) {
                    if (buffer) {
                      try {
                        // 尝试解析最后的缓冲区
                        if (buffer.startsWith('data: ')) {
                          const jsonStr = buffer.slice(6);
                          try {
                            const jsonData = JSON.parse(jsonStr);
                            if (jsonData.choices?.[0]?.delta?.content) {
                              const content = jsonData.choices[0].delta.content;
                              controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ content })}\n\n`));
                              hasContent = true;
                            } else if (jsonData.choices?.[0]?.message?.content) {
                              const content = jsonData.choices[0].message.content;
                              controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ content })}\n\n`));
                              hasContent = true;
                            }
                          } catch (e) {
                            console.error('解析JSON字符串失败:', e);
                          }
                        } else {
                          try {
                            const jsonData = JSON.parse(buffer);
                            if (jsonData.choices?.[0]?.delta?.content) {
                              const content = jsonData.choices[0].delta.content;
                              controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ content })}\n\n`));
                              hasContent = true;
                            } else if (jsonData.choices?.[0]?.message?.content) {
                              const content = jsonData.choices[0].message.content;
                              controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ content })}\n\n`));
                              hasContent = true;
                            }
                          } catch (e) {
                            console.error('解析最终缓冲区失败:', e);
                          }
                        }
                      } catch (e) {
                        console.error('解析最终缓冲区失败:', e);
                      }
                    }
                    
                    // 如果没有收到任何内容，发送一个友好的消息
                    if (!hasContent) {
                      const content = "抱歉，我现在无法回应，请稍后再试。";
                      controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ content })}\n\n`));
                    }
                    
                    controller.close();
                    break;
                  }

                  const chunk = new TextDecoder().decode(value);
                  buffer += chunk;
                  
                  // 处理可能的多行数据
                  const lines = buffer.split('\n');
                  buffer = '';
                  
                  for (let i = 0; i < lines.length; i++) {
                    const line = lines[i].trim();
                    if (!line) continue;
                    
                    if (line.startsWith('data: ')) {
                      try {
                        const jsonStr = line.slice(6);
                        if (jsonStr === '[DONE]') continue;
                        
                        try {
                          const jsonData = JSON.parse(jsonStr);
                          if (jsonData.choices?.[0]?.delta?.content) {
                            let content = jsonData.choices[0].delta.content;
                            // 如果是第一个内容块，移除开头的标点符号
                            if (isFirstChunk && content) {
                              content = content.replace(/^[\s,，。\.、:：;；!！?？]+/, '');
                              isFirstChunk = false;
                            }
                            if (content) {
                              controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ content })}\n\n`));
                              hasContent = true;
                            }
                          } else if (jsonData.choices?.[0]?.message?.content) {
                            let content = jsonData.choices[0].message.content;
                            // 如果是第一个内容块，移除开头的标点符号
                            if (isFirstChunk && content) {
                              content = content.replace(/^[\s,，。\.、:：;；!！?？]+/, '');
                              isFirstChunk = false;
                            }
                            if (content) {
                              controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ content })}\n\n`));
                              hasContent = true;
                            }
                          }
                        } catch (e) {
                          console.error('解析JSON字符串失败:', e);
                          // 如果是最后一行，保存到buffer中
                          if (i === lines.length - 1) {
                            buffer = line;
                          }
                        }
                      } catch (e) {
                        console.error('处理数据行失败:', e);
                        // 如果是最后一行，保存到buffer中
                        if (i === lines.length - 1) {
                          buffer = line;
                        }
                      }
                    } else {
                      // 如果是最后一行，保存到buffer中
                      if (i === lines.length - 1) {
                        buffer = line;
                      }
                    }
                  }
                }
              } catch (error) {
                console.error('Kimi流式响应处理失败:', error);
                const content = "抱歉，我现在无法回应，请稍后再试。";
                controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ content })}\n\n`));
                controller.close();
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
          console.error('Kimi API Error:', error);
          
          // 返回一个友好的错误消息，而不是抛出错误
          const readable = new ReadableStream({
            start(controller) {
              const content = "抱歉，我现在无法回应，请稍后再试。";
              controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ content })}\n\n`));
              controller.close();
            }
          });
          
          return new Response(readable, {
            headers: {
              'Content-Type': 'text/event-stream',
              'Cache-Control': 'no-cache',
              'Connection': 'keep-alive'
            }
          });
        }
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
          const response = await fetch(modelConfig.baseURL, {
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
            
            // 返回一个友好的错误消息，而不是抛出错误
            const readable = new ReadableStream({
              start(controller) {
                const content = "抱歉，我现在无法回应，请稍后再试。";
                controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ content })}\n\n`));
                controller.close();
              }
            });
            
            return new Response(readable, {
              headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive'
              }
            });
          }

          // 创建 ReadableStream 处理流式响应
          const readable = new ReadableStream({
            async start(controller) {
              try {
                const reader = response.body.getReader();
                let buffer = '';
                let hasContent = false;
                let fullContent = '';
                let isFirstChunk = true;

                while (true) {
                  const { done, value } = await reader.read();
                  if (done) {
                    if (buffer) {
                      const content = parseSSEResponse(new TextEncoder().encode(buffer));
                      if (content) {
                        // 移除开头的逗号和空白
                        const cleanContent = content.replace(/^[\s,，。\.]+/, '');
                        if (cleanContent) {
                          controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ content: cleanContent })}\n\n`));
                          hasContent = true;
                          fullContent += cleanContent;
                        }
                      }
                    }
                    
                    // 如果没有收到任何内容，发送一个友好的消息
                    if (!hasContent) {
                      const content = "抱歉，我现在无法回应，请稍后再试。";
                      controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ content })}\n\n`));
                    }
                    
                    controller.close();
                    break;
                  }

                  const chunk = new TextDecoder().decode(value);
                  buffer += chunk;
                  
                  // 尝试按行分割处理
                  const lines = buffer.split('\n\n');
                  buffer = lines.pop() || '';

                  for (const line of lines) {
                    if (line.trim()) {
                      const content = parseSSEResponse(new TextEncoder().encode(line));
                      if (content) {
                        // 移除开头的逗号和空白
                        const cleanContent = content.replace(/^[\s,，。\.]+/, '');
                        if (cleanContent) {
                          // 如果是第一个内容块，确保不以标点符号开头
                          const finalContent = isFirstChunk ? cleanContent.replace(/^[\s,，。\.、:：;；!！?？]+/, '') : cleanContent;
                          
                          if (finalContent) {
                            controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ content: finalContent })}\n\n`));
                            hasContent = true;
                            fullContent += finalContent;
                            isFirstChunk = false;
                          }
                        }
                      }
                    }
                  }
                }
              } catch (error) {
                console.error('智谱流式响应处理失败:', error);
                const content = "抱歉，我现在无法回应，请稍后再试。";
                controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ content })}\n\n`));
                controller.close();
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
          
          // 返回一个友好的错误消息，而不是抛出错误
          const readable = new ReadableStream({
            start(controller) {
              const content = "抱歉，我现在无法回应，请稍后再试。";
              controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ content })}\n\n`));
              controller.close();
            }
          });
          
          return new Response(readable, {
            headers: {
              'Content-Type': 'text/event-stream',
              'Cache-Control': 'no-cache',
              'Connection': 'keep-alive'
            }
          });
        }
      }

      case "doubao-1.5-lite-32k": {
        try {
          const doubaoRequest = {
            model: "doubao-1.5-lite-32k",
            messages,
            temperature: 0.7,
            max_tokens: 1000,
            stream: true  // 修改为流式响应
          };

          // 修复豆包API的baseURL和请求头
          const response = await fetch(modelConfig.baseURL, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apiKey}`,
              'X-API-Key': apiKey
            },
            body: JSON.stringify(doubaoRequest)
          });

          if (!response.ok) {
            const errorText = await response.text();
            console.error('豆包 API Error:', {
              status: response.status,
              statusText: response.statusText,
              error: errorText,
              requestConfig: { ...doubaoRequest, messages: '[已省略]' }
            });
            
            // 返回一个友好的错误消息，而不是抛出错误
            const readable = new ReadableStream({
              start(controller) {
                const content = "抱歉，我现在无法回应，请稍后再试。";
                controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ content })}\n\n`));
                controller.close();
              }
            });
            
            return new Response(readable, {
              headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive'
              }
            });
          }

          // 创建 ReadableStream 处理流式响应
          const readable = new ReadableStream({
            async start(controller) {
              try {
                const reader = response.body.getReader();
                let buffer = '';
                let hasContent = false;

                while (true) {
                  const { done, value } = await reader.read();
                  if (done) {
                    if (buffer) {
                      try {
                        const jsonData = JSON.parse(buffer);
                        if (jsonData.choices?.[0]?.message?.content) {
                          controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ content: jsonData.choices[0].message.content })}\n\n`));
                          hasContent = true;
                        }
                      } catch (e) {
                        console.error('解析最终缓冲区失败:', e);
                      }
                    }
                    
                    // 如果没有收到任何内容，发送一个友好的消息
                    if (!hasContent) {
                      const content = "抱歉，我现在无法回应，请稍后再试。";
                      controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ content })}\n\n`));
                    }
                    
                    controller.close();
                    break;
                  }

                  const chunk = new TextDecoder().decode(value);
                  buffer += chunk;
                  
                  // 尝试解析完整的JSON对象
                  try {
                    const jsonData = JSON.parse(buffer);
                    if (jsonData.choices?.[0]?.delta?.content) {
                      const content = jsonData.choices[0].delta.content;
                      controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ content })}\n\n`));
                      buffer = '';
                      hasContent = true;
                    } else if (jsonData.choices?.[0]?.message?.content) {
                      const content = jsonData.choices[0].message.content;
                      controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ content })}\n\n`));
                      buffer = '';
                      hasContent = true;
                    }
                  } catch (e) {
                    // 不完整的JSON，继续累积
                  }
                }
              } catch (error) {
                console.error('豆包流式响应处理失败:', error);
                const content = "抱歉，我现在无法回应，请稍后再试。";
                controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ content })}\n\n`));
                controller.close();
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
          console.error('豆包 API Error:', error);
          
          // 返回一个友好的错误消息，而不是抛出错误
          const readable = new ReadableStream({
            start(controller) {
              const content = "抱歉，我现在无法回应，请稍后再试。";
              controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ content })}\n\n`));
              controller.close();
            }
          });
          
          return new Response(readable, {
            headers: {
              'Content-Type': 'text/event-stream',
              'Cache-Control': 'no-cache',
              'Connection': 'keep-alive'
            }
          });
        }
      }

      default: {
        // 其他模型使用 OpenAI 客户端
        try {
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
                let hasContent = false;
                
                for await (const chunk of stream as AsyncIterable<CompletionResponse>) {
                  const content = chunk.choices?.[0]?.delta?.content || '';
                  if (content) {
                    const trimmedContent = content.replace(/^[\s,，。\.]+/, '');
                    if (trimmedContent) {
                      controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ content: trimmedContent })}\n\n`));
                      hasContent = true;
                    }
                  }
                }
                
                // 如果没有收到任何内容，发送一个友好的消息
                if (!hasContent) {
                  const content = "抱歉，我现在无法回应，请稍后再试。";
                  controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ content })}\n\n`));
                }
                
                controller.close();
              } catch (error) {
                console.error('Stream Error:', error);
                const content = "抱歉，我现在无法回应，请稍后再试。";
                controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ content })}\n\n`));
                controller.close();
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
        } catch (error) {
          console.error('OpenAI API Error:', error);
          
          // 返回一个友好的错误消息，而不是抛出错误
          const readable = new ReadableStream({
            start(controller) {
              const content = "抱歉，我现在无法回应，请稍后再试。";
              controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ content })}\n\n`));
              controller.close();
            }
          });
          
          return new Response(readable, {
            headers: {
              'Content-Type': 'text/event-stream',
              'Cache-Control': 'no-cache',
              'Connection': 'keep-alive'
            }
          });
        }
      }
    }
  } catch (error) {
    console.error('API Error:', error);
    
    // 返回一个友好的错误消息，而不是错误详情
    const errorResponse = {
      content: "抱歉，我现在无法回应，请稍后再试。"
    };

    return new Response(JSON.stringify(errorResponse), {
      status: 200, // 返回200而不是500，避免前端显示错误
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });
  }
}