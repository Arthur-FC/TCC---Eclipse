import { Injectable, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AiChatMessage,
  AiJsonGenerationOptions,
  AiProvider,
  AiProviderChunk,
  AiProviderResponse,
  AiToolCall,
  AiToolDefinition,
} from './ai-provider.interface';
import { AiProviderError } from './ai-provider.error';
import { DataSource } from 'typeorm';

interface GroqStreamPayload {
  choices?: Array<{
    delta?: {
      content?: string | null;
      tool_calls?: Array<{
        index: number;
        id?: string;
        function?: { name?: string; arguments?: string };
      }>;
    };
  }>;
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

interface GroqCompletionPayload {
  choices?: Array<{ message?: { content?: string | null } }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
  };
}

@Injectable()
export class GroqProvider implements AiProvider {
  readonly name = 'groq';
  readonly model: string;
  private readonly apiKey: string;
  private readonly timeoutMs: number;
  private readonly maxCompletionTokens: number;
  private readonly dailyRequestLimit: number;
  private readonly dailyReservedTokenLimit: number;

  constructor(configService: ConfigService, @Optional() private readonly dataSource?: DataSource) {
    this.apiKey = configService.get<string>('GROQ_API_KEY', '').trim();
    this.model = configService.get<string>(
      'GROQ_MODEL',
      'qwen/qwen3.6-27b',
    );
    this.timeoutMs = configService.get<number>('GROQ_TIMEOUT_MS', 45_000);
    this.maxCompletionTokens = configService.get<number>(
      'AI_MAX_COMPLETION_TOKENS',
      600,
    );
    this.dailyRequestLimit = configService.get<number>('GROQ_DAILY_REQUEST_LIMIT', 500);
    this.dailyReservedTokenLimit = configService.get<number>('GROQ_DAILY_RESERVED_COMPLETION_TOKENS', 100_000);
  }

  async *streamChat(
    messages: AiChatMessage[],
    signal: AbortSignal,
    tools?: AiToolDefinition[],
  ): AsyncIterable<AiProviderChunk> {
    if (!this.apiKey) {
      throw new AiProviderError(
        'A chave da Groq não foi configurada.',
        'not_configured',
      );
    }
    await this.reserveDailyBudget(this.maxCompletionTokens);

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
            messages: this.serializeMessages(messages),
            stream: true,
            reasoning_effort: 'none',
            reasoning_format: 'hidden',
            temperature: 0.7,
            top_p: 0.8,
            max_completion_tokens: this.maxCompletionTokens,
            stream_options: { include_usage: true },
            ...(tools?.length
              ? { tools, tool_choice: 'auto', disable_tool_validation: false }
              : {}),
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
      const pendingToolCalls = new Map<number, AiToolCall>();

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
          for (const toolCall of payload.choices?.[0]?.delta?.tool_calls ?? []) {
            const current = pendingToolCalls.get(toolCall.index) ?? {
              id: '',
              name: '',
              arguments: '',
            };
            current.id += toolCall.id ?? '';
            current.name += toolCall.function?.name ?? '';
            current.arguments += toolCall.function?.arguments ?? '';
            pendingToolCalls.set(toolCall.index, current);
          }
          const usagePayload = payload.usage ?? payload.x_groq?.usage;
          const usage = usagePayload
            ? {
                promptTokens: usagePayload.prompt_tokens,
                completionTokens: usagePayload.completion_tokens,
              }
            : undefined;
          if (usage) await this.recordUsage(usage.promptTokens, usage.completionTokens);
          if (content || usage) yield { content, usage };
        }

        if (done) break;
      }
      if (pendingToolCalls.size > 0) {
        yield {
          toolCalls: [...pendingToolCalls.entries()]
            .sort(([left], [right]) => left - right)
            .map(([, toolCall]) => toolCall),
        };
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

  async generateJson(
    messages: AiChatMessage[],
    signal: AbortSignal,
    options?: AiJsonGenerationOptions,
  ): Promise<AiProviderResponse> {
    if (!this.apiKey) {
      throw new AiProviderError(
        'A chave da Groq não foi configurada.',
        'not_configured',
      );
    }
    const reservedTokens = Math.min(
      this.maxCompletionTokens,
      options?.maxCompletionTokens ?? this.maxCompletionTokens,
    );
    await this.reserveDailyBudget(reservedTokens);

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
            messages: this.serializeMessages(messages),
            stream: false,
            response_format: { type: 'json_object' },
            reasoning_effort: 'none',
            reasoning_format: 'hidden',
            temperature: 0.2,
            top_p: 0.8,
            max_completion_tokens: Math.min(
              this.maxCompletionTokens,
              options?.maxCompletionTokens ?? this.maxCompletionTokens,
            ),
          }),
          signal: requestController.signal,
        },
      );

      if (!response.ok) {
        await this.throwResponseError(response);
      }
      const payload = (await response.json()) as GroqCompletionPayload;
      const content = payload.choices?.[0]?.message?.content?.trim();
      if (!content) {
        throw new AiProviderError(
          'A Groq não devolveu um objeto JSON.',
          'invalid_response',
        );
      }
      if (payload.usage) {
        await this.recordUsage(payload.usage.prompt_tokens, payload.usage.completion_tokens);
      }
      return {
        content,
        usage: payload.usage
          ? {
              promptTokens: payload.usage.prompt_tokens,
              completionTokens: payload.usage.completion_tokens,
            }
          : undefined,
      };
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

  private async reserveDailyBudget(tokens: number): Promise<void> {
    if (!this.dataSource) return;
    const result = await this.dataSource.query<Array<{ request_count: number }>>(`
      INSERT INTO groq_usage_daily (usage_date, request_count, reserved_completion_tokens)
      SELECT CURRENT_DATE, 1, $2::integer WHERE $2::integer <= $3::integer
      ON CONFLICT (usage_date) DO UPDATE
      SET request_count = groq_usage_daily.request_count + 1,
          reserved_completion_tokens = groq_usage_daily.reserved_completion_tokens + $2::integer
      WHERE groq_usage_daily.request_count < $1::integer
        AND groq_usage_daily.reserved_completion_tokens + $2::integer <= $3::integer
      RETURNING request_count
    `, [this.dailyRequestLimit, tokens, this.dailyReservedTokenLimit]);
    const rows = Array.isArray(result[0]) ? result[0] : result;
    if (rows.length === 0) {
      const now = new Date();
      const nextDay = new Date(now);
      nextDay.setHours(24, 0, 0, 0);
      throw new AiProviderError(
        'O orçamento diário local da Groq foi atingido.',
        'rate_limited',
        Math.max(1, Math.ceil((nextDay.getTime() - now.getTime()) / 1_000)),
      );
    }
  }

  private async recordUsage(promptTokens?: number, completionTokens?: number): Promise<void> {
    if (!this.dataSource || (!promptTokens && !completionTokens)) return;
    await this.dataSource.query(`
      UPDATE groq_usage_daily
      SET prompt_tokens = prompt_tokens + $1,
          completion_tokens = completion_tokens + $2
      WHERE usage_date = CURRENT_DATE
    `, [promptTokens ?? 0, completionTokens ?? 0]);
  }

  private async throwResponseError(response: Response): Promise<never> {
    const retryAfterHeader = response.headers.get('retry-after');
    const retryAfterSeconds = retryAfterHeader
      ? Number.parseInt(retryAfterHeader, 10)
      : undefined;
    const payload = (await response.json().catch(() => null)) as {
      error?: { message?: string };
    } | null;
    const rateLimitMessage = payload?.error?.message ?? '';
    const rateLimitType = rateLimitMessage.match(
      /\b(RPM|RPD|TPM|TPD|ITPM|OTPM)\b/i,
    );
    const rateLimitValue = rateLimitMessage.match(/\bLimit\s+([\d,]+)/i);
    const requestedValue = rateLimitMessage.match(/\bRequested\s+([\d,]+)/i);
    const rateLimit = rateLimitType
      ? {
          type: rateLimitType[1].toUpperCase() as
            | 'RPM'
            | 'RPD'
            | 'TPM'
            | 'TPD'
            | 'ITPM'
            | 'OTPM',
          limit: rateLimitValue
            ? Number(rateLimitValue[1].replaceAll(',', ''))
            : undefined,
          requested: requestedValue
            ? Number(requestedValue[1].replaceAll(',', ''))
            : undefined,
        }
      : undefined;

    if (response.status === 429) {
      throw new AiProviderError(
        'O limite de uso da Groq foi atingido.',
        'rate_limited',
        Number.isFinite(retryAfterSeconds) ? retryAfterSeconds : undefined,
        rateLimit,
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

  private serializeMessages(messages: AiChatMessage[]): unknown[] {
    return messages.map((message) => ({
      role: message.role,
      content: message.content,
      ...(message.toolCalls
        ? {
            tool_calls: message.toolCalls.map((toolCall) => ({
              id: toolCall.id,
              type: 'function',
              function: {
                name: toolCall.name,
                arguments: toolCall.arguments,
              },
            })),
          }
        : {}),
      ...(message.toolCallId ? { tool_call_id: message.toolCallId } : {}),
      ...(message.name ? { name: message.name } : {}),
    }));
  }
}
