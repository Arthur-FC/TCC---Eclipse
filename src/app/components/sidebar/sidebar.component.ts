import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Chat } from '../../models/chat.model';

@Component({
    selector: 'app-sidebar',
    standalone: false,
    templateUrl: './sidebar.component.html',
    styleUrls: ['./sidebar.component.scss']
})
export class SidebarComponent {
    @Input() chats: Chat[] = [];
    @Input() selectedChatId: number | null = null;
    @Input() filter = '';

    @Output() filterChange = new EventEmitter<string>();
    @Output() newChat = new EventEmitter<void>();
    @Output() homeRequested = new EventEmitter<void>();
    @Output() chatSelected = new EventEmitter<Chat>();
    @Output() chatDeleted = new EventEmitter<number>();
    @Output() chatRenamed = new EventEmitter<{ chatId: number; title: string }>();
}
