import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { AuthRequest, AuthenticatedUser } from './models/auth.model';
import { Chat } from './models/chat.model';
import { AuthService } from './services/auth.service';
import { ChatService } from './services/chat.service';

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
    private isDraftChat = false;

    constructor(
        private readonly authService: AuthService,
        private readonly chatService: ChatService
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
    }

    goHome(): void {
        this.errorMessage = '';
        this.isDraftChat = false;
        this.selectedChat = null;
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
        try {
            const chat = this.isDraftChat || !this.selectedChat
                ? await this.chatService.createChat(content)
                : await this.chatService.addMessage(this.selectedChat, content);

            this.isDraftChat = false;
            this.filter = '';
            this.messageResetToken++;
            this.replaceChat(chat, true);
        } catch (error) {
            this.errorMessage = `${this.describeError(error)} A mensagem foi mantida para você tentar novamente.`;
        } finally {
            this.isSending = false;
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
        if (error instanceof HttpErrorResponse) {
            if (error.status === 0) {
                return 'Não foi possível conectar à API na porta 3002. Confirme se o backend está ligado.';
            }
            if (error.status === 401) {
                return 'E-mail ou senha inválidos, ou sua sessão expirou.';
            }
            if (error.status === 409) {
                return 'Este e-mail já está cadastrado.';
            }

            const message = error.error?.message;
            if (Array.isArray(message)) {
                return message.join(' ');
            }
            if (typeof message === 'string') {
                return message;
            }
        }

        return error instanceof Error ? error.message : 'Ocorreu um erro inesperado.';
    }
}
