import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { Briefing, BriefingData } from '../../models/briefing.model';

type ScalarField =
    | 'objective'
    | 'theme'
    | 'narrative'
    | 'tempo'
    | 'targetAudience'
    | 'additionalNotes';

type ListField =
    | 'emotions'
    | 'genres'
    | 'mood'
    | 'instrumentation'
    | 'references'
    | 'constraints';

@Component({
    selector: 'app-briefing-panel',
    standalone: false,
    templateUrl: './briefing-panel.component.html',
    styleUrls: ['./briefing-panel.component.scss']
})
export class BriefingPanelComponent implements OnChanges {
    @Input() briefing: Briefing | null = null;
    @Input() busy = false;
    @Input() errorMessage = '';
    @Input() canGenerate = false;
    @Output() generateRequested = new EventEmitter<void>();
    @Output() saveRequested = new EventEmitter<BriefingData>();
    @Output() confirmRequested = new EventEmitter<void>();

    readonly scalarFields: Array<{ key: ScalarField; label: string; rows: number }> = [
        { key: 'objective', label: 'Objetivo criativo', rows: 2 },
        { key: 'theme', label: 'Tema', rows: 2 },
        { key: 'narrative', label: 'Narrativa', rows: 3 },
        { key: 'tempo', label: 'Andamento / tempo', rows: 2 },
        { key: 'targetAudience', label: 'Público-alvo', rows: 2 },
        { key: 'additionalNotes', label: 'Observações adicionais', rows: 3 }
    ];

    readonly listFields: Array<{ key: ListField; label: string; hint: string }> = [
        { key: 'emotions', label: 'Emoções', hint: 'Uma emoção por linha' },
        { key: 'genres', label: 'Gêneros', hint: 'Um gênero por linha' },
        { key: 'mood', label: 'Clima', hint: 'Uma característica por linha' },
        { key: 'instrumentation', label: 'Instrumentação', hint: 'Um instrumento por linha' },
        { key: 'references', label: 'Referências citadas', hint: 'Uma referência por linha' },
        { key: 'constraints', label: 'Restrições', hint: 'Uma restrição por linha' }
    ];

    draft: BriefingData | null = null;
    private original = '';

    get dirty(): boolean {
        return !!this.draft && JSON.stringify(this.draft) !== this.original;
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['briefing']) {
            this.draft = this.briefing ? cloneData(this.briefing.data) : null;
            this.original = this.draft ? JSON.stringify(this.draft) : '';
        }
    }

    scalarValue(field: ScalarField): string {
        return this.draft?.[field] ?? '';
    }

    listValue(field: ListField): string {
        return this.draft?.[field].join('\n') ?? '';
    }

    updateScalar(field: ScalarField, value: string): void {
        if (!this.draft) return;
        this.draft[field] = value.trim() || null;
        this.updateMissingField(field, !this.draft[field]);
    }

    updateList(field: ListField, value: string): void {
        if (!this.draft) return;
        this.draft[field] = value
            .split(/\r?\n/)
            .map(item => item.trim())
            .filter((item, index, items) => !!item && items.indexOf(item) === index);
        this.updateMissingField(field, this.draft[field].length === 0);
    }

    save(): void {
        if (this.draft && this.dirty && !this.busy) {
            this.saveRequested.emit(cloneData(this.draft));
        }
    }

    private updateMissingField(field: ScalarField | ListField, missing: boolean): void {
        if (!this.draft) return;
        const fields = new Set(this.draft.missingFields);
        if (missing) fields.add(field);
        else fields.delete(field);
        this.draft.missingFields = [...fields];
    }
}

function cloneData(data: BriefingData): BriefingData {
    return JSON.parse(JSON.stringify(data)) as BriefingData;
}
