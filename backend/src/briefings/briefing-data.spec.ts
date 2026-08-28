import {
  InvalidBriefingDataError,
  parseBriefingJson,
  validateBriefingData,
} from './briefing-data';

const validBriefing = {
  objective: 'Criar uma canção sobre encontros impossíveis.',
  theme: 'Sol e Lua',
  narrative: null,
  emotions: ['saudade'],
  genres: ['pop'],
  mood: ['noturno'],
  instrumentation: [],
  tempo: null,
  targetAudience: null,
  references: [],
  constraints: [],
  additionalNotes: null,
  missingFields: ['narrative', 'instrumentation', 'tempo'],
  uncertainties: ['O tipo de relação entre os personagens não foi definido.'],
  followUpQuestions: ['Qual é a relação entre o Sol e a Lua?'],
};

describe('briefing data validation', () => {
  it('parses and normalizes a complete briefing', () => {
    const parsed = parseBriefingJson(JSON.stringify(validBriefing));
    expect(parsed.theme).toBe('Sol e Lua');
    expect(parsed.emotions).toEqual(['saudade']);
  });

  it('rejects missing and invented fields', () => {
    expect(() =>
      validateBriefingData({ ...validBriefing, inventedByModel: 'valor' }),
    ).toThrow(InvalidBriefingDataError);

    const { theme: _theme, ...withoutTheme } = validBriefing;
    expect(() => validateBriefingData(withoutTheme)).toThrow(
      'O campo theme está ausente.',
    );
  });

  it('rejects an unknown missing-field identifier', () => {
    expect(() =>
      validateBriefingData({
        ...validBriefing,
        missingFields: ['campoInventado'],
      }),
    ).toThrow('Campos ausentes desconhecidos');
  });
});
