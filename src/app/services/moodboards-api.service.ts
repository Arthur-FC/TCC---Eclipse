import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { Moodboard } from '../models/moodboard.model';

@Injectable({ providedIn: 'root' })
export class MoodboardsApiService {
    private readonly projectsUrl = `${environment.apiBaseUrl}/projects`;
    constructor(private readonly http: HttpClient) {}
    list(projectId: string): Promise<Moodboard[]> { return firstValueFrom(this.http.get<Moodboard[]>(`${this.projectsUrl}/${projectId}/moodboards`, { withCredentials: true })); }
    getVersion(projectId: string, version: number): Promise<Moodboard> { return firstValueFrom(this.http.get<Moodboard>(`${this.projectsUrl}/${projectId}/moodboards/${version}`, { withCredentials: true })); }
    generate(projectId: string): Promise<Moodboard> { return firstValueFrom(this.http.post<Moodboard>(`${this.projectsUrl}/${projectId}/moodboards/generate`, {}, { withCredentials: true })); }
}
