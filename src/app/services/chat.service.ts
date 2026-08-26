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

    async createChat(firstMessage: string): Promise<Chat> {
        const content = this.normalizeMessage(firstMessage);
        const title = this.titleFrom(content);
        const project = await this.projectsApi.create(title);
        const conversation = await this.conversationsApi.create(project.id, title);
        const message = await this.conversationsApi.createMessage(
            project.id,
            conversation.id,
            content
        );

        return {
            id: project.id,
            conversationId: conversation.id,
            title: project.title,
            createdAt: project.createdAt,
            updatedAt: conversation.updatedAt,
            messages: [this.mapMessage(message)]
        };
    }

    async addMessage(chat: Chat, content: string): Promise<Chat> {
        const normalizedContent = this.normalizeMessage(content);
        let conversationId = chat.conversationId;

        if (!conversationId) {
            const conversation = await this.conversationsApi.create(chat.id, chat.title);
            conversationId = conversation.id;
        }

        const message = await this.conversationsApi.createMessage(
            chat.id,
            conversationId,
            normalizedContent
        );

        return {
            ...chat,
            conversationId,
            updatedAt: message.createdAt,
            messages: [...chat.messages, this.mapMessage(message)]
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
