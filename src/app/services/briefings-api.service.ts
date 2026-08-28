import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { Briefing, BriefingData } from '../models/briefing.model';

@Injectable({ providedIn: 'root' })
export class BriefingsApiService {
    private readonly projectsUrl = `${environment.apiBaseUrl}/projects`;

    constructor(private readonly http: HttpClient) {}

    getLatest(projectId: string): Promise<Briefing> {
        return firstValueFrom(
            this.http.get<Briefing>(
                `${this.projectsUrl}/${projectId}/briefings/latest`,
                { withCredentials: true }
            )
        );
    }

    generate(projectId: string, conversationId: string): Promise<Briefing> {
        return firstValueFrom(
            this.http.post<Briefing>(
                `${this.projectsUrl}/${projectId}/briefings/generate`,
                { conversationId },
                { withCredentials: true }
            )
        );
    }

    update(projectId: string, version: number, data: BriefingData): Promise<Briefing> {
        return firstValueFrom(
            this.http.put<Briefing>(
                `${this.projectsUrl}/${projectId}/briefings/${version}`,
                { data },
                { withCredentials: true }
            )
        );
    }

    confirm(projectId: string, version: number): Promise<Briefing> {
        return firstValueFrom(
            this.http.post<Briefing>(
                `${this.projectsUrl}/${projectId}/briefings/${version}/confirm`,
                {},
                { withCredentials: true }
            )
        );
    }
}
