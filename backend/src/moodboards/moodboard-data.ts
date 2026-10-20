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
  visualPlan?: MoodboardVisualPlan;
}

export type ReferenceAspect = 'rhythm' | 'texture' | 'instrumentation' | 'structure' | 'voice' | 'atmosphere';
export type VisualSectionField = 'name' | 'bars' | 'durationSeconds' | 'energy' | 'emotionalIntent' | 'instruments' | 'references' | 'productionNotes';
export interface MoodboardVisualSection {
  id: string;
  name: string;
  order: number;
  bars: number | null;
  durationSeconds: number | null;
  energy: number;
  emotionalIntent: string;
  instruments: Array<{ instrument: string; role: string }>;
  references: Array<{ referenceId: string; aspect: ReferenceAspect; note: string }>;
  productionNotes: string;
  source: 'ai' | 'user';
  status: 'suggested' | 'confirmed';
  lockedFields: VisualSectionField[];
}
export interface MoodboardVisualPlan {
  targetDurationSeconds: number | null;
  sections: MoodboardVisualSection[];
}
export interface MoodboardReferenceInput {
  id: string; title: string; creator: string; source: string; durationSeconds: number | null;
  description: string; url?: string | null;
  dataStatus: 'source-metadata' | 'user-provided' | 'mixed-estimates';
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
  if (keys.some((key) => key !== 'visualPlan' && !EXACT_FIELDS.includes(key as typeof EXACT_FIELDS[number])) ||
      EXACT_FIELDS.some((key) => !(key in object))) {
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
  if (object.visualPlan !== undefined) data.visualPlan = visualPlan(object.visualPlan, allowedReferenceIds);
  const orders = data.roadmap.map((item) => item.order);
  if (new Set(orders).size !== orders.length) throw new InvalidMoodboardDataError('A ordem do roadmap não pode se repetir.');
  data.roadmap.sort((a, b) => a.order - b.order);
  if (new Set(data.referenceApplications.map((item) => item.referenceId)).size !== data.referenceApplications.length) throw new InvalidMoodboardDataError('Uma referência aparece mais de uma vez no plano.');
  return data;
}

export function ensureVisualPlan(data: MoodboardData, allowedReferenceIds: string[]): MoodboardData {
  if (data.visualPlan) return { ...data, visualPlan: visualPlan(data.visualPlan, allowedReferenceIds) };
  const applications = new Map(data.referenceApplications.map((item) => [item.referenceId, item.application]));
  const sections = data.structure.map((item, index): MoodboardVisualSection => {
    const referenceId = allowedReferenceIds[index % Math.max(1, allowedReferenceIds.length)];
    return {
      id: `section-${index + 1}`,
      name: item.section,
      order: index + 1,
      bars: 8,
      durationSeconds: null,
      energy: energyLevel(item.energy),
      emotionalIntent: item.goal,
      instruments: data.instrumentation.slice(0, 4).map((entry) => ({ ...entry })),
      references: referenceId ? [{
        referenceId,
        aspect: inferAspect(applications.get(referenceId) ?? ''),
        note: applications.get(referenceId) ?? 'Aplicação criativa a confirmar.',
      }] : [],
      productionNotes: data.production.map((entry) => `${entry.area}: ${entry.suggestion}`).join(' ').slice(0, 800),
      source: 'ai',
      status: 'suggested',
      lockedFields: [],
    };
  });
  return { ...data, visualPlan: { targetDurationSeconds: null, sections } };
}

function visualPlan(value: unknown, allowedReferenceIds: string[]): MoodboardVisualPlan {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new InvalidMoodboardDataError('visualPlan deve ser objeto.');
  const item = value as Record<string, unknown>;
  const target = item.targetDurationSeconds;
  const targetDurationSeconds = target === null ? null : boundedInteger(target, 'visualPlan.targetDurationSeconds', 15, 7_200);
  if (!Array.isArray(item.sections) || item.sections.length < 1 || item.sections.length > 24) {
    throw new InvalidMoodboardDataError('visualPlan.sections deve conter entre 1 e 24 itens.');
  }
  const ids = new Set<string>();
  const sections = item.sections.map((raw, index) => visualSection(raw, allowedReferenceIds, index));
  for (const section of sections) {
    if (ids.has(section.id)) throw new InvalidMoodboardDataError('Os identificadores das seções não podem se repetir.');
    ids.add(section.id);
  }
  sections.sort((a, b) => a.order - b.order);
  sections.forEach((section, index) => { section.order = index + 1; });
  return { targetDurationSeconds, sections };
}

export function visualSection(value: unknown, allowedReferenceIds: string[], index = 0): MoodboardVisualSection {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new InvalidMoodboardDataError(`visualPlan.sections[${index}] deve ser objeto.`);
  const item = value as Record<string, unknown>;
  const id = text(item.id, `visualPlan.sections[${index}].id`, 80);
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/.test(id)) throw new InvalidMoodboardDataError(`visualPlan.sections[${index}].id é inválido.`);
  const instruments = objectArrayAllowEmpty(item.instruments, `visualPlan.sections[${index}].instruments`, 16, (entry, itemIndex) => ({
    instrument: text(entry.instrument, `instruments[${itemIndex}].instrument`, 100),
    role: text(entry.role, `instruments[${itemIndex}].role`, 500),
  }));
  const references = objectArrayAllowEmpty(item.references, `visualPlan.sections[${index}].references`, 12, (entry, itemIndex) => {
    const referenceId = text(entry.referenceId, `references[${itemIndex}].referenceId`, 80);
    if (!allowedReferenceIds.includes(referenceId)) throw new InvalidMoodboardDataError(`A referência ${referenceId} não pertence à seleção desta versão.`);
    const aspect = text(entry.aspect, `references[${itemIndex}].aspect`, 30) as ReferenceAspect;
    if (!['rhythm','texture','instrumentation','structure','voice','atmosphere'].includes(aspect)) throw new InvalidMoodboardDataError(`Aspecto de referência inválido.`);
    return { referenceId, aspect, note: text(entry.note, `references[${itemIndex}].note`, 500) };
  });
  const source = item.source === 'user' ? 'user' : item.source === 'ai' ? 'ai' : null;
  const status = item.status === 'confirmed' ? 'confirmed' : item.status === 'suggested' ? 'suggested' : null;
  if (!source || !status) throw new InvalidMoodboardDataError('Origem ou estado da seção inválido.');
  const allowedLocks: VisualSectionField[] = ['name','bars','durationSeconds','energy','emotionalIntent','instruments','references','productionNotes'];
  const lockedFields = stringArray(item.lockedFields, `visualPlan.sections[${index}].lockedFields`, allowedLocks.length, 30) as VisualSectionField[];
  if (lockedFields.some((field) => !allowedLocks.includes(field))) throw new InvalidMoodboardDataError('Campo bloqueado inválido.');
  return {
    id,
    name: text(item.name, `visualPlan.sections[${index}].name`, 100),
    order: boundedInteger(item.order, `visualPlan.sections[${index}].order`, 1, 99),
    bars: item.bars === null ? null : boundedInteger(item.bars, `visualPlan.sections[${index}].bars`, 1, 512),
    durationSeconds: item.durationSeconds === null ? null : boundedInteger(item.durationSeconds, `visualPlan.sections[${index}].durationSeconds`, 1, 3_600),
    energy: boundedInteger(item.energy, `visualPlan.sections[${index}].energy`, 1, 5),
    emotionalIntent: text(item.emotionalIntent, `visualPlan.sections[${index}].emotionalIntent`, 500),
    instruments,
    references,
    productionNotes: typeof item.productionNotes === 'string' ? item.productionNotes.trim().slice(0, 800) : '',
    source,
    status,
    lockedFields: [...new Set(lockedFields)],
  };
}

function objectArrayAllowEmpty<T>(value: unknown, field: string, max: number, map: (item: Record<string, unknown>, index: number) => T): T[] {
  if (!Array.isArray(value) || value.length > max) throw new InvalidMoodboardDataError(`${field} deve conter até ${max} itens.`);
  return value.map((item, index) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) throw new InvalidMoodboardDataError(`${field}[${index}] deve ser objeto.`);
    return map(item as Record<string, unknown>, index);
  });
}

function boundedInteger(value: unknown, field: string, min: number, max: number): number {
  if (!Number.isInteger(value) || Number(value) < min || Number(value) > max) throw new InvalidMoodboardDataError(`${field} deve ser inteiro entre ${min} e ${max}.`);
  return Number(value);
}

function energyLevel(value: string): number {
  const normalized = value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  if (/muito alta|maxima|explosiva/.test(normalized)) return 5;
  if (/alta|crescente|intensa/.test(normalized)) return 4;
  if (/baixa|minima|suave|intima/.test(normalized)) return 2;
  return 3;
}

function inferAspect(value: string): ReferenceAspect {
  const normalized = value.toLowerCase();
  if (/ritm|bateria|groove|tempo/.test(normalized)) return 'rhythm';
  if (/instrument|timbre/.test(normalized)) return 'instrumentation';
  if (/estrutura|forma|secao|seção|arranjo/.test(normalized)) return 'structure';
  if (/voz|vocal/.test(normalized)) return 'voice';
  if (/textura|som|mix/.test(normalized)) return 'texture';
  return 'atmosphere';
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
