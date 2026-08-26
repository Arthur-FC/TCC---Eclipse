import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { MessageAuthor } from '../models/message.model';
import { PaginatedResponse } from './projects-api.service';

export interface ApiConversation {
    id: string;
    projectId: string;
    title: string;
    createdAt: string;
    updatedAt: string;
}

export interface ApiMessage {
    id: string;
    conversationId: string;
    role: MessageAuthor;
    content: string;
    createdAt: string;
}

export type AssistantStreamEvent =
    | { type: 'user_message'; message: ApiMessage }
    | { type: 'delta'; content: string }
    | { type: 'done'; message: ApiMessage };

interface StreamErrorPayload {
    code?: string;
    message?: string;
    retryAfterSeconds?: number;
}

export class AssistantStreamError extends Error {
    constructor(
        message: string,
        readonly code = 'stream_error',
        readonly status?: number,
        readonly retryAfterSeconds?: number
    ) {
        super(message);
        this.name = 'AssistantStreamError';
    }
}

@Injectable({ providedIn: 'root' })
export class ConversationsApiService {
    private readonly projectsUrl = `${environment.apiBaseUrl}/projects`;

    constructor(private readonly http: HttpClient) {}

    list(projectId: string): Promise<PaginatedResponse<ApiConversation>> {
        return firstValueFrom(
            this.http.get<PaginatedResponse<ApiConversation>>(
                `${this.projectsUrl}/${projectId}/conversations?page=1&limit=100`,
                { withCredentials: true }
            )
        );
    }

    create(projectId: string, title: string): Promise<ApiConversation> {
        return firstValueFrom(
            this.http.post<ApiConversation>(
                `${this.projectsUrl}/${projectId}/conversations`,
                { title },
                { withCredentials: true }
            )
        );
    }

    listMessages(
        projectId: string,
        conversationId: string
    ): Promise<PaginatedResponse<ApiMessage>> {
        return firstValueFrom(
            this.http.get<PaginatedResponse<ApiMessage>>(
                `${this.projectsUrl}/${projectId}/conversations/${conversationId}/messages?page=1&limit=100`,
                { withCredentials: true }
            )
        );
    }

    async streamAssistant(
        projectId: string,
        conversationId: string,
        request: { content?: string; retry?: boolean },
        onEvent: (event: AssistantStreamEvent) => void
    ): Promise<void> {
        let response: Response;
        try {
            response = await fetch(
                `${this.projectsUrl}/${projectId}/conversations/${conversationId}/assistant/stream`,
                {
                    method: 'POST',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(request)
                }
            );
        } catch {
            throw new AssistantStreamError('Não foi possível conectar à API.', 'network_error');
        }

        if (!response.ok) {
            const payload = await this.readErrorResponse(response);
            throw new AssistantStreamError(
                payload.message ?? 'A API recusou a solicitação.',
                payload.code ?? 'request_error',
                response.status,
                payload.retryAfterSeconds
            );
        }
        if (!response.body) {
            throw new AssistantStreamError(
                'O navegador não recebeu o fluxo da resposta.',
                'empty_stream'
            );
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let completed = false;

        while (true) {
            const { done, value } = await reader.read();
            buffer += decoder.decode(value, { stream: !done });
            const blocks = buffer.split(/\r?\n\r?\n/);
            buffer = blocks.pop() ?? '';
            for (const block of blocks) {
                const event = this.parseStreamBlock(block);
                if (!event) continue;
                if (event.type === 'error') {
                    const payload = event.data as StreamErrorPayload;
                    throw new AssistantStreamError(
                        payload.message ?? 'A IA não conseguiu responder.',
                        payload.code,
                        undefined,
                        payload.retryAfterSeconds
                    );
                }
                if (event.type === 'user_message') {
                    onEvent({
                        type: 'user_message',
                        message: (event.data as { message: ApiMessage }).message
                    });
                } else if (event.type === 'delta') {
                    onEvent({
                        type: 'delta',
                        content: (event.data as { content: string }).content
                    });
                } else if (event.type === 'done') {
                    completed = true;
                    onEvent({
                        type: 'done',
                        message: (event.data as { message: ApiMessage }).message
                    });
                }
            }
            if (done) break;
        }

        if (!completed) {
            throw new AssistantStreamError(
                'A conexão terminou antes da resposta ser concluída.',
                'incomplete_stream'
            );
        }
    }

    private parseStreamBlock(block: string): { type: string; data: unknown } | null {
        let type = 'message';
        const dataLines: string[] = [];
        for (const line of block.split(/\r?\n/)) {
            if (line.startsWith('event:')) type = line.slice(6).trim();
            if (line.startsWith('data:')) dataLines.push(line.slice(5).trim());
        }
        if (dataLines.length === 0 || type === 'ready') return null;
        try {
            return { type, data: JSON.parse(dataLines.join('\n')) as unknown };
        } catch {
            throw new AssistantStreamError(
                'A API devolveu um evento inválido.',
                'invalid_event'
            );
        }
    }

    private async readErrorResponse(response: Response): Promise<StreamErrorPayload> {
        try {
            return await response.json() as StreamErrorPayload;
        } catch {
            return { message: `Erro HTTP ${response.status}.` };
        }
    }
}
