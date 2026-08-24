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

    constructor(private readonly chatService: ChatService) {
        this.refreshChats();
    }

    startNewChat(): void {
        const chat = this.chatService.createChat();
        this.filter = '';
        this.refreshChats(chat.id);
    }

    selectChat(chat: Chat): void {
        this.selectedChat = chat;
    }

    sendMessage(content: string): void {
        const chat = this.selectedChat
            ? this.chatService.addMessage(this.selectedChat.id, content)
            : this.chatService.createChat(content);

        this.filter = '';
        this.refreshChats(chat.id);
    }

    private refreshChats(selectedId = this.selectedChat?.id): void {
        this.chats = this.chatService.getChats();
        this.selectedChat = selectedId
            ? this.chats.find(chat => chat.id === selectedId) ?? null
            : null;
    }
}
