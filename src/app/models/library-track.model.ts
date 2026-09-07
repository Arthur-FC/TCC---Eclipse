export type LibraryTrackStatus = 'pending' | 'ready' | 'failed';
export type AudioAnalysisStatus = 'none' | 'queued' | 'processing' | 'completed' | 'failed';

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
    analysisStatus: AudioAnalysisStatus;
    analysisProgress: number;
    analysisError: string | null;
    analyzedAt: string | null;
    analysisVersion: string | null;
    analysisMethod: string | null;
    detectedFormat: string | null;
    codec: string | null;
    durationSeconds: number | null;
    sampleRateHz: number | null;
    channels: number | null;
    bitrateBps: number | null;
    estimatedBpm: number | null;
    bpmConfidence: number | null;
    estimatedKey: string | null;
    keyConfidence: number | null;
    genreTags: string[];
    moodTags: string[];
    instrumentTags: string[];
    sourceProjectId: string | null;
    sourceProjectTitle: string | null;
    workVersion: number | null;
    completedAt: string | null;
    creativeOrigin: {
        project: { id: string; title: string };
        briefing: { id: string; version: number; data: unknown; confirmedAt: string | null };
        moodboard: { id: string; version: number; data: unknown; createdAt: string };
        references: unknown[];
        searchText: string;
    } | null;
    createdAt: string;
    updatedAt: string;
}

export interface TrackUploadRequest {
    file: File;
    title: string;
    artist: string;
    notes: string;
    finalWorkProjectId?: string;
}

export interface TrackUploadReservation {
    track: LibraryTrack;
    uploadUrl: string;
    uploadMethod: 'PUT';
    requiredHeaders: { 'Content-Type': string };
    expiresInSeconds: number;
}

export interface LibrarySearchQuery {
    q: string;
    bpmMin?: number;
    bpmMax?: number;
    genre?: string;
    instrument?: string;
}

export interface LibrarySearchResult extends LibraryTrack {
    matchScore: number;
}

export interface LibrarySearchResponse {
    query: string;
    mode: 'semantic' | 'metadata';
    notice: string | null;
    results: LibrarySearchResult[];
}
