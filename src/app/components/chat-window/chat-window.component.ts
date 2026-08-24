import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Chat } from '../../models/chat.model';

@Component({
    selector: 'app-chat-window',
    standalone: false,
    templateUrl: './chat-window.component.html',
    styleUrls: ['./chat-window.component.scss']
})
export class ChatWindowComponent {
    @Input() chat: Chat | null = null;
    @Output() messageSent = new EventEmitter<string>();
}
