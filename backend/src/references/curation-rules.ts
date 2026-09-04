import { createHash } from 'crypto';
import { BriefingData } from '../briefings/briefing-data';
import { MusicReferenceEntity } from './music-reference.entity';
import { ReferenceSource, ReferenceStatus } from './reference-status.enum';

export const digest = (text: string): string => createHash('sha256').update(text).digest('hex');
export const normalize = (text: string): string => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();

export function canonicalReferenceUrl(value: string): string {
  const url = new URL(value);
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) throw new Error('Link inválido.');
  url.hash = '';
  const host = url.hostname.replace(/^www\./, '').toLowerCase();
  const youtubeId = host === 'youtu.be' ? url.pathname.split('/')[1]
    : ['youtube.com', 'm.youtube.com'].includes(host)
      ? url.searchParams.get('v') || (/^\/(shorts|embed)\//.test(url.pathname) ? url.pathname.split('/')[2] : null)
      : null;
  if (youtubeId && /^[\w-]{11}$/.test(youtubeId)) return `https://www.youtube.com/watch?v=${youtubeId}`;
  if (host === 'open.spotify.com') {
    const match = url.pathname.match(/\/(?:intl-[a-z]+\/)?track\/([a-zA-Z0-9]{22})(?:\/|$)/);
    if (match) return `https://open.spotify.com/track/${match[1]}`;
  }
  for (const key of [...url.searchParams.keys()]) {
    if (key.startsWith('utm_') || ['si', 'fbclid', 'gclid'].includes(key)) url.searchParams.delete(key);
  }
  return url.toString();
}

export function sameRecording(a: MusicReferenceEntity, b: MusicReferenceEntity): boolean {
  if (a.source === ReferenceSource.LIBRARY && b.source === ReferenceSource.LIBRARY && a.externalId === b.externalId) return true;
  if (a.url && b.url && canonicalReferenceUrl(a.url) === canonicalReferenceUrl(b.url)) return true;
  return Boolean(a.creator && b.creator && a.durationSeconds !== null && b.durationSeconds !== null &&
    normalize(a.title) === normalize(b.title) && normalize(a.creator) === normalize(b.creator) &&
    Math.abs(a.durationSeconds - b.durationSeconds) <= 3);
}

export function referenceText(ref: MusicReferenceEntity): string {
  return `Título: ${ref.title}. Criador: ${ref.creator || 'não informado'}. Álbum: ${ref.album || 'não informado'}. ${ref.description || ''}`;
}

export function briefingText(data: BriefingData): string {
  return [data.objective, data.theme, ...data.genres, ...data.mood, ...data.emotions, ...data.instrumentation, data.tempo].filter(Boolean).join('. ').slice(0, 4000);
}

export interface Evidence { id: string; text: string; }

export function rankReference(ref: MusicReferenceEntity, data: BriefingData, semantic: number | undefined): { score: number; evidence: Evidence[]; method: string } {
  const stopwords = new Set(['uma','com','para','que','musica','criar','sobre','como','das','dos','por','the','and']);
  const terms = [...new Set(normalize(briefingText(data)).split(' ').filter((term) => term.length > 2 && !stopwords.has(term)))];
  const text = normalize(referenceText(ref));
  const matches = terms.filter((term) => text.split(' ').includes(term));
  const metadata = terms.length ? matches.length / terms.length : 0;
  const hasSemantic = semantic !== undefined && Number.isFinite(semantic);
  const base = hasSemantic ? 0.75 * Math.max(0, Math.min(1, semantic!)) + 0.25 * metadata : metadata;
  const boost = ref.source === ReferenceSource.LIBRARY && base >= 0.55 ? 0.05 : 0;
  const evidence: Evidence[] = matches.slice(0, 3).map((term, index) => ({
    id: `term-${index}`, text: `Os metadados mencionam “${term}”, termo presente no briefing.`,
  }));
  if (hasSemantic) evidence.push({ id: 'semantic', text: 'Há uma comparação semântica entre o texto disponível e o briefing; ela não comprova características do áudio.' });
  if (boost) evidence.push({ id: 'library', text: 'A faixa recebeu uma pequena prioridade por estar no acervo próprio e ter boa correspondência textual.' });
  if (!evidence.length) evidence.push({ id: 'limited', text: 'Os metadados disponíveis não oferecem evidências suficientes de compatibilidade com o briefing.' });
  return { score: Math.round(Math.min(1, base + boost) * 1000) / 1000, evidence, method: hasSemantic ? 'semantic+metadata' : 'metadata' };
}

export function markDuplicates(refs: MusicReferenceEntity[]): void {
  const priority = [...refs].sort((a, b) =>
    Number(b.status === ReferenceStatus.APPROVED) - Number(a.status === ReferenceStatus.APPROVED) ||
    Number(a.status === ReferenceStatus.REJECTED) - Number(b.status === ReferenceStatus.REJECTED) ||
    Number(b.source === ReferenceSource.LIBRARY) - Number(a.source === ReferenceSource.LIBRARY) ||
    (b.score ?? 0) - (a.score ?? 0) || a.id.localeCompare(b.id));
  const primary: MusicReferenceEntity[] = [];
  for (const ref of priority) {
    const duplicate = primary.find((candidate) => sameRecording(candidate, ref));
    ref.duplicateOfId = duplicate?.id ?? null;
    if (!duplicate) primary.push(ref);
  }
}

export function selectionHash(refs: MusicReferenceEntity[], ids: string[], briefing: { id: string; data: BriefingData }): string {
  return digest(JSON.stringify({ briefing: { id: briefing.id, data: briefing.data }, ids, items: refs.filter((ref) => ref.status === ReferenceStatus.APPROVED)
    .sort((a,b) => a.id.localeCompare(b.id)).map((ref) => ({ id: ref.id, title: ref.title, creator: ref.creator,
      url: ref.url, description: ref.description, libraryTrackId: ref.libraryTrackId, duration: ref.durationSeconds })) }));
}
