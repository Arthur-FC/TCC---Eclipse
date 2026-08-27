import { Injectable } from '@angular/core';
import { Chat } from '../models/chat.model';
import { Message } from '../models/message.model';
import { ConversationsApiService } from './conversations-api.service';
import { ApiProject, ProjectsApiService } from './projects-api.service';

@Injectable({ providedIn: 'root' })
export class ChatService {
    constructor(
        private readonly projectsApi: ProjectsApiService,
        private readonly conversationsApi: ConversationsApiService
    ) {}

    async getChats(): Promise<Chat[]> {
        const projects = await this.projectsApi.list();
        return Promise.all(projects.items.map(project => this.loadProjectChat(project)));
    }

    async createChat(
        firstMessage: string,
        onUpdate: ChatStreamUpdate
    ): Promise<Chat> {
        const content = this.normalizeMessage(firstMessage);
        const title = this.titleFrom(content);
        const project = await this.projectsApi.create(title);
        const conversation = await this.conversationsApi.create(project.id, title);
        const chat: Chat = {
            id: project.id,
            conversationId: conversation.id,
            title: project.title,
            createdAt: project.createdAt,
            updatedAt: conversation.updatedAt,
            messages: []
        }
        onUpdate(chat, 'prepared');
        return this.streamReply(chat, { content }, onUpdate);
    }

    async addMessage(
        chat: Chat,
        content: string,
        onUpdate: ChatStreamUpdate
    ): Promise<Chat> {
        const normalizedContent = this.normalizeMessage(content);
        let conversationId = chat.conversationId;

        if (!conversationId) {
            const conversation = await this.conversationsApi.create(chat.id, chat.title);
            conversationId = conversation.id;
        }

        const preparedChat = {
            ...chat,
            conversationId,
        };
        return this.streamReply(
            preparedChat,
            { content: normalizedContent },
            onUpdate
        );
    }

    retryAssistant(chat: Chat, onUpdate: ChatStreamUpdate): Promise<Chat> {
        if (!chat.conversationId) {
            throw new Error('Esta conversa ainda não pode ser repetida.');
        }
        return this.streamReply(chat, { retry: true }, onUpdate);
    }

    private async streamReply(
        chat: Chat,
        request: { content?: string; retry?: boolean },
        onUpdate: ChatStreamUpdate
    ): Promise<Chat> {
        if (!chat.conversationId) {
            throw new Error('A conversa não foi criada corretamente.');
        }

        let updatedChat = chat;
        const streamingMessageId = `streaming-${chat.conversationId}`;
        try {
            await this.conversationsApi.streamAssistant(
                chat.id,
                chat.conversationId,
                request,
                event => {
                    if (event.type === 'user_message') {
                        updatedChat = {
                            ...updatedChat,
                            updatedAt: event.message.createdAt,
                            messages: [
                                ...updatedChat.messages,
                                this.mapMessage(event.message)
                            ]
                        };
                        onUpdate(updatedChat, 'user-saved');
                        return;
                    }

                    if (event.type === 'delta') {
                        const existing = updatedChat.messages.find(
                            message => message.id === streamingMessageId
                        );
                        const streamingMessage: Message = {
                            id: streamingMessageId,
                            author: 'assistant',
                            content: `${existing?.content ?? ''}${event.content}`,
                            createdAt: new Date().toISOString()
                        };
                        updatedChat = {
                            ...updatedChat,
                            messages: existing
                                ? updatedChat.messages.map(message =>
                                    message.id === streamingMessageId
                                        ? streamingMessage
                                        : message
                                )
                                : [...updatedChat.messages, streamingMessage]
                        };
                        onUpdate(updatedChat, 'assistant-delta');
                        return;
                    }

                    updatedChat = {
                        ...updatedChat,
                        updatedAt: event.message.createdAt,
                        messages: [
                            ...updatedChat.messages.filter(
                                message => message.id !== streamingMessageId
                            ),
                            this.mapMessage(event.message)
                        ]
                    };
                    onUpdate(updatedChat, 'completed');
                }
            );
            return updatedChat;
        } catch (error) {
            if (updatedChat.messages.some(message => message.id === streamingMessageId)) {
                updatedChat = {
                    ...updatedChat,
                    messages: updatedChat.messages.filter(
                        message => message.id !== streamingMessageId
                    )
                };
                onUpdate(updatedChat, 'failed');
            }
            throw error;
        };
    }

    deleteChat(projectId: string): Promise<void> {
        return this.projectsApi.archive(projectId);
    }

    async renameChat(chat: Chat, title: string): Promise<Chat> {
        const normalizedTitle = title.trim();
        if (!normalizedTitle) {
            throw new Error('O título não pode ficar vazio.');
        }

        const project = await this.projectsApi.update(chat.id, normalizedTitle);
        return { ...chat, title: project.title, updatedAt: project.updatedAt };
    }

    private async loadProjectChat(project: ApiProject): Promise<Chat> {
        const conversations = await this.conversationsApi.list(project.id);
        const conversation = conversations.items[0] ?? null;
        const messages = conversation
            ? await this.conversationsApi.listMessages(project.id, conversation.id)
            : null;

        return {
            id: project.id,
            conversationId: conversation?.id ?? null,
            title: project.title,
            createdAt: project.createdAt,
            updatedAt: conversation?.updatedAt ?? project.updatedAt,
            messages: messages
                ? [...messages.items].reverse().map(message => this.mapMessage(message))
                : []
        };
    }

    private mapMessage(message: {
        id: string;
        content: string;
        role: Message['author'];
        createdAt: string;
    }): Message {
        return {
            id: message.id,
            content: message.content,
            author: message.role,
            createdAt: message.createdAt
        };
    }

    private normalizeMessage(content: string): string {
        const normalizedContent = content.trim();
        if (!normalizedContent) {
            throw new Error('A mensagem não pode ficar vazia.');
        }
        return normalizedContent;
    }

    private titleFrom(content: string): string {
        return content.length <= 120 ? content : `${content.slice(0, 117)}...`;
    }
}

export type ChatStreamPhase =
    | 'prepared'
    | 'user-saved'
    | 'assistant-delta'
    | 'completed'
    | 'failed';

export type ChatStreamUpdate = (chat: Chat, phase: ChatStreamPhase) => void;
