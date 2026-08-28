import { ConfigService } from '@nestjs/config';
import { GroqProvider } from './groq.provider';

function config(apiKey: string): ConfigService {
  const values: Record<string, string | number> = {
    GROQ_API_KEY: apiKey,
    GROQ_MODEL: 'qwen/qwen3.6-27b',
    GROQ_TIMEOUT_MS: 45_000,
    AI_MAX_COMPLETION_TOKENS: 1_500,
  };
  return {
    get: jest.fn((key: string, fallback: unknown) => values[key] ?? fallback),
  } as unknown as ConfigService;
}

describe('GroqProvider', () => {
  afterEach(() => jest.restoreAllMocks());

  it('fails safely when the API key is missing', async () => {
    const provider = new GroqProvider(config(''));
    const iterator = provider.streamChat(
      [{ role: 'user', content: 'Olá' }],
      new AbortController().signal,
    )[Symbol.asyncIterator]();

    await expect(iterator.next()).rejects.toMatchObject({
      code: 'not_configured',
    });
  });

  it('parses content and token usage from the Groq SSE stream', async () => {
    const stream = [
      'data: {"choices":[{"delta":{"content":"Olá "}}]}',
      '',
      'data: {"choices":[{"delta":{"content":"artista!"}}]}',
      '',
      'data: {"choices":[],"usage":{"prompt_tokens":7,"completion_tokens":3}}',
      '',
      'data: [DONE]',
      '',
    ].join('\n');
    jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(stream, {
        status: 200,
        headers: { 'Content-Type': 'text/event-stream' },
      }),
    );
    const provider = new GroqProvider(config('gsk_test_key_for_unit_tests'));
    const chunks = [];

    for await (const chunk of provider.streamChat(
      [{ role: 'user', content: 'Olá' }],
      new AbortController().signal,
    )) {
      chunks.push(chunk);
    }

    expect(chunks).toEqual([
      { content: 'Olá ', usage: undefined },
      { content: 'artista!', usage: undefined },
      {
        content: undefined,
        usage: { promptTokens: 7, completionTokens: 3 },
      },
    ]);
    expect(fetch).toHaveBeenCalledWith(
      'https://api.groq.com/openai/v1/chat/completions',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('maps a rate limit response and preserves retry-after', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response('{"error":{"message":"rate limit"}}', {
        status: 429,
        headers: { 'retry-after': '4' },
      }),
    );
    const provider = new GroqProvider(config('gsk_test_key_for_unit_tests'));
    const iterator = provider.streamChat(
      [{ role: 'user', content: 'Olá' }],
      new AbortController().signal,
    )[Symbol.asyncIterator]();

    await expect(iterator.next()).rejects.toMatchObject({
      code: 'rate_limited',
      retryAfterSeconds: 4,
    });
  });

  it('requests and parses a JSON object without streaming', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [{ message: { content: '{"theme":"Lua"}' } }],
          usage: { prompt_tokens: 11, completion_tokens: 4 },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );
    const provider = new GroqProvider(config('gsk_test_key_for_unit_tests'));

    const result = await provider.generateJson(
      [{ role: 'user', content: 'Gere JSON.' }],
      new AbortController().signal,
    );

    expect(result).toEqual({
      content: '{"theme":"Lua"}',
      usage: { promptTokens: 11, completionTokens: 4 },
    });
    const request = (fetch as jest.Mock).mock.calls[0][1] as RequestInit;
    expect(JSON.parse(request.body as string)).toMatchObject({
      stream: false,
      response_format: { type: 'json_object' },
      reasoning_format: 'hidden',
    });
  });

  it('assembles streamed tool calls and sends tool schemas', async () => {
    const stream = [
      'data: {"choices":[{"delta":{"tool_calls":[{"index":0,"id":"call_1","function":{"name":"search_project_","arguments":"{\\"query\\":\\"pi"}}]}}]}',
      '',
      'data: {"choices":[{"delta":{"tool_calls":[{"index":0,"function":{"name":"messages","arguments":"ano\\"}"}}]}}]}',
      '',
      'data: [DONE]',
      '',
    ].join('\n');
    jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(stream, {
        status: 200,
        headers: { 'Content-Type': 'text/event-stream' },
      }),
    );
    const provider = new GroqProvider(config('gsk_test_key_for_unit_tests'));
    const chunks = [];

    for await (const chunk of provider.streamChat(
      [{ role: 'user', content: 'O que eu disse sobre piano?' }],
      new AbortController().signal,
      [
        {
          type: 'function',
          function: {
            name: 'search_project_messages',
            description: 'Pesquisa mensagens.',
            parameters: { type: 'object' },
          },
        },
      ],
    )) {
      chunks.push(chunk);
    }

    expect(chunks).toEqual([
      {
        toolCalls: [
          {
            id: 'call_1',
            name: 'search_project_messages',
            arguments: '{"query":"piano"}',
          },
        ],
      },
    ]);
    const request = (fetch as jest.Mock).mock.calls[0][1] as RequestInit;
    expect(JSON.parse(request.body as string)).toMatchObject({
      tool_choice: 'auto',
      disable_tool_validation: false,
      tools: [
        { function: { name: 'search_project_messages' } },
      ],
    });
  });
});
