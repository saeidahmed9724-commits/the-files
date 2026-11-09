import test from 'node:test';
import assert from 'node:assert/strict';
import { calculatePredictionAccuracy, searchDossiers, getLatestObservation, formatDossierForAI, calculateSocialBattery } from './dossierLogic';
import { PersonDossier, PredictionEntry, TimelineEntry } from '../types/dossier';
import { applyCapture, normalizeText } from './captureApply';

test('calculatePredictionAccuracy handles empty predictions', () => {
  const stats = calculatePredictionAccuracy([]);
  assert.equal(stats.total, 0);
  assert.equal(stats.accuracyRate, 0);
  assert.equal(stats.evaluated, 0);
});

test('calculatePredictionAccuracy weights correct and partially correct outcomes correctly', () => {
  const predictions: PredictionEntry[] = [
    {
      id: '1',
      date: '2026-01-01',
      scenario: 'موقف 1',
      predictedReaction: 'توقع 1',
      verdict: 'correct',
    },
    {
      id: '2',
      date: '2026-01-02',
      scenario: 'موقف 2',
      predictedReaction: 'توقع 2',
      verdict: 'partially_correct',
    },
    {
      id: '3',
      date: '2026-01-03',
      scenario: 'موقف 3',
      predictedReaction: 'توقع 3',
      verdict: 'incorrect',
    },
    {
      id: '4',
      date: '2026-01-04',
      scenario: 'موقف 4',
      predictedReaction: 'توقع 4',
      verdict: 'pending',
    },
  ];

  const stats = calculatePredictionAccuracy(predictions);
  assert.equal(stats.total, 4);
  assert.equal(stats.evaluated, 3);
  assert.equal(stats.correct, 1);
  assert.equal(stats.partiallyCorrect, 1);
  assert.equal(stats.incorrect, 1);
  assert.equal(stats.pending, 1);
  // (1 + 0.5) / 3 = 1.5 / 3 = 50%
  assert.equal(stats.accuracyRate, 50);
});

test('getLatestObservation finds the chronologically newest note', () => {
  const mockDossier = {
    timeline: [
      { id: '1', date: '2025-10-10', text: 'ملاحظة قديمة', type: 'incident', source: 'seen' },
      { id: '2', date: '2026-03-15', text: 'أحدث ملاحظة', type: 'conversation', source: 'seen' },
      { id: '3', date: '2025-12-01', text: 'ملاحظة متوسطة', type: 'impression', source: 'inferred' },
    ],
  } as unknown as PersonDossier;

  const latest = getLatestObservation(mockDossier);
  assert.ok(latest);
  assert.equal(latest?.id, '2');
  assert.equal(latest?.text, 'أحدث ملاحظة');
});

test('searchDossiers filters correctly by name, relationship, or occupation', () => {
  const dossiers = [
    { name: 'طارق المنصور', relationship: 'صديق مقرب', occupation: 'مهندس برمجيات' },
    { name: 'سارة الشريف', relationship: 'زميلة عمل', occupation: 'باحثة استراتيجية' },
    { name: 'فيصل القحطاني', relationship: 'شريك عمل', occupation: 'مستشار مالي' },
  ] as unknown as PersonDossier[];

  assert.equal(searchDossiers(dossiers, 'طارق').length, 1);
  assert.equal(searchDossiers(dossiers, 'زميلة').length, 1);
  assert.equal(searchDossiers(dossiers, 'مستشار').length, 1);
  assert.equal(searchDossiers(dossiers, '').length, 3);
  assert.equal(searchDossiers(dossiers, 'غير موجود').length, 0);
});

test('formatDossierForAI generates a structured markdown prompt with instructions', () => {
  const mockDossier = {
    id: 'test-123',
    name: 'أحمد التميمي',
    relationship: 'صديق',
    occupation: 'طبيب',
    age: 34,
    knownSince: '2020',
    emotionalStability: 4,
    personalitySummary: 'شخص هادئ ومنظم',
    mind: {
      howTheyThink: 'تحليلي',
      howTheyThinkConfidence: 'high',
      decisionMaking: 'متأنٍ',
      decisionMakingConfidence: 'medium',
      handlingPressure: 'صلب',
      handlingPressureConfidence: 'high',
      emotionalStabilityDesc: 'مستقر',
      emotionalStabilityConfidence: 'high',
      coreValues: 'النزاهة والصدق',
      coreValuesConfidence: 'high',
      communicationStyle: 'مباشر',
      communicationStyleConfidence: 'medium',
    },
    triggers: [{ id: 't1', text: 'عدم الالتزام بالوقت' }],
    comforts: [{ id: 'c1', text: 'الحديث المنطقي الهادئ' }],
    timeline: [{ id: 'tl1', date: '2026-02-01', text: 'ملاحظة أولى', type: 'incident', source: 'seen' }],
    changesOverTime: { analysisText: '' },
    predictions: [],
  } as unknown as PersonDossier;

  const aiText = formatDossierForAI(mockDossier);
  assert.match(aiText, /تعليمات أساسية للذكاء الاصطناعي/);
  assert.match(aiText, /أحمد التميمي/);
  assert.match(aiText, /عدم الالتزام بالوقت/);
  assert.match(aiText, /الحديث المنطقي الهادئ/);
});

// ---- Social Battery ----

const NOW = new Date('2026-11-09T12:00:00Z');
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000).toISOString().split('T')[0];
const entry = (id: string, ageDays: number, energy?: TimelineEntry['energy']): TimelineEntry => ({
  id,
  date: daysAgo(ageDays),
  text: 'موقف ' + id,
  type: 'incident',
  source: 'seen',
  energy,
});

test('social battery: no rated entries -> neutral, flagged as low data', () => {
  const b = calculateSocialBattery([entry('a', 1), entry('b', 2)], NOW);
  assert.equal(b.ratedCount, 0);
  assert.equal(b.unratedCount, 2);
  assert.equal(b.lowData, true);
  assert.equal(b.level, 'unknown');
  assert.equal(b.percent, 50);
  assert.equal(b.daysSinceLast, null);
});

test('social battery: all positive recent events -> charging', () => {
  const b = calculateSocialBattery([entry('a', 1, 'positive'), entry('b', 3, 'positive'), entry('c', 6, 'positive')], NOW);
  assert.equal(b.level, 'charging');
  assert.ok(b.percent >= 90, `got ${b.percent}`);
  assert.equal(b.positive, 3);
});

test('social battery: draining counts heavier than a plain negative', () => {
  const neg = calculateSocialBattery([entry('a', 1, 'negative'), entry('b', 1, 'negative'), entry('c', 1, 'negative')], NOW);
  const dr = calculateSocialBattery([entry('a', 1, 'draining'), entry('b', 1, 'draining'), entry('c', 1, 'draining')], NOW);
  assert.ok(dr.percent < neg.percent);
  assert.ok(dr.percent <= 10, `got ${dr.percent}`);
  assert.equal(dr.level, 'draining');
  assert.equal(neg.level, 'costly');
});

test('social battery: the meter drifts with time (old bad events fade, new good ones win)', () => {
  const timeline = [
    entry('old1', 200, 'draining'),
    entry('old2', 210, 'draining'),
    entry('new1', 2, 'positive'),
    entry('new2', 5, 'positive'),
  ];
  const now = calculateSocialBattery(timeline, NOW);
  // same data, judged as if we looked at it back when the bad events were fresh
  const then = calculateSocialBattery(timeline, new Date(NOW.getTime() - 195 * 86_400_000));
  assert.ok(now.percent > 75, `expected mostly charging now, got ${now.percent}`);
  assert.ok(now.percent > then.percent);
});

test('social battery: trend compares last 30 days with the 60 days before', () => {
  const worsening = calculateSocialBattery(
    [
      entry('e1', 70, 'positive'),
      entry('e2', 60, 'positive'),
      entry('r1', 5, 'draining'),
      entry('r2', 10, 'negative'),
    ],
    NOW
  );
  assert.equal(worsening.trend, 'worsening');

  const unknown = calculateSocialBattery([entry('a', 5, 'positive'), entry('b', 6, 'positive'), entry('c', 7, 'positive')], NOW);
  assert.equal(unknown.trend, 'unknown');
});

test('social battery: unrated entries are counted but do not move the meter', () => {
  const rated = [entry('a', 1, 'positive'), entry('b', 2, 'positive'), entry('c', 3, 'positive')];
  const withUnrated = [...rated, entry('x', 1), entry('y', 2)];
  const a = calculateSocialBattery(rated, NOW);
  const b = calculateSocialBattery(withUnrated, NOW);
  assert.equal(a.percent, b.percent);
  assert.equal(b.unratedCount, 2);
});

test('social battery: with only old evidence the meter relaxes toward neutral and is flagged stale', () => {
  const old = [entry('a', 300, 'draining'), entry('b', 310, 'draining'), entry('c', 320, 'draining')];
  const fresh = [entry('a', 1, 'draining'), entry('b', 2, 'draining'), entry('c', 3, 'draining')];
  const bOld = calculateSocialBattery(old, NOW);
  const bFresh = calculateSocialBattery(fresh, NOW);
  assert.ok(Math.abs(bOld.percent - 50) <= 5, `got ${bOld.percent}`);
  assert.ok(bOld.percent > bFresh.percent);
  assert.equal(bOld.stale, true);
  assert.equal(bFresh.stale, false);
});

// ---- Quick Capture distribution ----

const baseDossier = (): PersonDossier =>
  ({
    id: 'd1',
    name: 'تست',
    timeline: [entry('old', 10, 'positive')],
    triggers: [{ id: 't0', text: 'المقاطعة أثناء الكلام', severity: 'high' }],
    comforts: [],
    lexicon: [{ id: 'l0', phrase: 'بصراحة', kind: 'tell' }],
    changesOverTime: { analysisText: 'تحليل قديم', lastGenerated: '2026-01-01' },
  }) as unknown as PersonDossier;

test('applyCapture: adds entries first, keeps old ones, never touches untouched fields', () => {
  const d = baseDossier();
  const { patch, counts } = applyCapture(
    d,
    {
      entries: [{ text: 'قعدنا ساعتين واتشحنت', type: 'incident', source: 'seen', energy: 'positive' }],
      changes: [],
      triggers: [],
      comforts: [],
      lexicon: [],
    },
    '2026-11-09',
    1000
  );
  assert.equal(patch.timeline?.length, 2);
  assert.equal(patch.timeline?.[0].energy, 'positive');
  assert.equal(patch.timeline?.[0].fromVoice, true);
  assert.equal(patch.timeline?.[1].id, 'old');
  assert.equal(counts.entries, 1);
  assert.equal('triggers' in patch, false);
  assert.equal('changesOverTime' in patch, false);
  assert.equal('lexicon' in patch, false);
});

test('applyCapture: skips duplicates (normalized) in triggers and lexicon', () => {
  const { patch, counts } = applyCapture(
    baseDossier(),
    {
      entries: [],
      changes: [],
      triggers: [
        { text: 'المقاطعة أثناء الكلام!', severity: 'high' },
        { text: 'الاستعجال', severity: 'mild' },
      ],
      comforts: [],
      lexicon: [
        { phrase: 'بصراحه', kind: 'tell' },
        { phrase: 'والله', kind: 'tic', meaning: 'بيأكد كلامه' },
      ],
    },
    '2026-11-09',
    1000
  );
  assert.equal(patch.triggers?.length, 2);
  assert.equal(patch.triggers?.[0].text, 'الاستعجال');
  assert.equal(patch.lexicon?.length, 2);
  assert.equal(patch.lexicon?.[0].phrase, 'والله');
  assert.equal(counts.skippedDuplicates, 2);
});

test('applyCapture: change notes are kept in changeLog without wiping the AI analysis', () => {
  const { patch } = applyCapture(
    baseDossier(),
    { entries: [], changes: ['بقى بيرد بسرعة بعد ما كان بيتأخر'], triggers: [], comforts: [], lexicon: [] },
    '2026-11-09',
    1000
  );
  assert.equal(patch.changesOverTime?.analysisText, 'تحليل قديم');
  assert.equal(patch.changesOverTime?.lastGenerated, '2026-01-01');
  assert.equal(patch.changesOverTime?.changeLog?.length, 1);
});

test('normalizeText ignores diacritics, hamza forms and punctuation', () => {
  assert.equal(normalizeText('أَحْمد!'), normalizeText('احمد'));
});
