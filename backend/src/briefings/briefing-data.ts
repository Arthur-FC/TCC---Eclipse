export const BRIEFING_CONTENT_FIELDS = [
  'objective',
  'theme',
  'narrative',
  'emotions',
  'genres',
  'mood',
  'instrumentation',
  'tempo',
  'targetAudience',
  'references',
  'constraints',
  'additionalNotes',
] as const;

export interface BriefingData {
  objective: string | null;
  theme: string | null;
  narrative: string | null;
  emotions: string[];
  genres: string[];
  mood: string[];
  instrumentation: string[];
  tempo: string | null;
  targetAudience: string | null;
  references: string[];
  constraints: string[];
  additionalNotes: string | null;
  missingFields: string[];
  uncertainties: string[];
  followUpQuestions: string[];
}

const ALL_FIELDS = [
  ...BRIEFING_CONTENT_FIELDS,
  'missingFields',
  'uncertainties',
  'followUpQuestions',
] as const;

const NULLABLE_STRING_FIELDS = [
  'objective',
  'theme',
  'narrative',
  'tempo',
  'targetAudience',
  'additionalNotes',
] as const;

const STRING_ARRAY_FIELDS = [
  'emotions',
  'genres',
  'mood',
  'instrumentation',
  'references',
  'constraints',
  'uncertainties',
  'followUpQuestions',
] as const;

export class InvalidBriefingDataError extends Error {}

export function parseBriefingJson(content: string): BriefingData {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new InvalidBriefingDataError('A resposta não contém JSON válido.');
  }
  return validateBriefingData(parsed);
}

export function validateBriefingData(value: unknown): BriefingData {
  if (!isRecord(value)) {
    throw new InvalidBriefingDataError('O briefing deve ser um objeto.');
  }

  const unknownFields = Object.keys(value).filter(
    (field) => !ALL_FIELDS.includes(field as (typeof ALL_FIELDS)[number]),
  );
  if (unknownFields.length > 0) {
    throw new InvalidBriefingDataError(
      `Campos desconhecidos: ${unknownFields.join(', ')}.`,
    );
  }

  for (const field of ALL_FIELDS) {
    if (!(field in value)) {
      throw new InvalidBriefingDataError(`O campo ${field} está ausente.`);
    }
  }

  const normalized = {} as Record<string, unknown>;
  for (const field of NULLABLE_STRING_FIELDS) {
    normalized[field] = normalizeNullableString(value[field], field, 2_000);
  }
  for (const field of STRING_ARRAY_FIELDS) {
    normalized[field] = normalizeStringArray(value[field], field);
  }

  const missingFields = normalizeStringArray(value.missingFields, 'missingFields');
  const invalidMissingFields = missingFields.filter(
    (field) => !BRIEFING_CONTENT_FIELDS.includes(
      field as (typeof BRIEFING_CONTENT_FIELDS)[number],
    ),
  );
  if (invalidMissingFields.length > 0) {
    throw new InvalidBriefingDataError(
      `Campos ausentes desconhecidos: ${invalidMissingFields.join(', ')}.`,
    );
  }
  normalized.missingFields = missingFields;

  return normalized as unknown as BriefingData;
}

function normalizeNullableString(
  value: unknown,
  field: string,
  maxLength: number,
): string | null {
  if (value === null) return null;
  if (typeof value !== 'string') {
    throw new InvalidBriefingDataError(`${field} deve ser texto ou null.`);
  }
  const normalized = value.trim();
  if (normalized.length > maxLength) {
    throw new InvalidBriefingDataError(`${field} excede ${maxLength} caracteres.`);
  }
  return normalized || null;
}

function normalizeStringArray(value: unknown, field: string): string[] {
  if (!Array.isArray(value) || value.length > 20) {
    throw new InvalidBriefingDataError(
      `${field} deve ser uma lista com até 20 itens.`,
    );
  }
  const normalized = value.map((item) => {
    if (typeof item !== 'string') {
      throw new InvalidBriefingDataError(`${field} aceita somente textos.`);
    }
    const text = item.trim();
    if (!text || text.length > 300) {
      throw new InvalidBriefingDataError(
        `Cada item de ${field} deve ter entre 1 e 300 caracteres.`,
      );
    }
    return text;
  });
  return [...new Set(normalized)];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
