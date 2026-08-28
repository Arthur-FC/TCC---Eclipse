export type BriefingStatus = 'draft' | 'confirmed';

export interface BriefingData {
    objective: string | null;
    theme: string | null;
    narrative: string | null;
    emotions: string[];
    genres: string[];
    mood: string[];
    instrumentation: string[];
    tempo: string | null;
    targetAudience: string | null;
    references: string[];
    constraints: string[];
    additionalNotes: string | null;
    missingFields: string[];
    uncertainties: string[];
    followUpQuestions: string[];
}

export interface Briefing {
    id: string;
    projectId: string;
    sourceConversationId: string | null;
    version: number;
    status: BriefingStatus;
    data: BriefingData;
    aiProvider: string | null;
    aiModel: string | null;
    confirmedAt: string | null;
    createdAt: string;
}
