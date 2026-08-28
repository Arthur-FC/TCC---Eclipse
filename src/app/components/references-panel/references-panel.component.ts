import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MusicReference, ReferenceStatus } from '../../models/reference.model';

@Component({
    selector: 'app-references-panel',
    standalone: false,
    templateUrl: './references-panel.component.html',
    styleUrls: ['./references-panel.component.scss']
})
export class ReferencesPanelComponent {
    @Input() references: MusicReference[] = [];
    @Input() busy = false;
    @Input() errorMessage = '';
    @Input() searchQuery = '';
    @Input() fromCache = false;
    @Output() searchRequested = new EventEmitter<boolean>();
    @Output() spotifyAddRequested = new EventEmitter<string>();
    @Output() statusChanged = new EventEmitter<{
        referenceId: string;
        status: ReferenceStatus;
    }>();
    spotifyUrl = '';

    formatDuration(seconds: number | null): string {
        if (seconds === null) return 'Duração não informada';
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const remaining = seconds % 60;
        return hours > 0
            ? `${hours}:${String(minutes).padStart(2, '0')}:${String(remaining).padStart(2, '0')}`
            : `${minutes}:${String(remaining).padStart(2, '0')}`;
    }

    decide(referenceId: string, status: ReferenceStatus): void {
        if (!this.busy) this.statusChanged.emit({ referenceId, status });
    }

    requestSearch(): void {
        if (!this.busy) this.searchRequested.emit(!!this.searchQuery);
    }

    addSpotify(): void {
        const url = this.spotifyUrl.trim();
        if (url && !this.busy) this.spotifyAddRequested.emit(url);
    }

    sourceLabel(reference: MusicReference): string {
        return reference.source === 'spotify' ? 'Spotify' : 'YouTube';
    }

    trackReference(_index: number, reference: MusicReference): string {
        return reference.id;
    }
}
