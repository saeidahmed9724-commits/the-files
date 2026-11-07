import test from 'node:test';
import assert from 'node:assert/strict';
import { calculatePredictionAccuracy, searchDossiers, getLatestObservation, formatDossierForAI } from './dossierLogic';
import { PersonDossier, PredictionEntry } from '../types/dossier';

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
