import { Component, EventEmitter, Input, Output } from '@angular/core';
import {
    LibraryTrack,
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
    @Output() uploadRequested = new EventEmitter<TrackUploadRequest>();
    @Output() playbackRequested = new EventEmitter<string>();
    @Output() playbackStopped = new EventEmitter<void>();
    @Output() deleteRequested = new EventEmitter<string>();

    selectedFile: File | null = null;
    draggingFile = false;
    sortMode: LibrarySortMode = 'date-desc';
    title = '';
    artist = '';
    notes = '';

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
        const tracks = [...this.tracks];
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
        if (!this.selectedFile || !this.title.trim() || this.busy) return;
        this.uploadRequested.emit({
            file: this.selectedFile,
            title: this.title.trim(),
            artist: this.artist.trim(),
            notes: this.notes.trim()
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

    trackById(_index: number, track: LibraryTrack): string {
        return track.id;
    }

    private timestamp(value: string): number {
        const timestamp = Date.parse(value);
        return Number.isNaN(timestamp) ? 0 : timestamp;
    }
}
