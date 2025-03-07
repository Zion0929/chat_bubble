declare module "openai" {
  interface OpenAIOptions {
    apiKey: string;
    baseURL?: string;
    defaultHeaders?: Record<string, string>;
  }

  class OpenAI {
    constructor(options: OpenAIOptions);
    chat: {
      completions: {
        create(options: any): Promise<any>;
      };
    };
  }

  export default OpenAI;
} 