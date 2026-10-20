import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { Moodboard, MoodboardData, MoodboardReferenceInput, MoodboardVisualSection, ReferenceAspect, VisualSectionField } from '../../models/moodboard.model';
import { ProjectEvaluation, SaveProjectEvaluation } from '../../models/evaluation.model';

type CardList = 'instrumentation' | 'production' | 'roadmap' | 'constraints';

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
    @Output() saveRequested = new EventEmitter<MoodboardData>();
    @Output() regenerateSectionRequested = new EventEmitter<{ version: number; sectionId: string }>();
    @Output() evaluationSaved = new EventEmitter<SaveProjectEvaluation>();

    evaluationDraft: SaveProjectEvaluation = { referenceRelevance: 0, moodboardUtility: 0, reuseIntent: 0, comments: '' };
    draft: MoodboardData | null = null;
    editing = false;
    viewMode: 'visual' | 'text' = 'visual';
    compareVersion: number | null = null;
    readonly scores = [1, 2, 3, 4, 5];
    readonly aspects: Array<{ value: ReferenceAspect; label: string }> = [
        { value: 'rhythm', label: 'Ritmo' }, { value: 'texture', label: 'Textura' },
        { value: 'instrumentation', label: 'Instrumentação' }, { value: 'structure', label: 'Estrutura' },
        { value: 'voice', label: 'Voz' }, { value: 'atmosphere', label: 'Atmosfera' },
    ];
    readonly lockFields: Array<{ value: VisualSectionField; label: string }> = [
        { value: 'name', label: 'Nome' }, { value: 'bars', label: 'Compassos' },
        { value: 'durationSeconds', label: 'Duração' }, { value: 'energy', label: 'Energia' },
        { value: 'emotionalIntent', label: 'Intenção' }, { value: 'instruments', label: 'Instrumentos' },
        { value: 'references', label: 'Referências' }, { value: 'productionNotes', label: 'Produção' },
    ];
    private draggedCard: { list: CardList; index: number } | null = null;

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['evaluation']) this.evaluationDraft = this.evaluation ? { referenceRelevance: this.evaluation.referenceRelevance, moodboardUtility: this.evaluation.moodboardUtility, reuseIntent: this.evaluation.reuseIntent, comments: this.evaluation.comments ?? '' } : { referenceRelevance: 0, moodboardUtility: 0, reuseIntent: 0, comments: '' };
        if (changes['moodboard'] && this.moodboard) {
            this.editing = false;
            this.draft = this.clone(this.moodboard.data);
            this.ensurePlan(this.draft);
            if (this.compareVersion === this.moodboard.version) this.compareVersion = null;
        }
    }

    get data(): MoodboardData | null { return this.editing ? this.draft : this.moodboard?.data ?? null; }
    get sections(): MoodboardVisualSection[] { return this.data?.visualPlan?.sections ?? []; }
    get totalBars(): number { return this.sections.reduce((sum, section) => sum + (Number(section.bars) || 0), 0); }
    get totalSeconds(): number { return this.sections.reduce((sum, section) => sum + (Number(section.durationSeconds) || 0), 0); }
    get durationWarning(): string {
        const target = Number(this.data?.visualPlan?.targetDurationSeconds) || 0;
        return target && this.totalSeconds && Math.abs(this.totalSeconds - target) > Math.max(15, target * .15) ? `A soma das seções (${this.formatDuration(this.totalSeconds)}) está distante do alvo (${this.formatDuration(target)}).` : '';
    }
    get comparison(): Moodboard | null { return this.compareVersion ? this.versions.find(item => item.version === this.compareVersion) ?? null : null; }
    get evaluationValid(): boolean { return [this.evaluationDraft.referenceRelevance, this.evaluationDraft.moodboardUtility, this.evaluationDraft.reuseIntent].every(value => Number.isInteger(value) && value >= 1 && value <= 5); }

    startEditing(): void { if (this.moodboard) { this.draft = this.clone(this.moodboard.data); this.ensurePlan(this.draft); this.editing = true; } }
    cancelEditing(): void { this.editing = false; this.draft = this.moodboard ? this.clone(this.moodboard.data) : null; }
    save(): void { if (this.draft?.visualPlan) { this.normalizeOrder(); this.saveRequested.emit(this.clone(this.draft)); } }
    markEdited(section: MoodboardVisualSection, field?: VisualSectionField): void {
        section.source = 'user';
        section.status = 'confirmed';
        if (field && !section.lockedFields.includes(field)) section.lockedFields = [...section.lockedFields, field];
    }
    addSection(): void {
        if (!this.draft?.visualPlan || this.sections.length >= 24) return;
        this.draft.visualPlan.sections.push({ id: `section-${Date.now()}`, name: 'Nova seção', order: this.sections.length + 1, bars: 8, durationSeconds: null, energy: 3, emotionalIntent: 'Defina a intenção desta seção.', instruments: [], references: [], productionNotes: '', source: 'user', status: 'confirmed', lockedFields: [] });
    }
    removeSection(index: number): void { if (this.draft?.visualPlan && this.sections.length > 1) { this.draft.visualPlan.sections.splice(index, 1); this.normalizeOrder(); } }
    moveSection(index: number, delta: number): void {
        if (!this.draft?.visualPlan) return;
        const target = index + delta;
        if (target < 0 || target >= this.sections.length) return;
        const [section] = this.draft.visualPlan.sections.splice(index, 1); this.draft.visualPlan.sections.splice(target, 0, section); this.markEdited(section); this.normalizeOrder();
    }
    addInstrument(section: MoodboardVisualSection): void { section.instruments.push({ instrument: 'Instrumento', role: 'Papel na seção' }); this.markEdited(section, 'instruments'); }
    removeInstrument(section: MoodboardVisualSection, index: number): void { section.instruments.splice(index, 1); this.markEdited(section, 'instruments'); }
    addReference(section: MoodboardVisualSection): void {
        const available = this.moodboard?.referenceInputs.find(ref => !section.references.some(item => item.referenceId === ref.id));
        if (available) { section.references.push({ referenceId: available.id, aspect: 'atmosphere', note: 'Descreva o que aproveitar sem copiar.' }); this.markEdited(section, 'references'); }
    }
    removeReference(section: MoodboardVisualSection, index: number): void { section.references.splice(index, 1); this.markEdited(section, 'references'); }
    toggleLock(section: MoodboardVisualSection, field: VisualSectionField): void { section.lockedFields = section.lockedFields.includes(field) ? section.lockedFields.filter(item => item !== field) : [...section.lockedFields, field]; section.source = 'user'; section.status = 'confirmed'; }
    isLocked(section: MoodboardVisualSection, field: VisualSectionField): boolean { return section.lockedFields.includes(field); }
    regenerate(section: MoodboardVisualSection): void { if (this.moodboard) this.regenerateSectionRequested.emit({ version: this.moodboard.version, sectionId: section.id }); }
    startCardDrag(list: CardList, index: number): void { this.draggedCard = { list, index }; }
    dropCard(list: CardList, index: number): void {
        if (!this.draft || !this.draggedCard || this.draggedCard.list !== list) return;
        const items = this.draft[list] as unknown[]; const [item] = items.splice(this.draggedCard.index, 1); items.splice(index, 0, item); this.fixRoadmap(list); this.draggedCard = null;
    }
    moveCard(list: CardList, index: number, delta: number): void {
        if (!this.draft) return;
        const items = this.draft[list] as unknown[]; const target = index + delta;
        if (target < 0 || target >= items.length) return;
        const [item] = items.splice(index, 1); items.splice(target, 0, item); this.fixRoadmap(list);
    }
    compare(value: string): void { const version = Number(value); this.compareVersion = Number.isInteger(version) && version > 0 ? version : null; }
    selectVersion(value: string): void { const version = Number(value); if (Number.isInteger(version) && version > 0 && version !== this.moodboard?.version) this.versionRequested.emit(version); }
    reference(id: string): MoodboardReferenceInput | undefined { return this.moodboard?.referenceInputs.find(ref => ref.id === id); }
    sourceLabel(ref: MoodboardReferenceInput): string { return { youtube: 'YouTube', spotify: 'Spotify', library: 'Acervo próprio', manual: 'Link manual' }[ref.source]; }
    statusLabel(status: MoodboardReferenceInput['dataStatus']): string { return { 'source-metadata': 'Metadados da fonte', 'user-provided': 'Informado pelo usuário', 'mixed-estimates': 'Metadados e estimativas locais' }[status]; }
    aspectLabel(aspect: ReferenceAspect): string { return this.aspects.find(item => item.value === aspect)?.label ?? aspect; }
    formatDuration(seconds: number): string { return `${Math.floor(seconds / 60)}:${String(Math.round(seconds % 60)).padStart(2, '0')}`; }

    private fixRoadmap(list: CardList): void { if (list === 'roadmap') this.draft?.roadmap.forEach((step, index) => step.order = index + 1); }
    private normalizeOrder(): void { this.draft?.visualPlan?.sections.forEach((section, index) => section.order = index + 1); }
    private ensurePlan(data: MoodboardData): void {
        if (!data.visualPlan) data.visualPlan = { targetDurationSeconds: null, sections: data.structure.map((item, index) => ({ id: `section-${index + 1}`, name: item.section, order: index + 1, bars: 8, durationSeconds: null, energy: 3, emotionalIntent: item.goal, instruments: data.instrumentation.slice(0, 4).map(entry => ({ ...entry })), references: [], productionNotes: data.production.map(entry => `${entry.area}: ${entry.suggestion}`).join(' '), source: 'ai', status: 'suggested', lockedFields: [] })) };
    }
    private clone<T>(value: T): T { return JSON.parse(JSON.stringify(value)) as T; }
}
