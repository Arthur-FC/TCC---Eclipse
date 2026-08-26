import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AiChatMessage,
  AiProvider,
  AiProviderChunk,
} from './ai-provider.interface';
import { AiProviderError } from './ai-provider.error';

interface GroqStreamPayload {
  choices?: Array<{ delta?: { content?: string | null } }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
  };
  x_groq?: {
    usage?: {
      prompt_tokens?: number;
      completion_tokens?: number;
    };
  };
}

@Injectable()
export class GroqProvider implements AiProvider {
  readonly name = 'groq';
  readonly model: string;
  private readonly apiKey: string;
  private readonly timeoutMs: number;
  private readonly maxCompletionTokens: number;

  constructor(configService: ConfigService) {
    this.apiKey = configService.get<string>('GROQ_API_KEY', '').trim();
    this.model = configService.get<string>(
      'GROQ_MODEL',
      'qwen/qwen3.6-27b',
    );
    this.timeoutMs = configService.get<number>('GROQ_TIMEOUT_MS', 45_000);
    this.maxCompletionTokens = configService.get<number>(
      'AI_MAX_COMPLETION_TOKENS',
      1_500,
    );
  }

  async *streamChat(
    messages: AiChatMessage[],
    signal: AbortSignal,
  ): AsyncIterable<AiProviderChunk> {
    if (!this.apiKey) {
      throw new AiProviderError(
        'A chave da Groq não foi configurada.',
        'not_configured',
      );
    }

    const requestController = new AbortController();
    const timeout = setTimeout(() => requestController.abort(), this.timeoutMs);
    const abortFromCaller = () => requestController.abort();
    signal.addEventListener('abort', abortFromCaller, { once: true });

    try {
      const response = await fetch(
        'https://api.groq.com/openai/v1/chat/completions',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: this.model,
            messages,
            stream: true,
            reasoning_effort: 'none',
            reasoning_format: 'hidden',
            temperature: 0.7,
            top_p: 0.8,
            max_completion_tokens: this.maxCompletionTokens,
            stream_options: { include_usage: true },
          }),
          signal: requestController.signal,
        },
      );

      if (!response.ok) {
        await this.throwResponseError(response);
      }
      if (!response.body) {
        throw new AiProviderError(
          'A Groq não devolveu um fluxo de resposta.',
          'invalid_response',
        );
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        buffer += decoder.decode(value, { stream: !done });
        const lines = buffer.split(/\r?\n/);
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          const data = line.startsWith('data:') ? line.slice(5).trim() : '';
          if (!data || data === '[DONE]') continue;

          let payload: GroqStreamPayload;
          try {
            payload = JSON.parse(data) as GroqStreamPayload;
          } catch {
            throw new AiProviderError(
              'A Groq devolveu um fragmento inválido.',
              'invalid_response',
            );
          }

          const content = payload.choices?.[0]?.delta?.content ?? undefined;
          const usagePayload = payload.usage ?? payload.x_groq?.usage;
          const usage = usagePayload
            ? {
                promptTokens: usagePayload.prompt_tokens,
                completionTokens: usagePayload.completion_tokens,
              }
            : undefined;
          if (content || usage) yield { content, usage };
        }

        if (done) break;
      }
    } catch (error) {
      if (error instanceof AiProviderError) throw error;
      if (requestController.signal.aborted) {
        throw new AiProviderError(
          signal.aborted
            ? 'A geração foi cancelada.'
            : 'A Groq demorou demais para responder.',
          'timeout',
        );
      }
      throw new AiProviderError(
        'Não foi possível conectar à Groq.',
        'unavailable',
      );
    } finally {
      clearTimeout(timeout);
      signal.removeEventListener('abort', abortFromCaller);
    }
  }

  private async throwResponseError(response: Response): Promise<never> {
    const retryAfterHeader = response.headers.get('retry-after');
    const retryAfterSeconds = retryAfterHeader
      ? Number.parseInt(retryAfterHeader, 10)
      : undefined;

    if (response.status === 429) {
      throw new AiProviderError(
        'O limite de uso da Groq foi atingido.',
        'rate_limited',
        Number.isFinite(retryAfterSeconds) ? retryAfterSeconds : undefined,
      );
    }
    if (response.status >= 500 || response.status === 498) {
      throw new AiProviderError(
        'A Groq está temporariamente indisponível.',
        'unavailable',
      );
    }
    throw new AiProviderError(
      `A Groq recusou a solicitação com status ${response.status}.`,
      'invalid_response',
    );
  }
}
