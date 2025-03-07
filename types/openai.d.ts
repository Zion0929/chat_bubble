declare module "openai" {
  interface OpenAIOptions {
    apiKey: string;
    baseURL?: string;
    defaultHeaders?: Record<string, string>;
  }

  interface Message {
    role: "system" | "user" | "assistant";
    content: string;
  }

  interface CompletionOptions {
    model: string;
    messages: Message[];
    temperature?: number;
    max_tokens?: number;
    stream?: boolean;
    do_sample?: boolean;
    top_p?: number;
  }

  interface CompletionChoice {
    index?: number;
    message?: { role: string; content: string };
    delta?: { content: string };
    finish_reason?: string;
  }

  interface CompletionResponse {
    id: string;
    object: string;
    created: number;
    model: string;
    choices: CompletionChoice[];
  }

  interface StreamResponse extends AsyncIterable<CompletionResponse> {
    choices: CompletionChoice[];
  }

  class OpenAI {
    constructor(options: OpenAIOptions);
    chat: {
      completions: {
        create(options: CompletionOptions): Promise<CompletionResponse | StreamResponse>;
      };
    };
  }

  export default OpenAI;
} 