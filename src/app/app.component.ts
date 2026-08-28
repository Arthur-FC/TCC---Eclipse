import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { AuthRequest, AuthenticatedUser } from './models/auth.model';
import { Chat } from './models/chat.model';
import { AuthService } from './services/auth.service';
import { ChatService, ChatStreamPhase } from './services/chat.service';
import { AssistantStreamError } from './services/conversations-api.service';
import { Briefing, BriefingData } from './models/briefing.model';
import { BriefingsApiService } from './services/briefings-api.service';
import { MusicReference, ReferenceStatus } from './models/reference.model';
import { ReferencesApiService } from './services/references-api.service';

@Component({
    selector: 'app-root',
    standalone: false,
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
    user: AuthenticatedUser | null = null;
    chats: Chat[] = [];
    selectedChat: Chat | null = null;
    filter = '';
    isInitializing = true;
    isAuthenticating = false;
    isLoadingChats = false;
    isSending = false;
    operationInProgress = false;
    errorMessage = '';
    authErrorMessage = '';
    messageResetToken = 0;
    failedReplyChatId: string | null = null;
    briefing: Briefing | null = null;
    isBriefingBusy = false;
    briefingErrorMessage = '';
    references: MusicReference[] = [];
    isReferencesBusy = false;
    referencesErrorMessage = '';
    referenceSearchQuery = '';
    referencesFromCache = false;
    private isDraftChat = false;

    constructor(
        private readonly authService: AuthService,
        private readonly chatService: ChatService,
        private readonly briefingsApi: BriefingsApiService,
        private readonly referencesApi: ReferencesApiService
    ) {}

    async ngOnInit(): Promise<void> {
        try {
            this.user = await this.authService.getCurrentUser();
            await this.refreshChats();
        } catch (error) {
            if (!(error instanceof HttpErrorResponse) || error.status !== 401) {
                this.authErrorMessage = this.describeError(error);
            }
        } finally {
            this.isInitializing = false;
        }
    }

    async authenticate(request: AuthRequest): Promise<void> {
        if (this.isAuthenticating) {
            return;
        }

        this.isAuthenticating = true;
        this.authErrorMessage = '';
        try {
            this.user = request.mode === 'login'
                ? await this.authService.login(request.credentials)
                : await this.authService.register(request.credentials);
            await this.refreshChats();
        } catch (error) {
            this.authErrorMessage = this.describeError(error);
        } finally {
            this.isAuthenticating = false;
        }
    }

    async logout(): Promise<void> {
        if (this.operationInProgress) {
            return;
        }

        this.operationInProgress = true;
        this.errorMessage = '';
        try {
            await this.authService.logout();
            this.user = null;
            this.chats = [];
            this.selectedChat = null;
            this.briefing = null;
            this.references = [];
            this.referencesFromCache = false;
            this.isDraftChat = false;
        } catch (error) {
            this.errorMessage = this.describeError(error);
        } finally {
            this.operationInProgress = false;
        }
    }

    startNewChat(): void {
        if (this.isSending || this.operationInProgress) {
            return;
        }
        this.errorMessage = '';
        this.filter = '';
        this.isDraftChat = true;
        this.selectedChat = this.createDraftChat();
    }

    selectChat(chat: Chat): void {
        this.errorMessage = '';
        this.isDraftChat = false;
        this.selectedChat = chat;
        this.briefing = null;
        this.briefingErrorMessage = '';
        this.references = [];
        this.referencesErrorMessage = '';
        this.referenceSearchQuery = '';
        this.referencesFromCache = false;
        this.failedReplyChatId = chat.messages.at(-1)?.author === 'user'
            ? chat.id
            : null;
    }

    goHome(): void {
        this.errorMessage = '';
        this.isDraftChat = false;
        this.selectedChat = null;
        this.briefing = null;
        this.briefingErrorMessage = '';
        this.references = [];
        this.referencesErrorMessage = '';
        this.referenceSearchQuery = '';
        this.referencesFromCache = false;
    }

    async deleteChat(chatId: string): Promise<void> {
        if (this.operationInProgress) {
            return;
        }

        this.operationInProgress = true;
        this.errorMessage = '';
        try {
            await this.chatService.deleteChat(chatId);
            this.chats = this.chats.filter(chat => chat.id !== chatId);
            if (this.selectedChat?.id === chatId) {
                this.selectedChat = null;
                this.briefing = null;
                this.references = [];
                this.referencesFromCache = false;
            }
        } catch (error) {
            this.errorMessage = this.describeError(error);
        } finally {
            this.operationInProgress = false;
        }
    }

    async renameChat(event: { chatId: string; title: string }): Promise<void> {
        if (this.operationInProgress) {
            return;
        }

        const chat = this.chats.find(item => item.id === event.chatId);
        if (!chat) {
            return;
        }

        this.operationInProgress = true;
        this.errorMessage = '';
        try {
            const updated = await this.chatService.renameChat(chat, event.title);
            this.replaceChat(updated);
        } catch (error) {
            this.errorMessage = this.describeError(error);
        } finally {
            this.operationInProgress = false;
        }
    }

    async sendMessage(content: string): Promise<void> {
        if (this.isSending) {
            return;
        }

        this.isSending = true;
        this.errorMessage = '';
        this.failedReplyChatId = null;
        let userSaved = false;
        const updateChat = (chat: Chat, phase: ChatStreamPhase) => {
            if (phase === 'prepared') {
                this.isDraftChat = false;
                this.filter = '';
            }
            if (phase === 'user-saved') {
                userSaved = true;
                this.messageResetToken++;
            }
            this.replaceChat(chat, true);
        };
        try {
            const chat = this.isDraftChat || !this.selectedChat
                ? await this.chatService.createChat(content, updateChat)
                : await this.chatService.addMessage(
                    this.selectedChat,
                    content,
                    updateChat
                );

            this.isDraftChat = false;
            this.filter = '';
            this.replaceChat(chat, true);
        } catch (error) {
            if (userSaved && this.selectedChat) {
                this.failedReplyChatId = this.selectedChat.id;
                this.errorMessage = `${this.describeError(error)} Sua mensagem foi salva; você pode tentar gerar somente a resposta novamente.`;
            } else {
                this.errorMessage = `${this.describeError(error)} A mensagem foi mantida no campo para você tentar novamente.`;
            }
        } finally {
            this.isSending = false;
        }
    }

    async retryAssistant(): Promise<void> {
        if (
            this.isSending ||
            !this.selectedChat ||
            this.failedReplyChatId !== this.selectedChat.id
        ) {
            return;
        }

        this.isSending = true;
        this.errorMessage = '';
        try {
            const chat = await this.chatService.retryAssistant(
                this.selectedChat,
                updated => this.replaceChat(updated, true)
            );
            this.failedReplyChatId = null;
            this.replaceChat(chat, true);
        } catch (error) {
            this.errorMessage = this.describeError(error);
        } finally {
            this.isSending = false;
        }
    }

    async loadBriefing(): Promise<void> {
        if (!this.selectedChat || this.selectedChat.id.startsWith('draft-')) return;

        this.isBriefingBusy = true;
        this.briefingErrorMessage = '';
        try {
            this.briefing = await this.briefingsApi.getLatest(this.selectedChat.id);
        } catch (error) {
            if (error instanceof HttpErrorResponse && error.status === 404) {
                this.briefing = null;
            } else {
                this.briefingErrorMessage = this.describeError(error);
            }
        } finally {
            this.isBriefingBusy = false;
        }
    }

    async generateBriefing(): Promise<void> {
        if (!this.selectedChat?.conversationId || this.isBriefingBusy) return;

        this.isBriefingBusy = true;
        this.briefingErrorMessage = '';
        try {
            this.briefing = await this.briefingsApi.generate(
                this.selectedChat.id,
                this.selectedChat.conversationId
            );
        } catch (error) {
            this.briefingErrorMessage = this.describeError(error);
        } finally {
            this.isBriefingBusy = false;
        }
    }

    async saveBriefing(data: BriefingData): Promise<void> {
        if (!this.selectedChat || !this.briefing || this.isBriefingBusy) return;

        this.isBriefingBusy = true;
        this.briefingErrorMessage = '';
        try {
            this.briefing = await this.briefingsApi.update(
                this.selectedChat.id,
                this.briefing.version,
                data
            );
        } catch (error) {
            this.briefingErrorMessage = this.describeError(error);
        } finally {
            this.isBriefingBusy = false;
        }
    }

    async confirmBriefing(): Promise<void> {
        if (!this.selectedChat || !this.briefing || this.isBriefingBusy) return;

        this.isBriefingBusy = true;
        this.briefingErrorMessage = '';
        try {
            this.briefing = await this.briefingsApi.confirm(
                this.selectedChat.id,
                this.briefing.version
            );
        } catch (error) {
            this.briefingErrorMessage = this.describeError(error);
        } finally {
            this.isBriefingBusy = false;
        }
    }

    async loadReferences(): Promise<void> {
        if (!this.selectedChat || this.selectedChat.id.startsWith('draft-')) return;

        this.isReferencesBusy = true;
        this.referencesErrorMessage = '';
        try {
            this.references = await this.referencesApi.list(this.selectedChat.id);
            this.referenceSearchQuery = this.references[0]?.searchQuery ?? '';
        } catch (error) {
            this.referencesErrorMessage = this.describeError(error);
        } finally {
            this.isReferencesBusy = false;
        }
    }

    async searchYouTubeReferences(refresh = false): Promise<void> {
        if (!this.selectedChat || this.isReferencesBusy) return;

        this.isReferencesBusy = true;
        this.referencesErrorMessage = '';
        try {
            const response = await this.referencesApi.searchYouTube(
                this.selectedChat.id,
                refresh
            );
            this.references = response.items;
            this.referenceSearchQuery = response.query;
            this.referencesFromCache = response.fromCache;
        } catch (error) {
            this.referencesErrorMessage = this.describeError(error);
        } finally {
            this.isReferencesBusy = false;
        }
    }

    async updateReferenceStatus(event: {
        referenceId: string;
        status: ReferenceStatus;
    }): Promise<void> {
        if (!this.selectedChat || this.isReferencesBusy) return;

        this.isReferencesBusy = true;
        this.referencesErrorMessage = '';
        try {
            const updated = await this.referencesApi.updateStatus(
                this.selectedChat.id,
                event.referenceId,
                event.status
            );
            this.references = this.references.map(reference =>
                reference.id === updated.id ? updated : reference
            );
        } catch (error) {
            this.referencesErrorMessage = this.describeError(error);
        } finally {
            this.isReferencesBusy = false;
        }
    }

    private async refreshChats(): Promise<void> {
        this.isLoadingChats = true;
        this.errorMessage = '';
        const selectedId = this.selectedChat?.id;
        try {
            this.chats = await this.chatService.getChats();
            this.selectedChat = selectedId
                ? this.chats.find(chat => chat.id === selectedId) ?? null
                : null;
        } catch (error) {
            this.errorMessage = this.describeError(error);
            throw error;
        } finally {
            this.isLoadingChats = false;
        }
    }

    private replaceChat(updated: Chat, moveToTop = false): void {
        const remaining = this.chats.filter(chat => chat.id !== updated.id);
        this.chats = moveToTop ? [updated, ...remaining] : this.chats.map(
            chat => chat.id === updated.id ? updated : chat
        );
        if (!this.chats.some(chat => chat.id === updated.id)) {
            this.chats.unshift(updated);
        }
        if (this.selectedChat?.id === updated.id || moveToTop) {
            this.selectedChat = updated;
        }
    }

    private createDraftChat(): Chat {
        const now = new Date().toISOString();
        return {
            id: `draft-${Date.now()}`,
            conversationId: null,
            title: 'Nova conversa',
            createdAt: now,
            updatedAt: now,
            messages: []
        };
    }

    private describeError(error: unknown): string {
        if (error instanceof AssistantStreamError) {
            return error.message;
        }
        if (error instanceof HttpErrorResponse) {
            if (error.status === 0) {
                return 'Não foi possível conectar à API na porta 3002. Confirme se o backend está ligado.';
            }
            if (error.status === 401) {
                return 'E-mail ou senha inválidos, ou sua sessão expirou.';
            }
            const message = error.error?.message;
            if (Array.isArray(message)) {
                return message.join(' ');
            }
            if (typeof message === 'string') {
                return message;
            }
            if (error.status === 409) {
                return 'A operação entrou em conflito com uma alteração recente.';
            }
        }

        return error instanceof Error ? error.message : 'Ocorreu um erro inesperado.';
    }
}
