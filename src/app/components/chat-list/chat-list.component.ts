import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Chat } from '../../models/chat.model';

interface ChatGroup {
    label: string;
    chats: Chat[];
}

@Component({
    selector: 'app-chat-list',
    standalone: false,
    templateUrl: './chat-list.component.html',
    styleUrls: ['./chat-list.component.scss']
})
export class ChatListComponent {
    @Input() chats: Chat[] = [];
    @Input() filter = '';
    @Input() selectedChatId: number | null = null;
    @Output() chatSelected = new EventEmitter<Chat>();

    get groups(): ChatGroup[] {
        const filteredChats = this.chats.filter(chat =>
            chat.title.toLocaleLowerCase('pt-BR').includes(this.filter.toLocaleLowerCase('pt-BR'))
        );

        const groups = [
            { label: 'Hoje', chats: filteredChats.filter(chat => this.daysAgo(chat.createdAt) === 0) },
            { label: 'Ontem', chats: filteredChats.filter(chat => this.daysAgo(chat.createdAt) === 1) },
            { label: 'Mais antigos', chats: filteredChats.filter(chat => this.daysAgo(chat.createdAt) > 1) }
        ];

        return groups.filter(group => group.chats.length > 0);
    }

    trackByChatId(_: number, chat: Chat): number {
        return chat.id;
    }

    private daysAgo(date: string): number {
        const today = new Date();
        const comparedDate = new Date(date);
        const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const startOfComparedDate = new Date(
            comparedDate.getFullYear(),
            comparedDate.getMonth(),
            comparedDate.getDate()
        );

        return Math.floor((startOfToday.getTime() - startOfComparedDate.getTime()) / 86_400_000);
    }
}
