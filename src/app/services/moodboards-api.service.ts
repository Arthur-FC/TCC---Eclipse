import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { Moodboard, MoodboardData } from '../models/moodboard.model';

@Injectable({ providedIn: 'root' })
export class MoodboardsApiService {
    private readonly projectsUrl = `${environment.apiBaseUrl}/projects`;
    constructor(private readonly http: HttpClient) {}
    list(projectId: string): Promise<Moodboard[]> { return firstValueFrom(this.http.get<Moodboard[]>(`${this.projectsUrl}/${projectId}/moodboards`, { withCredentials: true })); }
    getVersion(projectId: string, version: number): Promise<Moodboard> { return firstValueFrom(this.http.get<Moodboard>(`${this.projectsUrl}/${projectId}/moodboards/${version}`, { withCredentials: true })); }
    generate(projectId: string): Promise<Moodboard> { return firstValueFrom(this.http.post<Moodboard>(`${this.projectsUrl}/${projectId}/moodboards/generate`, {}, { withCredentials: true })); }
    saveVisualPlan(projectId: string, version: number, data: MoodboardData): Promise<Moodboard> { return firstValueFrom(this.http.patch<Moodboard>(`${this.projectsUrl}/${projectId}/moodboards/${version}/visual-plan`, { data }, { withCredentials: true })); }
    regenerateSection(projectId: string, version: number, sectionId: string): Promise<Moodboard> { return firstValueFrom(this.http.post<Moodboard>(`${this.projectsUrl}/${projectId}/moodboards/${version}/sections/${encodeURIComponent(sectionId)}/regenerate`, {}, { withCredentials: true })); }
    downloadPdf(projectId: string, version: number): Promise<Blob> { return firstValueFrom(this.http.get(`${this.projectsUrl}/${projectId}/moodboards/${version}/pdf`, { withCredentials: true, responseType: 'blob' })); }
}
