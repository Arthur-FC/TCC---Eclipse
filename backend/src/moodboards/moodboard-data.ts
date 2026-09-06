export interface MoodboardData {
  title: string;
  creativeDirection: string;
  emotionalPalette: Array<{ label: string; description: string }>;
  instrumentation: Array<{ instrument: string; role: string }>;
  structure: Array<{ section: string; goal: string; energy: string }>;
  production: Array<{ area: string; suggestion: string }>;
  roadmap: Array<{ order: number; title: string; action: string; deliverable: string }>;
  referenceApplications: Array<{ referenceId: string; application: string }>;
  constraints: string[];
}
export interface MoodboardReferenceInput {
  id: string; title: string; creator: string; source: string; durationSeconds: number | null;
  description: string; dataStatus: 'source-metadata' | 'user-provided' | 'mixed-estimates';
}

export class InvalidMoodboardDataError extends Error {}

const EXACT_FIELDS = ['title', 'creativeDirection', 'emotionalPalette', 'instrumentation', 'structure', 'production', 'roadmap', 'referenceApplications', 'constraints'] as const;
const COMPACT_FIELDS = ['t', 'd', 'e', 'i', 's', 'p', 'r', 'a', 'c'] as const;

export function parseMoodboardJson(content: string, allowedReferenceIds: string[]): MoodboardData {
  let value: unknown;
  try { value = JSON.parse(content); } catch { throw new InvalidMoodboardDataError('A resposta não contém JSON válido.'); }
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new InvalidMoodboardDataError('O moodboard deve ser um objeto.');
  let object = value as Record<string, unknown>;
  const receivedKeys = Object.keys(object);
  if (
    receivedKeys.length === COMPACT_FIELDS.length &&
    receivedKeys.every((key) => COMPACT_FIELDS.includes(key as typeof COMPACT_FIELDS[number]))
  ) {
    object = expandCompactMoodboard(object);
  }
  const keys = Object.keys(object);
  if (keys.length !== EXACT_FIELDS.length || keys.some((key) => !EXACT_FIELDS.includes(key as typeof EXACT_FIELDS[number]))) {
    throw new InvalidMoodboardDataError('O moodboard contém campos ausentes ou não permitidos.');
  }
  const data: MoodboardData = {
    title: text(object.title, 'title', 120),
    creativeDirection: text(object.creativeDirection, 'creativeDirection', 1200),
    emotionalPalette: objectArray(object.emotionalPalette, 'emotionalPalette', 8, (item, index) => ({ label: text(item.label, `emotionalPalette[${index}].label`, 80), description: text(item.description, `emotionalPalette[${index}].description`, 400) })),
    instrumentation: objectArray(object.instrumentation, 'instrumentation', 12, (item, index) => ({ instrument: text(item.instrument, `instrumentation[${index}].instrument`, 100), role: text(item.role, `instrumentation[${index}].role`, 500) })),
    structure: objectArray(object.structure, 'structure', 16, (item, index) => ({ section: text(item.section, `structure[${index}].section`, 100), goal: text(item.goal, `structure[${index}].goal`, 500), energy: text(item.energy, `structure[${index}].energy`, 120) })),
    production: objectArray(object.production, 'production', 12, (item, index) => ({ area: text(item.area, `production[${index}].area`, 100), suggestion: text(item.suggestion, `production[${index}].suggestion`, 600) })),
    roadmap: objectArray(object.roadmap, 'roadmap', 16, (item, index) => ({ order: positiveInteger(item.order, `roadmap[${index}].order`), title: text(item.title, `roadmap[${index}].title`, 120), action: text(item.action, `roadmap[${index}].action`, 700), deliverable: text(item.deliverable, `roadmap[${index}].deliverable`, 300) })),
    referenceApplications: objectArray(object.referenceApplications, 'referenceApplications', 20, (item, index) => ({ referenceId: allowedId(item.referenceId, allowedReferenceIds, index), application: text(item.application, `referenceApplications[${index}].application`, 600) })),
    constraints: stringArray(object.constraints, 'constraints', 20, 300),
  };
  const orders = data.roadmap.map((item) => item.order);
  if (new Set(orders).size !== orders.length) throw new InvalidMoodboardDataError('A ordem do roadmap não pode se repetir.');
  data.roadmap.sort((a, b) => a.order - b.order);
  if (new Set(data.referenceApplications.map((item) => item.referenceId)).size !== data.referenceApplications.length) throw new InvalidMoodboardDataError('Uma referência aparece mais de uma vez no plano.');
  return data;
}

function expandCompactMoodboard(object: Record<string, unknown>): Record<string, unknown> {
  return {
    title: object.t,
    creativeDirection: object.d,
    emotionalPalette: compactTuples(object.e, 'e', 2).map(([label, description]) => ({ label, description })),
    instrumentation: compactTuples(object.i, 'i', 2).map(([instrument, role]) => ({ instrument, role })),
    structure: compactTuples(object.s, 's', 3).map(([section, goal, energy]) => ({ section, goal, energy })),
    production: compactTuples(object.p, 'p', 2).map(([area, suggestion]) => ({ area, suggestion })),
    roadmap: compactTuples(object.r, 'r', 4).map(([order, title, action, deliverable]) => ({ order, title, action, deliverable })),
    referenceApplications: compactTuples(object.a, 'a', 2).map(([referenceId, application]) => ({ referenceId, application })),
    constraints: object.c,
  };
}

function compactTuples(value: unknown, field: string, size: number): unknown[][] {
  if (!Array.isArray(value)) throw new InvalidMoodboardDataError(`${field} deve ser uma lista.`);
  return value.map((item, index) => {
    if (!Array.isArray(item) || item.length !== size) {
      throw new InvalidMoodboardDataError(`${field}[${index}] deve ter ${size} valores.`);
    }
    return item;
  });
}

function text(value: unknown, field: string, max: number): string {
  if (typeof value !== 'string' || !value.trim()) throw new InvalidMoodboardDataError(`${field} deve ser texto preenchido.`);
  const normalized = value.trim();
  if (normalized.length > max) throw new InvalidMoodboardDataError(`${field} excede ${max} caracteres.`);
  return normalized;
}
function objectArray<T>(value: unknown, field: string, max: number, map: (item: Record<string, unknown>, index: number) => T): T[] {
  if (!Array.isArray(value) || !value.length || value.length > max) throw new InvalidMoodboardDataError(`${field} deve conter entre 1 e ${max} itens.`);
  return value.map((item, index) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) throw new InvalidMoodboardDataError(`${field}[${index}] deve ser objeto.`);
    return map(item as Record<string, unknown>, index);
  });
}
function stringArray(value: unknown, field: string, maxItems: number, maxLength: number): string[] {
  if (!Array.isArray(value) || value.length > maxItems) throw new InvalidMoodboardDataError(`${field} deve ser uma lista de até ${maxItems} textos.`);
  return value.map((item, index) => text(item, `${field}[${index}]`, maxLength));
}
function positiveInteger(value: unknown, field: string): number {
  if (!Number.isInteger(value) || Number(value) < 1 || Number(value) > 99) throw new InvalidMoodboardDataError(`${field} deve ser inteiro entre 1 e 99.`);
  return Number(value);
}
function allowedId(value: unknown, allowed: string[], index: number): string {
  if (typeof value !== 'string' || !allowed.includes(value)) throw new InvalidMoodboardDataError(`referenceApplications[${index}].referenceId não pertence à seleção confirmada.`);
  return value;
}
