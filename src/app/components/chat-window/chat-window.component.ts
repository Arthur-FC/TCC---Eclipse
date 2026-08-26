import {
    AfterViewChecked,
    Component,
    ElementRef,
    EventEmitter,
    Input,
    Output,
    ViewChild
} from '@angular/core';
import { Chat } from '../../models/chat.model';

@Component({
    selector: 'app-chat-window',
    standalone: false,
    templateUrl: './chat-window.component.html',
    styleUrls: ['./chat-window.component.scss']
})
export class ChatWindowComponent implements AfterViewChecked {
    @Input() chat: Chat | null = null;
    @Input() sending = false;
    @Input() messageResetToken = 0;
    @Input() retryAvailable = false;
    @Output() closeRequested = new EventEmitter<void>();
    @Output() messageSent = new EventEmitter<string>();
    @Output() retryRequested = new EventEmitter<void>();

    @ViewChild('messages') private messagesContainer?: ElementRef<HTMLDivElement>;

    private lastChatId: string | null = null;
    private lastMessageCount = 0;

    ngAfterViewChecked(): void {
        const chatId = this.chat?.id ?? null;
        const messageCount = this.chat?.messages.length ?? 0;
        const chatChanged = chatId !== this.lastChatId;
        const messagesChanged = messageCount !== this.lastMessageCount;

        if (!chatChanged && !messagesChanged) {
            return;
        }

        this.lastChatId = chatId;
        this.lastMessageCount = messageCount;

        const container = this.messagesContainer?.nativeElement;
        if (!container) {
            return;
        }

        requestAnimationFrame(() => {
            container.scrollTo({
                top: container.scrollHeight,
                behavior: chatChanged ? 'auto' : 'smooth'
            });
        });
    }
}
