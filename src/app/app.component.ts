import { Component } from '@angular/core';
import { Chat } from './models/chat.model';
import { ChatService } from './services/chat.service';

@Component({
    selector: 'app-root',
    standalone: false,
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss']
})
export class AppComponent {
    chats: Chat[] = [];
    selectedChat: Chat | null = null;
    filter = '';
    private isDraftChat = false;

    constructor(private readonly chatService: ChatService) {
        this.refreshChats();
    }

    startNewChat(): void {
        this.filter = '';
        this.isDraftChat = true;
        this.selectedChat = this.createDraftChat();
    }

    selectChat(chat: Chat): void {
        this.isDraftChat = false;
        this.selectedChat = chat;
    }

    goHome(): void {
        this.isDraftChat = false;
        this.selectedChat = null;
    }

    deleteChat(chatId: number): void {
        if (this.selectedChat?.id === chatId) {
            this.selectedChat = null;
        }

        this.chatService.deleteChat(chatId);
        this.refreshChats();
    }

    renameChat(event: { chatId: number; title: string }): void {
        this.chatService.renameChat(event.chatId, event.title);
        this.refreshChats();
    }

    sendMessage(content: string): void {
        const chat = this.isDraftChat
            ? this.chatService.createChat(content)
            : this.selectedChat
                ? this.chatService.addMessage(this.selectedChat.id, content)
                : this.chatService.createChat(content);

        this.isDraftChat = false;
        this.filter = '';
        this.refreshChats(chat.id);
    }

    private createDraftChat(): Chat {
        return {
            id: -Date.now(),
            title: 'Nova conversa',
            createdAt: new Date().toISOString(),
            messages: []
        };
    }

    private refreshChats(selectedId = this.selectedChat?.id): void {
        const draftChat = this.isDraftChat ? this.selectedChat : null;
        this.chats = this.chatService.getChats();

        if (draftChat) {
            this.selectedChat = draftChat;
            return;
        }

        this.selectedChat = selectedId
            ? this.chats.find(chat => chat.id === selectedId) ?? null
            : null;
    }
}
