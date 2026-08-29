export type LibraryTrackStatus = 'pending' | 'ready' | 'failed';

export interface LibraryTrack {
    id: string;
    title: string;
    artist: string | null;
    notes: string | null;
    originalFilename: string;
    contentType: string;
    sizeBytes: number;
    status: LibraryTrackStatus;
    errorMessage: string | null;
    uploadedAt: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface TrackUploadRequest {
    file: File;
    title: string;
    artist: string;
    notes: string;
}

export interface TrackUploadReservation {
    track: LibraryTrack;
    uploadUrl: string;
    uploadMethod: 'PUT';
    requiredHeaders: { 'Content-Type': string };
    expiresInSeconds: number;
}
