import test from 'node:test';
import assert from 'node:assert/strict';
import { buildMemoryCorpus, selectRelevant, splitAnswer, citedTags, normalizeArabic, tokenize } from './memory';
import { PersonDossier } from '../types/dossier';

function makeDossier(extra: Partial<PersonDossier> = {}): PersonDossier {
  return {
    id: 'd1',
    name: 'أحمد علي',
    photoUrl: '',
    relationship: 'صديق',
    occupation: '',
    age: '',
    knownSince: '',
    emotionalStability: 3,
    personalitySummary: '',
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
    mind: {
      howTheyThink: 'بيحسبها كتير قبل ما يقرر',
      howTheyThinkConfidence: 'high',
      decisionMaking: '',
      decisionMakingConfidence: 'low',
      handlingPressure: '',
      handlingPressureConfidence: 'low',
      emotionalStabilityDesc: '',
      emotionalStabilityConfidence: 'low',
      coreValues: '',
      coreValuesConfidence: 'low',
      communicationStyle: '',
      communicationStyleConfidence: 'low',
    },
    triggers: [{ id: 't1', text: 'التأخير على المواعيد' }],
    comforts: [],
    timeline: [
      { id: 'n2', date: '2026-03-10', text: 'اتعصب لما اتأخرت عليه', type: 'incident', source: 'seen', energy: 'draining' },
      { id: 'n1', date: '2026-02-01', text: 'ضحك ورجع هادي بسرعة', type: 'impression', source: 'inferred' },
    ],
    changesOverTime: { analysisText: '' },
    predictions: [
      {
        id: 'p1',
        date: '2026-03-12',
        scenario: 'لو طلبت منه فلوس',
        predictedReaction: 'هيتهرب',
        actualOutcome: 'اتهرب فعلًا',
        verdict: 'correct',
        learnedInsight: 'بيتهرب من أي التزام مالي',
      },
    ],
    ...extra,
  } as PersonDossier;
}

test('corpus: notes are numbered oldest first, with readable meta', () => {
  const items = buildMemoryCorpus(makeDossier());
  const notes = items.filter((i) => i.kind === 'note');
  assert.equal(notes[0].tag, 'T1');
  assert.equal(notes[0].date, '2026-02-01');
  assert.equal(notes[1].tag, 'T2');
  assert.match(notes[1].meta || '', /واقعة/);
  assert.match(notes[1].meta || '', /استنزفني/);
});

test('corpus: predictions include what actually happened and the learned pattern', () => {
  const items = buildMemoryCorpus(makeDossier());
  const p = items.find((i) => i.kind === 'prediction')!;
  assert.equal(p.tag, 'P1');
  assert.match(p.text, /اتهرب فعلًا/);
  assert.match(p.text, /النمط: بيتهرب/);
});

test('corpus: profile fields are included, empty ones are skipped, tags are unique', () => {
  const items = buildMemoryCorpus(makeDossier());
  assert.equal(items.filter((i) => i.kind === 'mind').length, 1);
  assert.equal(items.filter((i) => i.kind === 'trigger').length, 1);
  assert.equal(new Set(items.map((i) => i.tag)).size, items.length);
});

test('selectRelevant: a small file is sent whole', () => {
  const items = buildMemoryCorpus(makeDossier());
  assert.equal(selectRelevant(items, 'اي سؤال').length, items.length);
});

test('selectRelevant: a big file is trimmed and keeps the matching notes', () => {
  const many = Array.from({ length: 200 }, (_, i) => ({
    id: `n${i}`,
    date: `2026-01-${String((i % 28) + 1).padStart(2, '0')}`,
    text: i === 77 ? 'اتخانق معايا بسبب الفلوس' : `ملاحظة عادية رقم ${i}`,
    type: 'incident' as const,
    source: 'seen' as const,
  }));
  const items = buildMemoryCorpus(makeDossier({ timeline: many }));
  const picked = selectRelevant(items, 'هو بيتخانق ليه بسبب الفلوس؟', 60);
  assert.ok(picked.length <= 60);
  assert.ok(picked.some((i) => i.text.includes('الفلوس')));
});

test('splitAnswer: keeps valid codes (also grouped), drops invented ones', () => {
  const valid = new Set(['T1', 'P1']);
  const parts = splitAnswer('بيتهرب [P1] وبيتعصب [T1, P1] وده مخترع [Z9].', valid);
  const cites = parts.filter((p) => p.type === 'cite');
  assert.equal(cites.length, 2);
  assert.deepEqual(citedTags(parts), ['P1', 'T1']);
  const text = parts.map((p) => (p.type === 'text' ? p.value : '')).join('');
  assert.ok(!text.includes('Z9'));
});

test('normalizeArabic / tokenize: unify letters and drop stop words and the "ال" prefix', () => {
  assert.equal(normalizeArabic('إزّاي أُحمد؟'), 'ازاي احمد');
  assert.ok(tokenize('بيتخانق بسبب الفلوس').includes('فلوس'));
  assert.ok(!tokenize('هل هو في الشغل').includes('هل'));
});
