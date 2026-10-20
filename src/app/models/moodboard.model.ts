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
    visualPlan?: MoodboardVisualPlan;
}
export type ReferenceAspect = 'rhythm' | 'texture' | 'instrumentation' | 'structure' | 'voice' | 'atmosphere';
export type VisualSectionField = 'name' | 'bars' | 'durationSeconds' | 'energy' | 'emotionalIntent' | 'instruments' | 'references' | 'productionNotes';
export interface MoodboardVisualSection {
    id: string;
    name: string;
    order: number;
    bars: number | null;
    durationSeconds: number | null;
    energy: number;
    emotionalIntent: string;
    instruments: Array<{ instrument: string; role: string }>;
    references: Array<{ referenceId: string; aspect: ReferenceAspect; note: string }>;
    productionNotes: string;
    source: 'ai' | 'user';
    status: 'suggested' | 'confirmed';
    lockedFields: VisualSectionField[];
}
export interface MoodboardVisualPlan {
    targetDurationSeconds: number | null;
    sections: MoodboardVisualSection[];
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
