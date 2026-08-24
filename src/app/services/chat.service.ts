import { Injectable } from '@angular/core';
import { Chat } from '../models/chat.model';
import { Message } from '../models/message.model';

@Injectable({ providedIn: 'root' })
export class ChatService {
    private readonly storageKey = 'eclipse.chats';
    private chats: Chat[] = this.loadChats();

    getChats(): Chat[] {
        return this.chats.map(chat => ({
            ...chat,
            messages: [...chat.messages]
        }));
    }

    createChat(firstMessage?: string): Chat {
        const content = firstMessage?.trim();
        const createdAt = new Date().toISOString();
        const chat: Chat = {
            id: Date.now(),
            title: content || 'Nova conversa',
            createdAt,
            messages: content ? [this.createMessage(content, createdAt)] : []
        };

        this.chats.unshift(chat);
        this.saveChats();
        return chat;
    }

    addMessage(chatId: number, content: string): Chat {
        const chat = this.chats.find(item => item.id === chatId);
        const normalizedContent = content.trim();

        if (!chat || !normalizedContent) {
            throw new Error('Conversa ou mensagem inválida.');
        }

        chat.messages.push(this.createMessage(normalizedContent));
        if (chat.title === 'Nova conversa') {
            chat.title = normalizedContent;
        }

        this.saveChats();
        return chat;
    }

    private createMessage(content: string, createdAt = new Date().toISOString()): Message {
        return {
            id: Date.now(),
            content,
            author: 'user',
            createdAt
        };
    }

    private loadChats(): Chat[] {
        if (typeof localStorage === 'undefined') {
            return this.seedChats();
        }

        try {
            const storedChats = localStorage.getItem(this.storageKey);
            return storedChats ? JSON.parse(storedChats) as Chat[] : this.seedChats();
        } catch {
            return this.seedChats();
        }
    }

    private saveChats(): void {
        if (typeof localStorage !== 'undefined') {
            localStorage.setItem(this.storageKey, JSON.stringify(this.chats));
        }
    }

    private seedChats(): Chat[] {
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);

        return [
            this.seedChat(1, 'Ajuda na organização...', today),
            this.seedChat(2, 'Escolha do Instrumento...', today),
            this.seedChat(3, 'Separação da Playlist...', yesterday)
        ];
    }

    private seedChat(id: number, title: string, date: Date): Chat {
        return { id, title, createdAt: date.toISOString(), messages: [] };
    }
}
