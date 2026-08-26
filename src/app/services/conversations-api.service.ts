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

    createMessage(
        projectId: string,
        conversationId: string,
        content: string
    ): Promise<ApiMessage> {
        return firstValueFrom(
            this.http.post<ApiMessage>(
                `${this.projectsUrl}/${projectId}/conversations/${conversationId}/messages`,
                { role: 'user', content },
                { withCredentials: true }
            )
        );
    }
}
