import {
    AfterViewChecked,
    Component,
    ElementRef,
    EventEmitter,
    Input,
    OnChanges,
    Output,
    SimpleChanges,
    ViewChild
} from '@angular/core';
import { Chat } from '../../models/chat.model';
import { Briefing, BriefingData } from '../../models/briefing.model';
import { MusicReference, ReferenceStatus } from '../../models/reference.model';

@Component({
    selector: 'app-chat-window',
    standalone: false,
    templateUrl: './chat-window.component.html',
    styleUrls: ['./chat-window.component.scss']
})
export class ChatWindowComponent implements AfterViewChecked, OnChanges {
    @Input() chat: Chat | null = null;
    @Input() sending = false;
    @Input() messageResetToken = 0;
    @Input() retryAvailable = false;
    @Input() briefing: Briefing | null = null;
    @Input() briefingBusy = false;
    @Input() briefingError = '';
    @Input() references: MusicReference[] = [];
    @Input() referencesBusy = false;
    @Input() referencesError = '';
    @Input() referenceSearchQuery = '';
    @Input() referencesFromCache = false;
    @Output() closeRequested = new EventEmitter<void>();
    @Output() messageSent = new EventEmitter<string>();
    @Output() retryRequested = new EventEmitter<void>();
    @Output() briefingRequested = new EventEmitter<void>();
    @Output() briefingGenerateRequested = new EventEmitter<void>();
    @Output() briefingSaveRequested = new EventEmitter<BriefingData>();
    @Output() briefingConfirmRequested = new EventEmitter<void>();
    @Output() referencesRequested = new EventEmitter<void>();
    @Output() referencesSearchRequested = new EventEmitter<boolean>();
    @Output() referenceStatusChanged = new EventEmitter<{
        referenceId: string;
        status: ReferenceStatus;
    }>();

    @ViewChild('messages') private messagesContainer?: ElementRef<HTMLDivElement>;

    private lastChatId: string | null = null;
    private lastMessageCount = 0;
    briefingOpen = false;
    referencesOpen = false;

    toggleBriefing(): void {
        this.briefingOpen = !this.briefingOpen;
        this.referencesOpen = false;
        if (this.briefingOpen) {
            this.briefingRequested.emit();
        }
    }

    toggleReferences(): void {
        this.referencesOpen = !this.referencesOpen;
        this.briefingOpen = false;
        if (this.referencesOpen) {
            this.referencesRequested.emit();
        }
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['chat'] && !changes['chat'].firstChange) {
            this.briefingOpen = false;
            this.referencesOpen = false;
        }
    }

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
