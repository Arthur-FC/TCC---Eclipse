import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseBriefingJson } from '../briefings/briefing-data';
import { parseMoodboardJson } from '../moodboards/moodboard-data';
import { ACADEMIC_EVALUATION_FIXTURES } from './evaluation-fixtures';

describe('fixed academic evaluation corpus', () => {
  it('covers eight distinct genres and contexts with stable identifiers', () => {
    expect(ACADEMIC_EVALUATION_FIXTURES).toHaveLength(8);
    expect(new Set(ACADEMIC_EVALUATION_FIXTURES.map(item => item.id)).size).toBe(8);
    expect(new Set(ACADEMIC_EVALUATION_FIXTURES.map(item => item.genre)).size).toBe(8);
    expect(new Set(ACADEMIC_EVALUATION_FIXTURES.map(item => item.context)).size).toBe(8);
  });

  it.each(ACADEMIC_EVALUATION_FIXTURES)('accepts the expected briefing JSON for $id', fixture => {
    expect(parseBriefingJson(JSON.stringify(fixture.briefing))).toEqual(fixture.briefing);
    for (const fact of fixture.knownFacts) expect(fixture.prompt.toLocaleLowerCase('pt-BR')).toContain(fact.toLocaleLowerCase('pt-BR'));
  });

  it.each(ACADEMIC_EVALUATION_FIXTURES)('accepts a grounded moodboard and rejects an invented reference for $id', fixture => {
    const referenceId = `reference-${fixture.id}`;
    const candidate = {
      title: `Direção ${fixture.genre}`,
      creativeDirection: `Desenvolver ${fixture.briefing.objective}`,
      emotionalPalette: [{ label: fixture.briefing.emotions[0], description: 'Guiar a progressão emocional sem afirmar medições inexistentes.' }],
      instrumentation: [{ instrument: fixture.briefing.instrumentation[0], role: 'Sustentar a identidade definida no briefing.' }],
      structure: [{ section: 'Abertura', goal: 'Apresentar o tema principal.', energy: 'Baixa' }],
      production: [{ area: 'Dinâmica', suggestion: 'Experimentar contraste entre as seções.' }],
      roadmap: [{ order: 1, title: 'Protótipo', action: 'Criar uma primeira versão curta.', deliverable: 'Demo inicial' }],
      referenceApplications: [{ referenceId, application: 'Usar somente como referência de direção, sem copiar a obra.' }],
      constraints: fixture.briefing.constraints,
    };
    expect(parseMoodboardJson(JSON.stringify(candidate), [referenceId]).referenceApplications[0].referenceId).toBe(referenceId);
    expect(() => parseMoodboardJson(JSON.stringify({ ...candidate, referenceApplications: [{ referenceId: 'invented-id', application: 'Invenção' }] }), [referenceId])).toThrow('não pertence à seleção confirmada');
  });

  it('declares responsive contracts for desktop, tablet and phone', () => {
    const styles = [
      resolve(process.cwd(), '../src/app/app.component.scss'),
      resolve(process.cwd(), '../src/app/components/sidebar/sidebar.component.scss'),
      resolve(process.cwd(), '../src/app/components/moodboard-panel/moodboard-panel.component.scss'),
    ].map(path => readFileSync(path, 'utf8')).join('\n');
    expect(styles).toContain('@media (max-width: 720px)');
    expect(styles).toContain('@media (max-width: 480px)');
    expect(styles).toMatch(/grid-template-columns:\s*1fr/);
  });
});
