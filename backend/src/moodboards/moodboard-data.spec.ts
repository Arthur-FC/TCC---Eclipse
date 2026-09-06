import { InvalidMoodboardDataError, parseMoodboardJson } from './moodboard-data';

const valid = {
  title: 'Noite em órbita', creativeDirection: 'Uma balada íntima com crescimento gradual.',
  emotionalPalette: [{ label: 'Saudade', description: 'Conter a emoção nos versos.' }],
  instrumentation: [{ instrument: 'Piano', role: 'Sustentar a harmonia sugerida.' }],
  structure: [{ section: 'Verso', goal: 'Apresentar o conflito.', energy: 'Baixa' }],
  production: [{ area: 'Espaço', suggestion: 'Usar reverberação com moderação.' }],
  roadmap: [{ order: 1, title: 'Rascunho', action: 'Escrever o primeiro verso.', deliverable: 'Letra v1' }],
  referenceApplications: [{ referenceId: 'ref-1', application: 'Observar a concisão do título.' }],
  constraints: ['Não tratar estimativas como medições.'],
};

describe('moodboard data validation', () => {
  it('normalizes a valid structured response', () => {
    expect(parseMoodboardJson(JSON.stringify(valid), ['ref-1'])).toEqual(valid);
  });
  it('expands the compact AI response into the public format', () => {
    const compact = {
      t: valid.title,
      d: valid.creativeDirection,
      e: [['Saudade', 'Conter a emoção nos versos.']],
      i: [['Piano', 'Sustentar a harmonia sugerida.']],
      s: [['Verso', 'Apresentar o conflito.', 'Baixa']],
      p: [['Espaço', 'Usar reverberação com moderação.']],
      r: [[1, 'Rascunho', 'Escrever o primeiro verso.', 'Letra v1']],
      a: [['ref-1', 'Observar a concisão do título.']],
      c: ['Não tratar estimativas como medições.'],
    };

    expect(parseMoodboardJson(JSON.stringify(compact), ['ref-1'])).toEqual(valid);
  });
  it('rejects unknown root properties and unapproved references', () => {
    expect(() => parseMoodboardJson(JSON.stringify({ ...valid, invented: true }), ['ref-1'])).toThrow(InvalidMoodboardDataError);
    expect(() => parseMoodboardJson(JSON.stringify(valid), ['other'])).toThrow('não pertence à seleção confirmada');
  });
  it('rejects duplicate roadmap orders and duplicate reference use', () => {
    expect(() => parseMoodboardJson(JSON.stringify({ ...valid, roadmap: [...valid.roadmap, { ...valid.roadmap[0] }] }), ['ref-1'])).toThrow('ordem do roadmap');
    expect(() => parseMoodboardJson(JSON.stringify({ ...valid, referenceApplications: [...valid.referenceApplications, { ...valid.referenceApplications[0] }] }), ['ref-1'])).toThrow('mais de uma vez');
  });
  it('rejects empty sections, oversized values and malformed JSON', () => {
    expect(() => parseMoodboardJson('{', ['ref-1'])).toThrow('JSON válido');
    expect(() => parseMoodboardJson(JSON.stringify({ ...valid, production: [] }), ['ref-1'])).toThrow('entre 1 e 12');
    expect(() => parseMoodboardJson(JSON.stringify({ ...valid, title: 'a'.repeat(121) }), ['ref-1'])).toThrow('excede 120');
  });
});
