import { LLMConfig, LLMConfigSchema, Message, ToolCall } from '../types';
import { withSpan } from '../observability/tracing';
import { logger } from '../utils/logger';

interface CompletionOptions {
  messages: Message[];
  stream?: boolean;
  tools?: LLMConfig['tools'];
}

interface CompletionResponse {
  id: string;
  content: string;
  finishReason: 'stop' | 'length' | 'tool_call';
  toolCalls?: ToolCall[];
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

interface StreamChunk {
  id: string;
  delta: string;
  finishReason?: 'stop' | 'length' | 'tool_call';
}

export class LLMClient {
  private readonly config: LLMConfig;
  private readonly baseUrl: string;
  private readonly headers: Record<string, string>;

  constructor(config: Partial<LLMConfig>) {
    this.config = LLMConfigSchema.parse(config);
    this.baseUrl = this.getBaseUrl();
    this.headers = this.getHeaders();
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

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Provider-specific headers would be set here
    // In production, API keys would be handled server-side

    return headers;
  }

  async complete(options: CompletionOptions): Promise<CompletionResponse> {
    return withSpan('llm.complete', async (span) => {
      const { messages, stream = false, tools } = options;

      const formattedMessages = this.formatMessages(messages);

      span?.setAttribute('llm.provider', this.config.provider);
      span?.setAttribute('llm.model', this.config.model ?? 'default');
      span?.setAttribute('llm.message_count', messages.length);
      span?.setAttribute('llm.stream', stream);

      logger.debug('LLM request', {
        provider: this.config.provider,
        model: this.config.model,
        messageCount: messages.length,
        hasTools: !!tools?.length,
      });

      const body = {
        model: this.config.model,
        messages: formattedMessages,
        temperature: this.config.temperature,
        max_tokens: this.config.maxTokens,
        stream,
        tools: tools?.map((t) => ({
          type: 'function',
          function: {
            name: t.name,
            description: t.description,
            parameters: t.parameters,
          },
        })),
      };

      // Note: This is a placeholder implementation
      // Actual HTTP calls would be made here
      return {
        id: `resp_${Date.now()}`,
        content: '',
        finishReason: 'stop',
        usage: {
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0,
        },
      };
    });
  }

  async *completeStream(options: CompletionOptions): AsyncGenerator<StreamChunk> {
    const response = await this.complete({ ...options, stream: true });

    yield {
      id: response.id,
      delta: response.content,
      finishReason: response.finishReason,
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
        ...(m.metadata?.toolCalls && {
          tool_calls: m.metadata.toolCalls.map((tc) => ({
            id: tc.id,
            type: 'function',
            function: {
              name: tc.name,
              arguments: JSON.stringify(tc.arguments),
            },
          })),
        }),
      })),
    ];
  }

  getConfig(): LLMConfig {
    return { ...this.config };
  }

  setSystemPrompt(prompt: string): void {
    (this.config as { systemPrompt: string }).systemPrompt = prompt;
  }
}
