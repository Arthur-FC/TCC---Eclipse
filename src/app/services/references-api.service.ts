import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import {
    MusicReference,
    CurationAction,
    CurationState,
    ReferenceSearchResponse,
    ReferenceStatus,
    StemSeparation
} from '../models/reference.model';

@Injectable({ providedIn: 'root' })
export class ReferencesApiService {
    private readonly projectsUrl = `${environment.apiBaseUrl}/projects`;

    constructor(private readonly http: HttpClient) {}

    curation(projectId: string): Promise<CurationState> {
        return firstValueFrom(this.http.get<CurationState>(`${this.projectsUrl}/${projectId}/references/curation`, { withCredentials: true }));
    }

    curateAction(projectId: string, action: CurationAction): Promise<CurationState> {
        const base = `${this.projectsUrl}/${projectId}/references`;
        const { type, ...body } = action;
        if (action.type === 'selection') {
            return firstValueFrom(this.http.put<CurationState>(`${base}/selection`, body, { withCredentials: true }));
        }
        const path = action.type === 'replace' ? `${action.referenceId}/replace` : action.type === 'curate' ? 'curation' : type;
        const payload = action.type === 'replace' ? { replacementId: action.replacementId } : body;
        return firstValueFrom(this.http.post<CurationState>(`${base}/${path}`, payload, { withCredentials: true }));
    }

    list(projectId: string): Promise<MusicReference[]> {
        return firstValueFrom(
            this.http.get<MusicReference[]>(
                `${this.projectsUrl}/${projectId}/references`,
                { withCredentials: true }
            )
        );
    }

    searchYouTube(projectId: string, refresh = false): Promise<ReferenceSearchResponse> {
        return firstValueFrom(
            this.http.post<ReferenceSearchResponse>(
                `${this.projectsUrl}/${projectId}/references/youtube/search`,
                { refresh },
                { withCredentials: true }
            )
        );
    }

    addSpotify(projectId: string, url: string): Promise<MusicReference> {
        return firstValueFrom(
            this.http.post<MusicReference>(
                `${this.projectsUrl}/${projectId}/references/spotify`,
                { url },
                { withCredentials: true }
            )
        );
    }

    updateStatus(
        projectId: string,
        referenceId: string,
        status: ReferenceStatus
    ): Promise<MusicReference> {
        return firstValueFrom(
            this.http.patch<MusicReference>(
                `${this.projectsUrl}/${projectId}/references/${referenceId}`,
                { status },
                { withCredentials: true }
            )
        );
    }

    listSeparations(projectId: string): Promise<StemSeparation[]> {
        return firstValueFrom(this.http.get<StemSeparation[]>(
            `${this.projectsUrl}/${projectId}/references/separations`,
            { withCredentials: true }
        ));
    }

    startSeparation(projectId: string, referenceId: string, libraryTrackId?: string): Promise<StemSeparation> {
        return firstValueFrom(this.http.post<StemSeparation>(
            `${this.projectsUrl}/${projectId}/references/${referenceId}/separation`,
            libraryTrackId ? { libraryTrackId } : {},
            { withCredentials: true }
        ));
    }

    stemUrl(projectId: string, referenceId: string, stemId: string, download = false): Promise<{ url: string; expiresInSeconds: number }> {
        return firstValueFrom(this.http.get<{ url: string; expiresInSeconds: number }>(
            `${this.projectsUrl}/${projectId}/references/${referenceId}/stems/${stemId}/url`,
            { params: download ? { download: 'true' } : {}, withCredentials: true }
        ));
    }

    downloadInstrumentArchive(projectId: string, referenceId: string): Promise<Blob> {
        return firstValueFrom(this.http.get(
            `${this.projectsUrl}/${projectId}/references/${referenceId}/instruments.zip`,
            { responseType: 'blob', withCredentials: true }
        ));
    }
}
