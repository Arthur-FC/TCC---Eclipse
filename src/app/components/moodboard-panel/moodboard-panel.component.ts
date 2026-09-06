import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Moodboard, MoodboardReferenceInput } from '../../models/moodboard.model';

@Component({ selector: 'app-moodboard-panel', standalone: false, templateUrl: './moodboard-panel.component.html', styleUrls: ['./moodboard-panel.component.scss'] })
export class MoodboardPanelComponent {
    @Input() moodboard: Moodboard | null = null;
    @Input() versions: Moodboard[] = [];
    @Input() busy = false;
    @Input() errorMessage = '';
    @Output() generateRequested = new EventEmitter<void>();
    @Output() versionRequested = new EventEmitter<number>();
    reference(id: string): MoodboardReferenceInput | undefined { return this.moodboard?.referenceInputs.find(ref => ref.id === id); }
    sourceLabel(ref: MoodboardReferenceInput): string { return { youtube: 'YouTube', spotify: 'Spotify', library: 'Acervo próprio', manual: 'Link manual' }[ref.source]; }
    statusLabel(status: MoodboardReferenceInput['dataStatus']): string { return { 'source-metadata': 'Metadados da fonte', 'user-provided': 'Informado pelo usuário', 'mixed-estimates': 'Metadados e estimativas locais' }[status]; }
    selectVersion(value: string): void { const version = Number(value); if (Number.isInteger(version) && version > 0 && version !== this.moodboard?.version) this.versionRequested.emit(version); }
}
