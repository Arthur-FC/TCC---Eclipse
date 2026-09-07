import { NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BriefingsService } from '../briefings/briefings.service';
import { SemanticLibrarySearchService } from '../library/semantic-library-search.service';
import { MoodboardsService } from '../moodboards/moodboards.service';
import { ProjectsService } from '../projects/projects.service';
import { ReferenceStatus } from '../references/reference-status.enum';
import { ReferencesService } from '../references/references.service';
import { ProjectMemoryService } from './project-memory.service';

describe('ProjectMemoryService', () => {
  function createService(maxChars = 12_000) {
    const projects = { getActiveProject: jest.fn().mockResolvedValue({ title: 'Projeto Aurora', description: 'Pop noturno.' }) } as unknown as jest.Mocked<ProjectsService>;
    const briefings = { requireConfirmedBriefing: jest.fn().mockResolvedValue({ version: 2, data: {
      objective: 'Criar uma faixa íntima.', theme: 'Eclipse', narrative: null,
      emotions: ['saudade'], genres: ['pop'], mood: ['noturno'], instrumentation: ['piano'],
      tempo: 'moderado', targetAudience: null, references: [], constraints: ['sem solo'],
      additionalNotes: null, missingFields: [], uncertainties: [], followUpQuestions: [],
    } }) } as unknown as jest.Mocked<BriefingsService>;
    const moodboards = { current: jest.fn().mockResolvedValue({ version: 3, data: {
      title: 'Órbita', creativeDirection: 'Crescimento gradual.',
      emotionalPalette: [{ label: 'Saudade', description: 'Versos contidos.' }],
      instrumentation: [{ instrument: 'Piano', role: 'Base harmônica.' }],
      structure: [{ section: 'Verso', goal: 'Apresentar conflito.', energy: 'Baixa' }],
      production: [{ area: 'Ambiência', suggestion: 'Reverb curto.' }],
      roadmap: [{ order: 1, title: 'Demo', action: 'Gravar.', deliverable: 'Demo v1' }],
      referenceApplications: [{ referenceId: 'ref-1', application: 'Usar a dinâmica.' }], constraints: ['sem solo'],
    }, referenceInputs: [{ id: 'ref-1', title: 'Faixa Lunar' }] }) } as unknown as jest.Mocked<MoodboardsService>;
    const references = { list: jest.fn().mockResolvedValue([
      { id: 'ref-1', title: 'Faixa Lunar', creator: 'Artista', source: 'youtube', status: ReferenceStatus.APPROVED, description: 'Metadados públicos.' },
      { id: 'ref-2', title: 'Descartada', creator: '', source: 'manual', status: ReferenceStatus.REJECTED, description: 'Não incluir.' },
    ]) } as unknown as jest.Mocked<ReferencesService>;
    const librarySearch = { search: jest.fn().mockResolvedValue({ results: [{
      title: 'Demo Piano', artist: null, notes: 'Ideia antiga', genreTags: ['pop'], moodTags: ['calmo'], instrumentTags: ['piano'],
      estimatedBpm: 82, estimatedKey: 'Am', matchScore: .91,
    }] }) } as unknown as jest.Mocked<SemanticLibrarySearchService>;
    const config = { get: jest.fn((key: string) => key === 'AI_PROJECT_MEMORY_MAX_CHARS' ? maxChars : 3) } as unknown as ConfigService;
    return { service: new ProjectMemoryService(projects, briefings, moodboards, references, librarySearch, config), projects, briefings, moodboards, references, librarySearch };
  }

  it('assembles bounded memory with explicit provenance from only the current project', async () => {
    const { service, moodboards, references, librarySearch } = createService(4_000);
    const memory = await service.build('owner-1', 'project-1', 'Quero retomar o piano');

    expect(memory.characterCount).toBeLessThanOrEqual(4_000);
    expect(memory.content).toContain('[FONTE: DADO_CONFIRMADO_PELO_USUÁRIO]');
    expect(memory.content).toContain('[FONTE: SUGESTÃO_DA_IA]');
    expect(memory.content).toContain('Órbita');
    expect(memory.content).toContain('Faixa Lunar');
    expect(memory.content).toContain('Demo Piano');
    expect(memory.content).not.toContain('Descartada');
    expect(memory.sources).toEqual({ briefing: true, moodboard: true, approvedReferences: 1, libraryMatches: 1 });
    expect(moodboards.current).toHaveBeenCalledWith('owner-1', 'project-1');
    expect(references.list).toHaveBeenCalledWith('owner-1', 'project-1');
    expect(librarySearch.search).toHaveBeenCalledWith('owner-1', { q: 'Quero retomar o piano' });
  });

  it('fails before loading memory when the authenticated owner cannot access the project', async () => {
    const { service, projects, briefings, moodboards, references, librarySearch } = createService();
    projects.getActiveProject.mockRejectedValueOnce(new NotFoundException('Projeto ativo não encontrado.'));

    await expect(service.build('intruder', 'project-1', 'piano')).rejects.toBeInstanceOf(NotFoundException);
    expect(briefings.requireConfirmedBriefing).not.toHaveBeenCalled();
    expect(moodboards.current).not.toHaveBeenCalled();
    expect(references.list).not.toHaveBeenCalled();
    expect(librarySearch.search).not.toHaveBeenCalled();
  });

  it('keeps the assistant available when optional project artifacts are missing', async () => {
    const { service, briefings, moodboards, references, librarySearch } = createService();
    briefings.requireConfirmedBriefing.mockRejectedValueOnce(new NotFoundException());
    moodboards.current.mockResolvedValueOnce(null);
    references.list.mockRejectedValueOnce(new Error('temporário'));
    librarySearch.search.mockRejectedValueOnce(new Error('temporário'));

    const memory = await service.build('owner-1', 'project-1', 'piano');
    expect(memory.sources).toEqual({ briefing: false, moodboard: false, approvedReferences: 0, libraryMatches: 0 });
    expect(memory.content).toContain('Não disponível');
  });
});
