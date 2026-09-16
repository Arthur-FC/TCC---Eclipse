export type ReferenceStatus = 'pending' | 'approved' | 'rejected';

export interface MusicReference {
    id: string;
    projectId: string;
    source: 'youtube' | 'spotify' | 'library' | 'manual';
    externalId: string;
    title: string;
    creator: string;
    album: string | null;
    thumbnailUrl: string;
    url: string;
    durationSeconds: number | null;
    embeddable: boolean;
    searchQuery: string;
    status: ReferenceStatus;
    libraryTrackId: string | null;
    description: string;
    score: number | null;
    justification: string | null;
    rankingMethod: string | null;
    justificationModel: string | null;
    duplicateOfId: string | null;
    curatedBriefingVersion: number | null;
    createdAt: string;
    updatedAt: string;
}

export interface ReferenceSearchResponse {
    query: string;
    fromCache: boolean;
    items: MusicReference[];
}

export interface CurationState {
    items: MusicReference[];
    selection: { referenceIds: string[]; confirmedAt: string | null; valid: boolean; briefingVersion: number } | null;
    notices: string[];
}

export type StemSeparationStatus = 'queued' | 'processing' | 'completed' | 'failed';
export type StemType = 'vocals' | 'instrumental' | 'drums' | 'bass' | 'guitar' | 'piano' | 'other';

export interface StemSeparation {
    id: string;
    referenceId: string;
    inputTrackId: string;
    status: StemSeparationStatus;
    progress: number;
    modelName: string;
    modelVersion: string;
    errorMessage: string | null;
    completedAt: string | null;
    stems: Array<{ id: string; type: StemType; sizeBytes: number }>;
    createdAt: string;
    updatedAt: string;
}

export type CurationAction =
    | { type: 'curate' }
    | { type: 'manual'; title: string; creator: string; url: string; description: string }
    | { type: 'library'; trackId: string }
    | { type: 'selection'; referenceIds: string[]; confirm: boolean }
    | { type: 'replace'; referenceId: string; replacementId: string };
