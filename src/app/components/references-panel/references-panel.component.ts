import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CurationAction, CurationState, MusicReference, ReferenceStatus } from '../../models/reference.model';
import { LibraryTrack } from '../../models/library-track.model';

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
    @Input() curationState: CurationState | null = null;
    @Input() libraryTracks: LibraryTrack[] = [];
    @Input() playbackTrackId: string | null = null;
    @Input() playbackUrl = '';
    @Output() curationRequested = new EventEmitter<CurationAction>();
    @Output() playbackRequested = new EventEmitter<string>();
    @Output() playbackStopped = new EventEmitter<void>();
    @Output() searchRequested = new EventEmitter<boolean>();
    @Output() spotifyAddRequested = new EventEmitter<string>();
    @Output() statusChanged = new EventEmitter<{
        referenceId: string;
        status: ReferenceStatus;
    }>();
    spotifyUrl = '';
    manualTitle = '';
    manualCreator = '';
    manualUrl = '';
    manualDescription = '';
    libraryTrackId = '';
    showDuplicates = false;
    replacingId: string | null = null;
    replacementId = '';

    get readyTracks(): LibraryTrack[] { return this.libraryTracks.filter(track => track.status === 'ready'); }
    get visibleReferences(): MusicReference[] {
        return this.references.filter(ref => this.showDuplicates || !ref.duplicateOfId || ref.status === 'approved');
    }
    get duplicateCount(): number { return this.references.filter(ref => ref.duplicateOfId).length; }
    get orderedApproved(): MusicReference[] {
        const approved = this.references.filter(ref => ref.status === 'approved');
        const ids = this.curationState?.selection?.referenceIds ?? [];
        return [...approved].sort((a,b) => {
            const first = ids.indexOf(a.id), second = ids.indexOf(b.id);
            return (first < 0 ? ids.length : first) - (second < 0 ? ids.length : second);
        });
    }
    get replacements(): MusicReference[] {
        return this.references.filter(ref => ref.id !== this.replacingId && ref.status !== 'approved' && (ref.source !== 'library' || ref.libraryTrackId));
    }
    requestCuration(): void { if (!this.busy) this.curationRequested.emit({ type: 'curate' }); }
    addManual(): void {
        if (this.busy || !this.manualTitle.trim() || !this.manualUrl.trim()) return;
        this.curationRequested.emit({ type: 'manual', title: this.manualTitle.trim(), creator: this.manualCreator.trim(), url: this.manualUrl.trim(), description: this.manualDescription.trim() });
    }
    addLibrary(): void {
        if (!this.busy && this.libraryTrackId) this.curationRequested.emit({ type: 'library', trackId: this.libraryTrackId });
    }
    saveSelection(confirm: boolean): void {
        if (!this.busy) this.curationRequested.emit({ type: 'selection', referenceIds: this.orderedApproved.map(ref => ref.id), confirm });
    }
    moveSelection(index: number, direction: number): void {
        const ids = this.orderedApproved.map(ref => ref.id);
        const next = index + direction;
        if (this.busy || next < 0 || next >= ids.length) return;
        [ids[index], ids[next]] = [ids[next], ids[index]];
        this.curationRequested.emit({ type: 'selection', referenceIds: ids, confirm: false });
    }
    replace(): void {
        if (this.busy || !this.replacingId || !this.replacementId) return;
        this.curationRequested.emit({ type: 'replace', referenceId: this.replacingId, replacementId: this.replacementId });
        this.replacingId = null;
        this.replacementId = '';
    }

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
        return { spotify: 'Spotify', youtube: 'YouTube', library: 'Acervo próprio', manual: 'Link manual' }[reference.source];
    }

    trackReference(_index: number, reference: MusicReference): string {
        return reference.id;
    }
}
