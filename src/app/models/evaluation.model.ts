export interface ProjectEvaluation {
    id: string;
    projectId: string;
    referenceRelevance: number;
    moodboardUtility: number;
    reuseIntent: number;
    comments: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface SaveProjectEvaluation {
    referenceRelevance: number;
    moodboardUtility: number;
    reuseIntent: number;
    comments?: string;
}
