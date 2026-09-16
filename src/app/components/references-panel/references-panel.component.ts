import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CurationAction, CurationState, MusicReference, ReferenceStatus, StemSeparation, StemType } from '../../models/reference.model';
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
    @Input() separations: StemSeparation[] = [];
    @Input() separationBusyIds: ReadonlySet<string> = new Set();
    @Input() stemPlaybackUrls: Record<string, string> = {};
    @Output() curationRequested = new EventEmitter<CurationAction>();
    @Output() playbackRequested = new EventEmitter<string>();
    @Output() playbackStopped = new EventEmitter<void>();
    @Output() searchRequested = new EventEmitter<boolean>();
    @Output() spotifyAddRequested = new EventEmitter<string>();
    @Output() statusChanged = new EventEmitter<{
        referenceId: string;
        status: ReferenceStatus;
    }>();
    @Output() separationRequested = new EventEmitter<{ referenceId: string; libraryTrackId?: string }>();
    @Output() separationUploadRequested = new EventEmitter<{ referenceId: string; file: File }>();
    @Output() stemUrlRequested = new EventEmitter<{ referenceId: string; stemId: string; download: boolean }>();
    @Output() allStemsDownloadRequested = new EventEmitter<{ referenceId: string }>();
    spotifyUrl = '';
    manualTitle = '';
    manualCreator = '';
    manualUrl = '';
    manualDescription = '';
    libraryTrackId = '';
    showDuplicates = false;
    activeReferenceSection: ReferenceStatus = 'pending';
    separationTrackIds: Record<string, string> = {};
    separationFiles: Record<string, File | null> = {};
    separationConsents: Record<string, boolean> = {};

    get readyTracks(): LibraryTrack[] { return this.libraryTracks.filter(track => track.status === 'ready'); }
    get visibleReferences(): MusicReference[] {
        return this.references.filter(ref => this.showDuplicates || !ref.duplicateOfId || ref.status === 'approved');
    }
    get pendingReferences(): MusicReference[] { return this.visibleReferences.filter(ref => ref.status === 'pending'); }
    get approvedReferences(): MusicReference[] { return this.orderedApproved; }
    get rejectedReferences(): MusicReference[] { return this.visibleReferences.filter(ref => ref.status === 'rejected'); }
    get activeReferences(): MusicReference[] {
        return this.activeReferenceSection === 'approved'
            ? this.approvedReferences
            : this.activeReferenceSection === 'rejected'
                ? this.rejectedReferences
                : this.pendingReferences;
    }
    get activeSectionTitle(): string {
        return { pending: 'Pendentes', approved: 'Aprovadas', rejected: 'Rejeitadas' }[this.activeReferenceSection];
    }
    get activeSectionEmptyMessage(): string {
        return { pending: 'Nenhuma música pendente.', approved: 'Nenhuma música aprovada.', rejected: 'Nenhuma música rejeitada.' }[this.activeReferenceSection];
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
    separationFor(referenceId: string): StemSeparation | undefined { return this.separations.find(item => item.referenceId === referenceId); }
    isSeparationBusy(referenceId: string): boolean {
        const status = this.separationFor(referenceId)?.status;
        return this.separationBusyIds.has(referenceId) || status === 'queued' || status === 'processing';
    }
    stemFor(separation: StemSeparation, type: StemType) { return separation.stems.find(stem => stem.type === type); }
    hasSeparatedInstruments(separation: StemSeparation): boolean {
        return ['drums', 'bass', 'guitar', 'piano', 'other'].every(type => separation.stems.some(stem => stem.type === type));
    }
    downloadAllInstruments(referenceId: string): void { this.allStemsDownloadRequested.emit({ referenceId }); }
    chooseSeparationFile(referenceId: string, event: Event): void {
        this.separationFiles[referenceId] = (event.target as HTMLInputElement).files?.[0] ?? null;
    }
    startSeparation(reference: MusicReference): void {
        if (this.isSeparationBusy(reference.id)) return;
        if (reference.libraryTrackId) {
            this.separationRequested.emit({ referenceId: reference.id });
            return;
        }
        const file = this.separationFiles[reference.id];
        if (file && this.separationConsents[reference.id]) {
            this.separationUploadRequested.emit({ referenceId: reference.id, file });
            return;
        }
        const trackId = this.separationTrackIds[reference.id];
        if (trackId) this.separationRequested.emit({ referenceId: reference.id, libraryTrackId: trackId });
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
