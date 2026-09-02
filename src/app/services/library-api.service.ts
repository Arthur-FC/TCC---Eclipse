import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import {
    LibraryTrack,
    LibrarySearchQuery,
    LibrarySearchResponse,
    TrackUploadRequest,
    TrackUploadReservation
} from '../models/library-track.model';

@Injectable({ providedIn: 'root' })
export class LibraryApiService {
    private readonly tracksUrl = `${environment.apiBaseUrl}/library/tracks`;

    constructor(private readonly http: HttpClient) {}

    list(): Promise<LibraryTrack[]> {
        return firstValueFrom(
            this.http.get<LibraryTrack[]>(this.tracksUrl, {
                withCredentials: true
            })
        );
    }

    search(query: LibrarySearchQuery): Promise<LibrarySearchResponse> {
        const params: Record<string, string> = { q: query.q };
        if (query.bpmMin !== undefined) params['bpmMin'] = String(query.bpmMin);
        if (query.bpmMax !== undefined) params['bpmMax'] = String(query.bpmMax);
        if (query.genre) params['genre'] = query.genre;
        if (query.instrument) params['instrument'] = query.instrument;
        return firstValueFrom(this.http.get<LibrarySearchResponse>(
            `${this.tracksUrl}/search`, { params, withCredentials: true }
        ));
    }

    async upload(request: TrackUploadRequest): Promise<LibraryTrack> {
        const contentType = this.contentType(request.file);
        const reservation = await firstValueFrom(
            this.http.post<TrackUploadReservation>(
                `${this.tracksUrl}/uploads`,
                {
                    filename: request.file.name,
                    contentType,
                    sizeBytes: request.file.size,
                    title: request.title,
                    artist: request.artist || undefined,
                    notes: request.notes || undefined
                },
                { withCredentials: true }
            )
        );
        const response = await fetch(reservation.uploadUrl, {
            method: reservation.uploadMethod,
            headers: reservation.requiredHeaders,
            body: request.file
        });
        if (!response.ok) {
            throw new Error(
                'O armazenamento recusou o arquivo. Verifique se o MinIO está ligado.'
            );
        }
        return firstValueFrom(
            this.http.post<LibraryTrack>(
                `${this.tracksUrl}/${reservation.track.id}/complete`,
                {},
                { withCredentials: true }
            )
        );
    }

    playback(trackId: string): Promise<{ url: string; expiresInSeconds: number }> {
        return firstValueFrom(
            this.http.get<{ url: string; expiresInSeconds: number }>(
                `${this.tracksUrl}/${trackId}/playback`,
                { withCredentials: true }
            )
        );
    }

    reprocess(trackId: string): Promise<LibraryTrack> {
        return firstValueFrom(
            this.http.post<LibraryTrack>(
                `${this.tracksUrl}/${trackId}/analyze`,
                {},
                { withCredentials: true }
            )
        );
    }

    remove(trackId: string): Promise<void> {
        return firstValueFrom(
            this.http.delete<void>(`${this.tracksUrl}/${trackId}`, {
                withCredentials: true
            })
        );
    }

    private contentType(file: File): string {
        const extension = file.name.split('.').at(-1)?.toLocaleLowerCase();
        if (extension === 'mp3') return 'audio/mpeg';
        if (extension === 'wav') return 'audio/wav';
        return file.type;
    }
}
