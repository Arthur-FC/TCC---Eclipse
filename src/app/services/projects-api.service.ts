import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

export interface ApiProject {
    id: string;
    ownerId: string;
    title: string;
    description: string | null;
    archivedAt: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface PaginatedResponse<T> {
    items: T[];
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

@Injectable({ providedIn: 'root' })
export class ProjectsApiService {
    private readonly projectsUrl = `${environment.apiBaseUrl}/projects`;

    constructor(private readonly http: HttpClient) {}

    list(): Promise<PaginatedResponse<ApiProject>> {
        return firstValueFrom(
            this.http.get<PaginatedResponse<ApiProject>>(
                `${this.projectsUrl}?page=1&limit=100`,
                { withCredentials: true }
            )
        );
    }

    create(title: string, description?: string): Promise<ApiProject> {
        return firstValueFrom(
            this.http.post<ApiProject>(
                this.projectsUrl,
                { title, ...(description ? { description } : {}) },
                { withCredentials: true }
            )
        );
    }

    update(projectId: string, title: string): Promise<ApiProject> {
        return firstValueFrom(
            this.http.patch<ApiProject>(
                `${this.projectsUrl}/${projectId}`,
                { title },
                { withCredentials: true }
            )
        );
    }

    async archive(projectId: string): Promise<void> {
        await firstValueFrom(
            this.http.delete<void>(`${this.projectsUrl}/${projectId}`, {
                withCredentials: true
            })
        );
    }
}
