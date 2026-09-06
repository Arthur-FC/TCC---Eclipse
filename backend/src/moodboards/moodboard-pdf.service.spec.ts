import { BriefingStatus, BriefingEntity } from '../briefings/briefing.entity';
import { ProjectEntity } from '../projects/project.entity';
import { MoodboardEntity } from './moodboard.entity';
import { MoodboardPdfService } from './moodboard-pdf.service';

describe('MoodboardPdfService', () => {
  it('creates a paginated PDF with the saved version and safe clickable links', async () => {
    const service = new MoodboardPdfService();
    const project = Object.assign(new ProjectEntity(), { title: 'Canção Eclipse' });
    const briefing = Object.assign(new BriefingEntity(), {
      version: 2,
      status: BriefingStatus.CONFIRMED,
      data: {
        objective: 'Criar uma faixa pop noturna com progressão emocional.',
        theme: 'O encontro entre o Sol e a Lua.',
        narrative: 'A letra acompanha duas pessoas que só conseguem se encontrar durante um eclipse.',
        emotions: ['Saudade', 'Esperança'],
        genres: ['Pop alternativo'],
        mood: ['Noturno', 'Cinematográfico'],
        instrumentation: ['Piano', 'Sintetizadores'],
        tempo: 'Moderado',
        targetAudience: 'Jovens adultos',
        references: ['Faixa de referência'],
        constraints: ['Não afirmar BPM sem medição'],
        additionalNotes: 'Preservar espaço para a voz.',
        missingFields: [], uncertainties: [], followUpQuestions: [],
      },
    });
    const moodboard = Object.assign(new MoodboardEntity(), {
      version: 3,
      briefingVersion: 2,
      createdAt: new Date('2026-09-06T13:30:00.000Z'),
      aiModel: 'qwen/test-model',
      data: {
        title: 'Noite em órbita',
        creativeDirection: 'Uma balada íntima com crescimento gradual.',
        emotionalPalette: [
          { label: 'Saudade', description: 'Conter a emoção nos versos.' },
          { label: 'Esperança', description: 'Abrir a harmonia no refrão.' },
        ],
        instrumentation: [{ instrument: 'Piano', role: 'Sustentar a harmonia sugerida.' }],
        structure: [{ section: 'Verso', goal: 'Apresentar o conflito.', energy: 'Baixa' }],
        production: [{ area: 'Espaço', suggestion: 'Usar reverberação com moderação.' }],
        roadmap: Array.from({ length: 10 }, (_, index) => ({ order: index + 1, title: `Etapa ${index + 1}`, action: 'Desenvolver e revisar o material musical.', deliverable: `Entrega ${index + 1}` })),
        referenceApplications: [{ referenceId: 'ref-1', application: 'Observar a concisão do título.' }],
        constraints: ['Não afirmar BPM sem medição'],
      },
      referenceInputs: [{
        id: 'ref-1', title: 'Referência solar', creator: 'Artista', source: 'youtube',
        durationSeconds: 203, description: 'Metadados públicos da faixa.',
        url: 'https://www.youtube.com/watch?v=example', dataStatus: 'source-metadata',
      }],
    });

    const result = await service.generate({ project, moodboard, briefing });
    const content = result.buffer.toString('latin1');

    expect(result.filename).toBe('eclipse-moodboard-v3.pdf');
    expect(result.buffer.subarray(0, 5).toString()).toBe('%PDF-');
    expect(result.buffer.length).toBeGreaterThan(10_000);
    expect(content).toContain('/S /URI');
    expect(content).toContain('https://www.youtube.com/watch?v=example');
    expect(content.match(/\/Type \/Page\b/g)?.length).toBeGreaterThan(1);
    expect(content.trimEnd().endsWith('%%EOF')).toBe(true);
  });

  it('does not create link annotations for unsafe protocols', async () => {
    const service = new MoodboardPdfService();
    const project = Object.assign(new ProjectEntity(), { title: 'Projeto' });
    const briefing = Object.assign(new BriefingEntity(), {
      version: 1,
      data: {
        objective: 'Objetivo', theme: null, narrative: null, emotions: [], genres: [], mood: [],
        instrumentation: [], tempo: null, targetAudience: null, references: [], constraints: [],
        additionalNotes: null, missingFields: [], uncertainties: [], followUpQuestions: [],
      },
    });
    const moodboard = Object.assign(new MoodboardEntity(), {
      version: 1, briefingVersion: 1, createdAt: new Date(), aiModel: 'modelo',
      data: {
        title: 'Teste', creativeDirection: 'Direção',
        emotionalPalette: [{ label: 'Calma', description: 'Suave' }],
        instrumentation: [{ instrument: 'Piano', role: 'Base' }],
        structure: [{ section: 'Verso', goal: 'Introduzir', energy: 'Baixa' }],
        production: [{ area: 'Mix', suggestion: 'Clareza' }],
        roadmap: [{ order: 1, title: 'Demo', action: 'Gravar', deliverable: 'Demo' }],
        referenceApplications: [{ referenceId: 'ref-1', application: 'Forma' }], constraints: [],
      },
      referenceInputs: [{ id: 'ref-1', title: 'Inválida', creator: '', source: 'manual', durationSeconds: null, description: '', url: 'javascript:alert(1)', dataStatus: 'user-provided' }],
    });

    const result = await service.generate({ project, moodboard, briefing });
    expect(result.buffer.toString('latin1')).not.toContain('javascript:');
  });
});
