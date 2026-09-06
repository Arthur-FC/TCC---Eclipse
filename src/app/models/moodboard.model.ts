export interface MoodboardData {
    title: string;
    creativeDirection: string;
    emotionalPalette: Array<{ label: string; description: string }>;
    instrumentation: Array<{ instrument: string; role: string }>;
    structure: Array<{ section: string; goal: string; energy: string }>;
    production: Array<{ area: string; suggestion: string }>;
    roadmap: Array<{ order: number; title: string; action: string; deliverable: string }>;
    referenceApplications: Array<{ referenceId: string; application: string }>;
    constraints: string[];
}
export interface MoodboardReferenceInput {
    id: string;
    title: string;
    creator: string;
    source: 'youtube' | 'spotify' | 'library' | 'manual';
    durationSeconds: number | null;
    description: string;
    url?: string | null;
    dataStatus: 'source-metadata' | 'user-provided' | 'mixed-estimates';
}
export interface Moodboard {
    id: string;
    projectId: string;
    version: number;
    data: MoodboardData;
    briefingVersion: number;
    referenceIds: string[];
    aiProvider: string;
    aiModel: string;
    createdAt: string;
    current: boolean;
    referenceInputs: MoodboardReferenceInput[];
}
