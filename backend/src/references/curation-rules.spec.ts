import { BriefingData } from '../briefings/briefing-data';
import { canonicalReferenceUrl, markDuplicates, rankReference, sameRecording, selectionHash } from './curation-rules';
import { MusicReferenceEntity } from './music-reference.entity';
import { ReferenceSource, ReferenceStatus } from './reference-status.enum';

const data: BriefingData = { objective: null, theme: 'Lua', narrative: null, emotions: [], genres: [], mood: [], instrumentation: [], tempo: null, targetAudience: null, references: [], constraints: [], additionalNotes: null, missingFields: [], uncertainties: [], followUpQuestions: [] };
const ref = (values: Partial<MusicReferenceEntity> = {}): MusicReferenceEntity => Object.assign(new MusicReferenceEntity(), { id: 'a', title: 'Lua', creator: 'Artista', source: ReferenceSource.YOUTUBE, status: ReferenceStatus.PENDING, url: '', externalId: 'one', durationSeconds: 120, description: '', libraryTrackId: null }, values);

describe('Curation rules', () => {
  it('canonicalizes provider links and rejects unsafe protocols', () => {
    expect(canonicalReferenceUrl('https://youtu.be/abcdefghijk?si=test')).toBe('https://www.youtube.com/watch?v=abcdefghijk');
    expect(canonicalReferenceUrl('https://open.spotify.com/intl-pt/track/1234567890123456789012?si=x')).toBe('https://open.spotify.com/track/1234567890123456789012');
    expect(() => canonicalReferenceUrl('javascript:alert(1)')).toThrow();
    expect(() => canonicalReferenceUrl('https://user:pass@example.com')).toThrow();
  });
  it('groups cross-source exact metadata but preserves live versions and unknown durations', () => {
    expect(sameRecording(ref(), ref({ source: ReferenceSource.SPOTIFY, durationSeconds: 122 }))).toBe(true);
    expect(sameRecording(ref(), ref({ title: 'Lua ao vivo' }))).toBe(false);
    expect(sameRecording(ref(), ref({ durationSeconds: null }))).toBe(false);
    expect(sameRecording(ref(), ref({ durationSeconds: 150 }))).toBe(false);
  });
  it('keeps approved alternatives as the group primary without deleting candidates', () => {
    const items = [ref({ source: ReferenceSource.LIBRARY }), ref({ id: 'b', status: ReferenceStatus.APPROVED })];
    markDuplicates(items);
    expect(items[0].duplicateOfId).toBe('b');
    expect(items[1].duplicateOfId).toBeNull();
    expect(items).toHaveLength(2);
  });
  it('boosts only well-matched library tracks and labels evidence as textual', () => {
    const external = rankReference(ref(), data, .8);
    const local = rankReference(ref({ source: ReferenceSource.LIBRARY }), data, .8);
    expect(local.score - external.score).toBeCloseTo(.05);
    expect(rankReference(ref({ source: ReferenceSource.LIBRARY, title: 'Outro' }), data, .1).score).toBe(.075);
    expect(external.evidence.find(item => item.id === 'semantic')?.text).toContain('não comprova');
    expect(rankReference(ref({ title: 'Outro' }), data, undefined).evidence[0].id).toBe('limited');
  });
  it('invalidates confirmation when order, approval, content or briefing changes', () => {
    const refs = [ref({ status: ReferenceStatus.APPROVED }), ref({ id: 'b', status: ReferenceStatus.APPROVED })];
    const briefing = { id: 'brief', data };
    const original = selectionHash(refs, ['a', 'b'], briefing);
    expect(selectionHash(refs, ['b', 'a'], briefing)).not.toBe(original);
    expect(selectionHash(refs, ['a', 'b'], { ...briefing, data: { ...data, theme: 'Sol' } })).not.toBe(original);
    refs[0].status = ReferenceStatus.REJECTED;
    expect(selectionHash(refs, ['a', 'b'], briefing)).not.toBe(original);
  });
});
