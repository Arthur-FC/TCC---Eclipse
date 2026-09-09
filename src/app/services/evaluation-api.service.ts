import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { ProjectEvaluation, SaveProjectEvaluation } from '../models/evaluation.model';

@Injectable({ providedIn: 'root' })
export class EvaluationApiService {
    constructor(private readonly http: HttpClient) {}
    get(projectId: string): Promise<ProjectEvaluation | null> {
        return firstValueFrom(this.http.get<ProjectEvaluation | null>(`${environment.apiBaseUrl}/projects/${projectId}/evaluation`, { withCredentials: true }));
    }
    save(projectId: string, value: SaveProjectEvaluation): Promise<ProjectEvaluation> {
        return firstValueFrom(this.http.put<ProjectEvaluation>(`${environment.apiBaseUrl}/projects/${projectId}/evaluation`, value, { withCredentials: true }));
    }
}
