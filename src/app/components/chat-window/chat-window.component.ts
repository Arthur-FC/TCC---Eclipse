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
import { LibraryTrack, TrackUploadRequest } from '../../models/library-track.model';

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
    @Input() libraryTracks: LibraryTrack[] = [];
    @Input() libraryBusy = false;
    @Input() libraryError = '';
    @Input() libraryPlaybackTrackId: string | null = null;
    @Input() libraryPlaybackUrl = '';
    @Output() closeRequested = new EventEmitter<void>();
    @Output() messageSent = new EventEmitter<string>();
    @Output() retryRequested = new EventEmitter<void>();
    @Output() briefingRequested = new EventEmitter<void>();
    @Output() briefingGenerateRequested = new EventEmitter<void>();
    @Output() briefingSaveRequested = new EventEmitter<BriefingData>();
    @Output() briefingConfirmRequested = new EventEmitter<void>();
    @Output() referencesRequested = new EventEmitter<void>();
    @Output() referencesSearchRequested = new EventEmitter<boolean>();
    @Output() spotifyReferenceAddRequested = new EventEmitter<string>();
    @Output() referenceStatusChanged = new EventEmitter<{
        referenceId: string;
        status: ReferenceStatus;
    }>();
    @Output() libraryRequested = new EventEmitter<void>();
    @Output() libraryUploadRequested = new EventEmitter<TrackUploadRequest>();
    @Output() libraryPlaybackRequested = new EventEmitter<string>();
    @Output() libraryPlaybackStopped = new EventEmitter<void>();
    @Output() libraryDeleteRequested = new EventEmitter<string>();

    @ViewChild('messages') private messagesContainer?: ElementRef<HTMLDivElement>;

    private lastChatId: string | null = null;
    private lastMessageCount = 0;
    private lastMessageContentLength = 0;
    private lastTypingIndicatorVisible = false;
    private scrollToBottomWhenChatReturns = false;
    briefingOpen = false;
    referencesOpen = false;
    libraryOpen = false;

    get showTypingIndicator(): boolean {
        return !!this.chat &&
            this.sending &&
            this.chat.messages.at(-1)?.author !== 'assistant';
    }

    toggleBriefing(): void {
        this.briefingOpen = !this.briefingOpen;
        this.referencesOpen = false;
        this.libraryOpen = false;
        if (this.briefingOpen) {
            this.briefingRequested.emit();
        } else {
            this.scrollToBottomWhenChatReturns = true;
        }
    }

    toggleReferences(): void {
        this.referencesOpen = !this.referencesOpen;
        this.briefingOpen = false;
        this.libraryOpen = false;
        if (this.referencesOpen) {
            this.referencesRequested.emit();
        } else {
            this.scrollToBottomWhenChatReturns = true;
        }
    }

    toggleLibrary(): void {
        this.libraryOpen = !this.libraryOpen;
        this.briefingOpen = false;
        this.referencesOpen = false;
        if (this.libraryOpen) {
            this.libraryRequested.emit();
        } else {
            this.scrollToBottomWhenChatReturns = true;
        }
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['chat'] && !changes['chat'].firstChange) {
            this.briefingOpen = false;
            this.referencesOpen = false;
            this.libraryOpen = false;
        }
    }

    ngAfterViewChecked(): void {
        const chatId = this.chat?.id ?? null;
        const messageCount = this.chat?.messages.length ?? 0;
        const messageContentLength = this.chat?.messages.at(-1)?.content.length ?? 0;
        const chatChanged = chatId !== this.lastChatId;
        const messagesChanged = messageCount !== this.lastMessageCount;
        const messageContentChanged =
            messageContentLength !== this.lastMessageContentLength;
        const typingIndicatorChanged =
            this.showTypingIndicator !== this.lastTypingIndicatorVisible;
        const chatReturned = this.scrollToBottomWhenChatReturns;

        if (
            !chatChanged &&
            !messagesChanged &&
            !messageContentChanged &&
            !typingIndicatorChanged &&
            !chatReturned
        ) {
            return;
        }

        this.lastChatId = chatId;
        this.lastMessageCount = messageCount;
        this.lastMessageContentLength = messageContentLength;
        this.lastTypingIndicatorVisible = this.showTypingIndicator;

        const container = this.messagesContainer?.nativeElement;
        if (!container) {
            return;
        }

        this.scrollToBottomWhenChatReturns = false;

        requestAnimationFrame(() => {
            container.scrollTo({
                top: container.scrollHeight,
                behavior: chatChanged || chatReturned ? 'auto' : 'smooth'
            });
        });
    }
}
