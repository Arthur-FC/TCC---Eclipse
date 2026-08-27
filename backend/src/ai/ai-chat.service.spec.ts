import { ConfigService } from '@nestjs/config';
import { MessageEntity } from '../projects/message.entity';
import { MessageRole } from '../projects/message-role.enum';
import { ProjectsService } from '../projects/projects.service';
import { AiChatService } from './ai-chat.service';
import { AiProvider } from './ai-provider.interface';
import { AiProviderError } from './ai-provider.error';

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

  function createService(provider: AiProvider) {
    const projectsService = {
      createMessage: jest.fn().mockResolvedValue(userMessage),
      getConversationContext: jest.fn().mockResolvedValue([userMessage]),
      createAssistantMessage: jest.fn().mockResolvedValue(assistantMessage),
    } as unknown as jest.Mocked<ProjectsService>;
    const configService = {
      get: jest.fn().mockReturnValue(20),
    } as unknown as ConfigService;
    return {
      service: new AiChatService(projectsService, configService, provider),
      projectsService,
    };
  }

  it('streams deltas and persists the final assistant message with metadata', async () => {
    const provider: AiProvider = {
      name: 'fake',
      model: 'fake/model',
      async *streamChat() {
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
});
