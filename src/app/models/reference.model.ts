export type ReferenceStatus = 'pending' | 'approved' | 'rejected';

export interface MusicReference {
    id: string;
    projectId: string;
    source: 'youtube';
    externalId: string;
    title: string;
    creator: string;
    thumbnailUrl: string;
    url: string;
    durationSeconds: number | null;
    embeddable: boolean;
    searchQuery: string;
    status: ReferenceStatus;
    createdAt: string;
    updatedAt: string;
}

export interface ReferenceSearchResponse {
    query: string;
    fromCache: boolean;
    items: MusicReference[];
}
