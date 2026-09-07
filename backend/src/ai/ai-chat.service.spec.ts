import { ConfigService } from '@nestjs/config';
import { MessageEntity } from '../projects/message.entity';
import { MessageRole } from '../projects/message-role.enum';
import { ProjectsService } from '../projects/projects.service';
import { AiChatService } from './ai-chat.service';
import { AiProvider } from './ai-provider.interface';
import { AiProviderError } from './ai-provider.error';
import { AiToolsService } from '../ai-tools/ai-tools.service';
import { ProjectMemoryService } from './project-memory.service';

function message(
  role: MessageRole,
  content: string,
  id = crypto.randomUUID(),
): MessageEntity {
  return {
    id,
    conversationId: 'conversation-id',
    role,
    content,
    aiProvider: null,
    aiModel: null,
    promptTokens: null,
    completionTokens: null,
    aiLatencyMs: null,
    createdAt: new Date(),
  } as MessageEntity;
}

describe('AiChatService', () => {
  const userMessage = message(MessageRole.USER, 'Quero uma trilha melancólica.');
  const assistantMessage = message(
    MessageRole.ASSISTANT,
    'Podemos começar com piano e cordas suaves.',
  );

  function createService(provider: AiProvider, maxToolCalls = 20, contextMaxChars = 24_000) {
    const projectsService = {
      createMessage: jest.fn().mockResolvedValue(userMessage),
      getConversationContext: jest.fn().mockResolvedValue([userMessage]),
      createAssistantMessage: jest.fn().mockResolvedValue(assistantMessage),
    } as unknown as jest.Mocked<ProjectsService>;
    const configService = {
      get: jest.fn((key: string) => ({
        AI_MAX_TOOL_CALLS: maxToolCalls,
        AI_CONTEXT_MESSAGES: 20,
        AI_RECENT_CONTEXT_MAX_CHARS: contextMaxChars,
      } as Record<string, number>)[key]),
    } as unknown as ConfigService;
    const aiToolsService = {
      getDefinitions: jest.fn().mockReturnValue([
        {
          type: 'function',
          function: {
            name: 'search_project_messages',
            description: 'Pesquisa mensagens.',
            parameters: { type: 'object' },
          },
        },
      ]),
      execute: jest.fn().mockResolvedValue(
        JSON.stringify({ ok: true, data: [{ excerpt: 'piano' }] }),
      ),
    } as unknown as jest.Mocked<AiToolsService>;
    const projectMemory = {
      build: jest.fn().mockResolvedValue({
        content: '[FONTE: DADO_DO_PROJETO] PROJETO ATUAL\nTítulo: Projeto',
        characterCount: 58,
        sources: { briefing: false, moodboard: false, approvedReferences: 0, libraryMatches: 0 },
      }),
    } as unknown as jest.Mocked<ProjectMemoryService>;
    return {
      service: new AiChatService(
        projectsService,
        aiToolsService,
        projectMemory,
        configService,
        provider,
      ),
      projectsService,
      aiToolsService,
      projectMemory,
    };
  }

  it('streams deltas and persists the final assistant message with metadata', async () => {
    const receivedMessages: unknown[] = [];
    const provider: AiProvider = {
      name: 'fake',
      model: 'fake/model',
      async *streamChat(messages) {
        receivedMessages.push(messages);
        yield { content: 'Podemos começar ' };
        yield {
          content: 'com piano e cordas suaves.',
          usage: { promptTokens: 12, completionTokens: 8 },
        };
      },
    };
    const { service, projectsService } = createService(provider);
    const events = [];

    for await (const event of service.streamReply(
      'owner-id',
      'project-id',
      'conversation-id',
      { content: userMessage.content, retry: false },
      new AbortController().signal,
    )) {
      events.push(event);
    }

    expect(events.map((event) => event.type)).toEqual([
      'user_message',
      'delta',
      'delta',
      'done',
    ]);
    expect(receivedMessages[0]).toEqual(expect.arrayContaining([
      expect.objectContaining({ role: 'system', content: expect.stringContaining('PROJETO ATUAL') }),
    ]));
    expect(projectsService.createAssistantMessage).toHaveBeenCalledWith(
      'owner-id',
      'project-id',
      'conversation-id',
      'Podemos começar com piano e cordas suaves.',
      expect.objectContaining({
        provider: 'fake',
        model: 'fake/model',
        promptTokens: 12,
        completionTokens: 8,
      }),
    );
  });

  it('keeps the latest message and limits older recent history by character budget', async () => {
    const latest = message(MessageRole.USER, 'pergunta atual');
    const old = message(MessageRole.ASSISTANT, 'resposta anterior extensa');
    const received: any[] = [];
    const provider: AiProvider = {
      name: 'fake', model: 'fake/model',
      async *streamChat(messages) { received.push(messages); yield { content: 'Resposta.' }; },
    };
    const { service, projectsService, projectMemory } = createService(provider, 4, 15);
    projectsService.getConversationContext.mockResolvedValueOnce([old, latest]);
    for await (const _event of service.streamReply('owner-id', 'project-id', 'conversation-id', { retry: true }, new AbortController().signal)) { /* consume */ }

    expect(projectMemory.build).toHaveBeenCalledWith('owner-id', 'project-id', 'pergunta atual');
    expect(received[0]).toEqual(expect.arrayContaining([
      expect.objectContaining({ role: 'user', content: 'pergunta atual' }),
    ]));
    expect(received[0]).not.toEqual(expect.arrayContaining([
      expect.objectContaining({ content: 'resposta anterior extensa' }),
    ]));
  });

  it('keeps the user message when the provider fails', async () => {
    const provider: AiProvider = {
      name: 'fake',
      model: 'fake/model',
      async *streamChat() {
        throw new AiProviderError('quota', 'rate_limited', 3);
      },
    };
    const { service, projectsService } = createService(provider);
    const iterator = service.streamReply(
      'owner-id',
      'project-id',
      'conversation-id',
      { content: userMessage.content, retry: false },
      new AbortController().signal,
    )[Symbol.asyncIterator]();

    await expect(iterator.next()).resolves.toMatchObject({
      value: { type: 'user_message' },
    });
    await expect(iterator.next()).rejects.toMatchObject({
      code: 'rate_limited',
    });
    expect(projectsService.createMessage).toHaveBeenCalled();
    expect(projectsService.createAssistantMessage).not.toHaveBeenCalled();
  });

  it('retries only when the latest persisted message belongs to the user', async () => {
    const provider: AiProvider = {
      name: 'fake',
      model: 'fake/model',
      async *streamChat() {
        yield { content: assistantMessage.content };
      },
    };
    const { service, projectsService } = createService(provider);
    const events = [];
    for await (const event of service.streamReply(
      'owner-id',
      'project-id',
      'conversation-id',
      { retry: true },
      new AbortController().signal,
    )) {
      events.push(event);
    }

    expect(events[0].type).toBe('delta');
    expect(projectsService.createMessage).not.toHaveBeenCalled();
  });

  it('executes an authorized tool and returns its result to the model', async () => {
    let providerTurn = 0;
    const receivedMessages: unknown[] = [];
    const provider: AiProvider = {
      name: 'fake',
      model: 'fake/model',
      async *streamChat(messages) {
        receivedMessages.push(messages);
        providerTurn++;
        if (providerTurn === 1) {
          yield {
            toolCalls: [
              {
                id: 'call-search',
                name: 'search_project_messages',
                arguments: '{"query":"piano"}',
              },
            ],
            usage: { promptTokens: 10, completionTokens: 2 },
          };
          return;
        }
        yield {
          content: 'Você já mencionou piano.',
          usage: { promptTokens: 15, completionTokens: 5 },
        };
      },
    };
    const { service, projectsService, aiToolsService } = createService(provider);

    const events = [];
    for await (const event of service.streamReply(
      'owner-id',
      'project-id',
      'conversation-id',
      { content: 'O que eu disse sobre piano?', retry: false },
      new AbortController().signal,
    )) {
      events.push(event);
    }

    expect(aiToolsService.execute).toHaveBeenCalledWith(
      {
        ownerId: 'owner-id',
        projectId: 'project-id',
        conversationId: 'conversation-id',
      },
      expect.objectContaining({ name: 'search_project_messages' }),
    );
    expect(receivedMessages[1]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          role: 'tool',
          toolCallId: 'call-search',
        }),
      ]),
    );
    expect(projectsService.createAssistantMessage).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      expect.any(String),
      'Você já mencionou piano.',
      expect.objectContaining({ promptTokens: 25, completionTokens: 7 }),
    );
    expect(events.map((event) => event.type)).toContain('done');
  });

  it('rejects a turn that exceeds the tool-call limit', async () => {
    const provider: AiProvider = {
      name: 'fake',
      model: 'fake/model',
      async *streamChat() {
        yield {
          toolCalls: [
            { id: 'call-1', name: 'read_project_summary', arguments: '{}' },
            { id: 'call-2', name: 'read_project_summary', arguments: '{}' },
          ],
        };
      },
    };
    const { service, aiToolsService } = createService(provider, 1);
    const iterator = service.streamReply(
      'owner-id',
      'project-id',
      'conversation-id',
      { content: 'Leia o projeto.', retry: false },
      new AbortController().signal,
    )[Symbol.asyncIterator]();

    await expect(iterator.next()).resolves.toMatchObject({
      value: { type: 'user_message' },
    });
    await expect(iterator.next()).rejects.toMatchObject({
      code: 'invalid_response',
    });
    expect(aiToolsService.execute).not.toHaveBeenCalled();
  });
});
