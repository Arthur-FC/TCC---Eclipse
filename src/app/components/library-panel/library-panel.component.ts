import { Component, EventEmitter, Input, Output } from '@angular/core';
import {
    LibraryTrack,
    LibrarySearchQuery,
    LibrarySearchResponse,
    AnalysisEvidenceOrigin,
    TrackTagCorrectionRequest,
    TrackUploadRequest
} from '../../models/library-track.model';

type LibrarySortMode = 'date-desc' | 'date-asc' | 'name-asc' | 'name-desc';

@Component({
    selector: 'app-library-panel',
    standalone: false,
    templateUrl: './library-panel.component.html',
    styleUrls: ['./library-panel.component.scss']
})
export class LibraryPanelComponent {
    @Input() tracks: LibraryTrack[] = [];
    @Input() busy = false;
    @Input() errorMessage = '';
    @Input() playbackTrackId: string | null = null;
    @Input() playbackUrl = '';
    @Input() searchResponse: LibrarySearchResponse | null = null;
    @Input() searchBusy = false;
    @Input() projectId: string | null = null;
    @Input() projectTitle = '';
    @Output() uploadRequested = new EventEmitter<TrackUploadRequest>();
    @Output() playbackRequested = new EventEmitter<string>();
    @Output() playbackStopped = new EventEmitter<void>();
    @Output() reprocessRequested = new EventEmitter<string>();
    @Output() tagsCorrected = new EventEmitter<TrackTagCorrectionRequest>();
    @Output() deleteRequested = new EventEmitter<string>();
    @Output() searchRequested = new EventEmitter<LibrarySearchQuery>();
    @Output() searchCleared = new EventEmitter<void>();

    selectedFile: File | null = null;
    draggingFile = false;
    sortMode: LibrarySortMode = 'date-desc';
    title = '';
    artist = '';
    notes = '';
    registerAsFinalWork = false;
    processingConsentAccepted = false;
    searchQuery = '';
    searchBpmMin: number | null = null;
    searchBpmMax: number | null = null;
    searchGenre = '';
    searchInstrument = '';
    searchFiltersOpen = false;
    readonly expandedAnalysisIds = new Set<string>();
    readonly tagDrafts: Record<string, { genre: string; mood: string; instrument: string }> = {};

    private dragDepth = 0;
    private readonly dateFormatter = new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
    private readonly titleCollator = new Intl.Collator('pt-BR', {
        sensitivity: 'base',
        numeric: true
    });

    get sortedTracks(): LibraryTrack[] {
        const tracks = [...(this.searchResponse?.results ?? this.tracks)];
        if (this.sortMode === 'name-asc' || this.sortMode === 'name-desc') {
            const direction = this.sortMode === 'name-asc' ? 1 : -1;
            return tracks.sort((first, second) =>
                this.titleCollator.compare(first.title, second.title) * direction
            );
        }

        const direction = this.sortMode === 'date-desc' ? -1 : 1;
        return tracks.sort((first, second) =>
            (this.timestamp(first.createdAt) - this.timestamp(second.createdAt)) * direction
        );
    }

    search(): void {
        const q = this.searchQuery.trim();
        if (q.length < 2 || this.searchBusy) return;
        this.searchRequested.emit({
            q,
            bpmMin: this.searchBpmMin ?? undefined,
            bpmMax: this.searchBpmMax ?? undefined,
            genre: this.searchGenre.trim() || undefined,
            instrument: this.searchInstrument.trim() || undefined
        });
    }

    clearSearch(): void {
        this.searchQuery = '';
        this.searchBpmMin = null;
        this.searchBpmMax = null;
        this.searchGenre = '';
        this.searchInstrument = '';
        this.searchCleared.emit();
    }

    matchPercentage(track: LibraryTrack): number | null {
        const score = (track as LibraryTrack & { matchScore?: number }).matchScore;
        return typeof score === 'number' ? Math.round(score * 100) : null;
    }

    resultEvidenceLabel(track: LibraryTrack): string {
        const result = track as LibraryTrack & { evidenceLimited?: boolean };
        return result.evidenceLimited ? 'Evidência textual limitada' : 'Correspondência textual';
    }

    confidenceLabel(value: number | null): string {
        if (value === null || !Number.isFinite(value)) return 'confiança não disponível';
        return `${Math.round(value * 100)}% de confiança`;
    }

    originLabel(origin: AnalysisEvidenceOrigin | undefined): string {
        return ({
            'user-provided': 'Informado pelo usuário',
            'embedded-file-metadata': 'Metadado incorporado no arquivo',
            'platform-metadata': 'Metadado da plataforma',
            'local-technical-estimate': 'Estimativa técnica local',
            'text-ai-inference': 'Inferência de IA sobre texto',
            'direct-audio-analysis': 'Análise direta do áudio'
        } as Record<string, string>)[origin ?? ''] ?? 'Origem não registrada';
    }

    effectiveTags(track: LibraryTrack, kind: 'genre' | 'mood' | 'instrument'): string[] {
        const user = kind === 'genre' ? track.userGenreTags : kind === 'mood' ? track.userMoodTags : track.userInstrumentTags;
        if (user.length) return user;
        return kind === 'genre' ? track.genreTags : kind === 'mood' ? track.moodTags : track.instrumentTags;
    }

    tagEvidenceLabel(track: LibraryTrack, kind: 'genre' | 'mood' | 'instrument', tag: string): string {
        const userTags = kind === 'genre' ? track.userGenreTags : kind === 'mood' ? track.userMoodTags : track.userInstrumentTags;
        if (userTags.some((item) => item.toLocaleLowerCase('pt-BR') === tag.toLocaleLowerCase('pt-BR'))) {
            return 'Corrigido pelo usuário';
        }
        const evidence = kind === 'genre'
            ? track.analysisEvidence?.genreTags
            : kind === 'mood'
                ? track.analysisEvidence?.moodTags
                : track.analysisEvidence?.instrumentTags;
        const item = evidence?.find((entry) => entry.value === tag);
        return `${this.originLabel(item?.origin)}${item?.confidence === null || item?.confidence === undefined ? '' : ` · ${this.confidenceLabel(item.confidence)}`}`;
    }

    editTags(track: LibraryTrack): void {
        this.tagDrafts[track.id] = {
            genre: this.effectiveTags(track, 'genre').join(', '),
            mood: this.effectiveTags(track, 'mood').join(', '),
            instrument: this.effectiveTags(track, 'instrument').join(', ')
        };
    }

    cancelTagEdit(trackId: string): void {
        delete this.tagDrafts[trackId];
    }

    saveTags(trackId: string): void {
        const draft = this.tagDrafts[trackId];
        if (!draft || this.busy) return;
        this.tagsCorrected.emit({
            trackId,
            genreTags: this.parseTags(draft.genre),
            moodTags: this.parseTags(draft.mood),
            instrumentTags: this.parseTags(draft.instrument)
        });
        delete this.tagDrafts[trackId];
    }

    selectFile(event: Event): void {
        const input = event.target as HTMLInputElement;
        this.useFile(input.files?.[0] ?? null);
    }

    dragEnter(event: DragEvent): void {
        event.preventDefault();
        if (this.busy) return;
        this.dragDepth += 1;
        this.draggingFile = true;
    }

    dragOver(event: DragEvent): void {
        event.preventDefault();
        if (event.dataTransfer) {
            event.dataTransfer.dropEffect = this.busy ? 'none' : 'copy';
        }
    }

    dragLeave(event: DragEvent): void {
        event.preventDefault();
        if (this.busy) return;
        this.dragDepth = Math.max(0, this.dragDepth - 1);
        if (this.dragDepth === 0) this.draggingFile = false;
    }

    dropFile(event: DragEvent): void {
        event.preventDefault();
        this.dragDepth = 0;
        this.draggingFile = false;
        if (this.busy) return;
        this.useFile(event.dataTransfer?.files.item(0) ?? null);
    }

    clearFile(event: Event): void {
        event.preventDefault();
        event.stopPropagation();
        this.selectedFile = null;
    }

    private useFile(file: File | null): void {
        this.selectedFile = file;
        if (this.selectedFile && !this.title.trim()) {
            this.title = this.selectedFile.name.replace(/\.[^.]+$/, '');
        }
    }

    upload(): void {
        if (!this.selectedFile || !this.title.trim() || !this.processingConsentAccepted || this.busy) return;
        this.uploadRequested.emit({
            file: this.selectedFile,
            title: this.title.trim(),
            artist: this.artist.trim(),
            notes: this.notes.trim(),
            finalWorkProjectId: this.registerAsFinalWork
                ? this.projectId ?? undefined
                : undefined,
            processingConsent: true
        });
    }

    confirmDelete(track: LibraryTrack): void {
        if (
            !this.busy &&
            window.confirm(`Excluir "${track.title}" permanentemente do acervo?`)
        ) {
            this.deleteRequested.emit(track.id);
        }
    }

    formatSize(bytes: number): string {
        return bytes >= 1_048_576
            ? `${(bytes / 1_048_576).toFixed(1)} MB`
            : `${Math.ceil(bytes / 1_024)} KB`;
    }

    formatAddedDate(value: string): string {
        const date = new Date(value);
        return Number.isNaN(date.getTime())
            ? 'Data não disponível'
            : `Adicionado em ${this.dateFormatter.format(date)}`;
    }

    formatDuration(seconds: number | null): string {
        if (seconds === null || !Number.isFinite(seconds)) return '—';
        const rounded = Math.max(0, Math.round(seconds));
        const minutes = Math.floor(rounded / 60);
        return `${minutes}:${String(rounded % 60).padStart(2, '0')}`;
    }

    formatBitrate(bitsPerSecond: number | null): string {
        return bitsPerSecond ? `${Math.round(bitsPerSecond / 1000)} kbps` : '—';
    }

    analysisLabel(track: LibraryTrack): string {
        if (track.analysisStatus === 'queued') return 'Na fila para análise';
        if (track.analysisStatus === 'processing') {
            return `Analisando · ${track.analysisProgress}%`;
        }
        if (track.analysisStatus === 'completed') return 'Análise concluída';
        if (track.analysisStatus === 'failed') return 'Análise com falha';
        return 'Aguardando análise';
    }

    isAnalysisExpanded(trackId: string): boolean {
        return this.expandedAnalysisIds.has(trackId);
    }

    toggleAnalysis(trackId: string): void {
        if (this.expandedAnalysisIds.has(trackId)) {
            this.expandedAnalysisIds.delete(trackId);
            return;
        }

        this.expandedAnalysisIds.add(trackId);
    }

    trackById(_index: number, track: LibraryTrack): string {
        return track.id;
    }

    private timestamp(value: string): number {
        const timestamp = Date.parse(value);
        return Number.isNaN(timestamp) ? 0 : timestamp;
    }

    private parseTags(value: string): string[] {
        return [...new Set(value.split(',').map((item) => item.trim()).filter(Boolean))].slice(0, 12);
    }
}
