import { LLMConfig, LLMConfigSchema, Message } from '../types';
import { logger } from '../utils/logger';

interface CompletionOptions {
  messages: Message[];
  stream?: boolean;
}

interface CompletionResponse {
  content: string;
  finishReason: 'stop' | 'length' | 'tool_call';
  usage?: {
    promptTokens: number;
    completionTokens: number;
  };
}

export class LLMClient {
  private config: LLMConfig;
  private baseUrl: string;

  constructor(config: Partial<LLMConfig>) {
    this.config = LLMConfigSchema.parse(config);
    this.baseUrl = this.getBaseUrl();
  }

  private getBaseUrl(): string {
    switch (this.config.provider) {
      case 'openai':
        return 'https://api.openai.com/v1';
      case 'anthropic':
        return 'https://api.anthropic.com/v1';
      case 'jellyjelly':
      default:
        return 'https://api.jellyjelly.io/v1/llm';
    }
  }

  async complete(options: CompletionOptions): Promise<CompletionResponse> {
    const { messages, stream = false } = options;

    const formattedMessages = this.formatMessages(messages);

    logger.debug('LLM request', {
      provider: this.config.provider,
      model: this.config.model,
      messageCount: messages.length,
    });

    // Note: Actual API call implementation would go here
    // This is a placeholder that would be replaced with real HTTP calls

    return {
      content: '',
      finishReason: 'stop',
      usage: {
        promptTokens: 0,
        completionTokens: 0,
      },
    };
  }

  private formatMessages(messages: Message[]): unknown[] {
    const systemMessages: unknown[] = [];

    if (this.config.systemPrompt) {
      systemMessages.push({
        role: 'system',
        content: this.config.systemPrompt,
      });
    }

    return [
      ...systemMessages,
      ...messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    ];
  }

  getConfig(): LLMConfig {
    return { ...this.config };
  }
}
