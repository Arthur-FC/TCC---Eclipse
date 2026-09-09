import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { Moodboard, MoodboardReferenceInput } from '../../models/moodboard.model';
import { ProjectEvaluation, SaveProjectEvaluation } from '../../models/evaluation.model';

@Component({ selector: 'app-moodboard-panel', standalone: false, templateUrl: './moodboard-panel.component.html', styleUrls: ['./moodboard-panel.component.scss'] })
export class MoodboardPanelComponent implements OnChanges {
    @Input() moodboard: Moodboard | null = null;
    @Input() versions: Moodboard[] = [];
    @Input() busy = false;
    @Input() errorMessage = '';
    @Input() evaluation: ProjectEvaluation | null = null;
    @Input() evaluationBusy = false;
    @Output() generateRequested = new EventEmitter<void>();
    @Output() versionRequested = new EventEmitter<number>();
    @Output() pdfRequested = new EventEmitter<void>();
    @Output() evaluationSaved = new EventEmitter<SaveProjectEvaluation>();
    evaluationDraft: SaveProjectEvaluation = { referenceRelevance: 0, moodboardUtility: 0, reuseIntent: 0, comments: '' };
    readonly scores = [1, 2, 3, 4, 5];
    ngOnChanges(changes: SimpleChanges): void {
        if (changes['evaluation']) {
            this.evaluationDraft = this.evaluation
                ? { referenceRelevance: this.evaluation.referenceRelevance, moodboardUtility: this.evaluation.moodboardUtility, reuseIntent: this.evaluation.reuseIntent, comments: this.evaluation.comments ?? '' }
                : { referenceRelevance: 0, moodboardUtility: 0, reuseIntent: 0, comments: '' };
        }
    }
    get evaluationValid(): boolean {
        return [this.evaluationDraft.referenceRelevance, this.evaluationDraft.moodboardUtility, this.evaluationDraft.reuseIntent]
            .every(value => Number.isInteger(value) && value >= 1 && value <= 5);
    }
    reference(id: string): MoodboardReferenceInput | undefined { return this.moodboard?.referenceInputs.find(ref => ref.id === id); }
    sourceLabel(ref: MoodboardReferenceInput): string { return { youtube: 'YouTube', spotify: 'Spotify', library: 'Acervo próprio', manual: 'Link manual' }[ref.source]; }
    statusLabel(status: MoodboardReferenceInput['dataStatus']): string { return { 'source-metadata': 'Metadados da fonte', 'user-provided': 'Informado pelo usuário', 'mixed-estimates': 'Metadados e estimativas locais' }[status]; }
    selectVersion(value: string): void { const version = Number(value); if (Number.isInteger(version) && version > 0 && version !== this.moodboard?.version) this.versionRequested.emit(version); }
}
