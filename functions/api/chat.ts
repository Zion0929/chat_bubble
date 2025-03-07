import OpenAI from 'openai';
import { modelConfigs } from '../../src/config/aiCharacters';

export async function onRequestPost({ env, request }) {
  try {
    const { message, custom_prompt, history, aiName, index, model = "qwen-plus" } = await request.json();
    
    const modelConfig = modelConfigs.find(config => config.model === model);

    if (!modelConfig) {
      throw new Error('不支持的模型类型');
    }

    // 从环境变量中获取 API key
    const apiKey = env[modelConfig.apiKey];
    if (!apiKey) {
      throw new Error(`${model} 的API密钥未配置`);
    }

    // 根据性格设置不同的系统提示语
    let systemPrompt = "";
    systemPrompt = custom_prompt + "\n 注意重要：1、你在群里叫" + aiName + "，你的回复中不要添加任何前缀，直接输出内容；2、如果用户提出玩游戏，比如成语接龙等，严格按照游戏规则，不要说一大堆，要简短精炼; 3、不要重复别人的话！4、不要在回复前添加自己的名字或其他人的名字作为前缀！"

    // 构建完整的消息历史
    const baseMessages = [
      { role: "system", content: systemPrompt },
      ...history.slice(-10), // 添加历史消息
    ];
    
    // 根据 index 插入新消息
    const userMessage = { role: "user", content: message };
    if (index === 0) {
      baseMessages.push(userMessage);
    } else {
      baseMessages.splice(baseMessages.length - index, 0, userMessage);
    }
    const messages = baseMessages;

    // 根据不同的模型使用不同的 API 调用方式
    if (model === "doubao-1.5-lite-32k") {
      // 方舟 API - 使用 OpenAI 兼容接口
      const openai = new OpenAI({
        apiKey: apiKey,
        baseURL: modelConfig.baseURL
      });

      const stream = await openai.chat.completions.create({
        model: model,
        messages: messages,
        stream: true
      });

      // 创建 ReadableStream
      const readable = new ReadableStream({
        async start(controller) {
          try {
            for await (const chunk of stream) {
              const content = chunk.choices[0]?.delta?.content || '';
              if (content) {
                controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ content })}\n\n`));
              }
            }
            controller.close();
          } catch (error) {
            controller.error(error);
            console.error(error);
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
    } else if (model === "glm-4-plus") {
      // 智谱 API - 使用 OpenAI 兼容接口
      const openai = new OpenAI({
        apiKey: apiKey,
        baseURL: modelConfig.baseURL
      });

      const stream = await openai.chat.completions.create({
        model: model,
        messages: messages,
        stream: true
      });

      // 创建 ReadableStream
      const readable = new ReadableStream({
        async start(controller) {
          try {
            for await (const chunk of stream) {
              const content = chunk.choices[0]?.delta?.content || '';
              if (content) {
                controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ content })}\n\n`));
              }
            }
            controller.close();
          } catch (error) {
            controller.error(error);
            console.error(error);
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
    } else if (model === "moonshot-v1-8k") {
      // Moonshot API - 使用 OpenAI 兼容接口
      const openai = new OpenAI({
        apiKey: apiKey,
        baseURL: modelConfig.baseURL
      });

      const stream = await openai.chat.completions.create({
        model: model,
        messages: messages,
        stream: true,
        temperature: 0.3
      });

      // 创建 ReadableStream
      const readable = new ReadableStream({
        async start(controller) {
          try {
            for await (const chunk of stream) {
              const content = chunk.choices[0]?.delta?.content || '';
              if (content) {
                controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ content })}\n\n`));
              }
            }
            controller.close();
          } catch (error) {
            controller.error(error);
            console.error(error);
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
      // 使用 OpenAI 兼容接口
      const openai = new OpenAI({
        apiKey: apiKey,
        baseURL: modelConfig.baseURL
      });

      const stream = await openai.chat.completions.create({
        model: model,
        messages: messages,
        stream: true,
      });

      // 创建 ReadableStream
      const readable = new ReadableStream({
        async start(controller) {
          try {
            for await (const chunk of stream) {
              const content = chunk.choices[0]?.delta?.content || '';
              if (content) {
                controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ content })}\n\n`));
              }
            }
            controller.close();
          } catch (error) {
            controller.error(error);
            console.error(error);
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

  } catch (error) {
    console.error(error);
    return Response.json(
      { error: error.message },
      { status: 500 }
    );
  }
} 