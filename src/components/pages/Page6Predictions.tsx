import React, { useRef, useState } from 'react';
import { callAI } from '../../lib/ai';
import { Target, Sparkles, Loader2, CheckCircle2, HelpCircle, XCircle, Clock, Trash2, Edit3, ChevronDown, ChevronUp, Lightbulb, Lock } from 'lucide-react';
import { PersonDossier, PredictionEntry, PredictionVerdict, TimelineEntry } from '../../types/dossier';
import { calculatePredictionAccuracy } from '../../utils/dossierLogic';

interface Page6PredictionsProps {
  dossier: PersonDossier;
  onUpdateDossier: (updated: Partial<PersonDossier>) => void;
}

export const Page6Predictions: React.FC<Page6PredictionsProps> = ({ dossier, onUpdateDossier }) => {
  const [predictions, setPredictions] = useState<PredictionEntry[]>(dossier.predictions || []);
  const [scenarioInput, setScenarioInput] = useState('');
  const [isPredicting, setIsPredicting] = useState(false);
  const [aiError, setAiError] = useState('');
  const [editingActualId, setEditingActualId] = useState<string | null>(null);
  const [actualTextTemp, setActualTextTemp] = useState('');

  const [openIds, setOpenIds] = useState<string[]>([]); // closed (correct) cards the user re-opened
  const [learningId, setLearningId] = useState<string | null>(null);
  const [learnError, setLearnError] = useState('');

  // Always-latest copies, because the learn call finishes asynchronously.
  const predsRef = useRef(predictions);
  predsRef.current = predictions;
  const dossierRef = useRef(dossier);
  dossierRef.current = dossier;

  const stats = calculatePredictionAccuracy(predictions);

  const today = () => new Date().toISOString().split('T')[0];

  const toggleOpen = (id: string) =>
    setOpenIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  // Remove the auto-added timeline note (if any) and clear the learned insight.
  const withoutLearning = (list: PredictionEntry[], id: string) => {
    const target = list.find((p) => p.id === id);
    const timeline: TimelineEntry[] = (dossierRef.current.timeline || []).filter(
      (n) => n.id !== target?.learnedNoteId
    );
    const preds = list.map((p) =>
      p.id === id ? { ...p, learnedInsight: undefined, learnedNoteId: undefined } : p
    );
    return { preds, timeline };
  };

  // A correct prediction teaches the file: extract a pattern and add it as an inferred note.
  const learnFromPrediction = async (id: string) => {
    const entry = predsRef.current.find((p) => p.id === id);
    if (!entry || entry.verdict !== 'correct' || entry.learnedNoteId) return;
    setLearningId(id);
    setLearnError('');
    try {
      const insight = (
        await callAI('learn', {
          dossier: dossierRef.current,
          scenario: entry.scenario,
          predictedReaction: entry.predictedReaction,
          actualOutcome: entry.actualOutcome || '',
        })
      ).trim();

      // The user may have changed the verdict while we were waiting.
      const latest = predsRef.current.find((p) => p.id === id);
      if (!latest || latest.verdict !== 'correct') return;

      const note: TimelineEntry = {
        id: `note-learn-${Date.now()}`,
        date: today(),
        text: `(استنتاج من توقع صح) ${insight}`,
        type: 'impression',
        source: 'inferred',
        tags: ['من-توقع-صح'],
      };
      const preds = predsRef.current.map((p) =>
        p.id === id ? { ...p, learnedInsight: insight, learnedNoteId: note.id } : p
      );
      setPredictions(preds);
      onUpdateDossier({ predictions: preds, timeline: [note, ...(dossierRef.current.timeline || [])] });
    } catch (err: any) {
      setLearnError(err?.message || 'تعذّر استخراج الاستنتاج');
    } finally {
      setLearningId(null);
    }
  };

  const handleRemoveLearning = (id: string) => {
    const { preds, timeline } = withoutLearning(predsRef.current, id);
    setPredictions(preds);
    onUpdateDossier({ predictions: preds, timeline });
  };

  const handlePredict = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scenarioInput.trim()) return;

    setIsPredicting(true);
    setAiError('');
    try {
      const reaction = await callAI('predict', { dossier, scenario: scenarioInput.trim() });

      const newEntry: PredictionEntry = {
        id: `pred-${Date.now()}`,
        date: new Date().toISOString().split('T')[0],
        scenario: scenarioInput.trim(),
        predictedReaction: reaction,
        verdict: 'pending',
      };

      const updated = [newEntry, ...predictions];
      setPredictions(updated);
      onUpdateDossier({ predictions: updated });
      setScenarioInput('');
    } catch (err: any) {
      console.error('Error predicting reaction:', err);
      setAiError(err?.message || 'حدث خطأ غير متوقع');
    } finally {
      setIsPredicting(false);
    }
  };

  const handleSetVerdict = (id: string, verdict: PredictionVerdict) => {
    let list = predictions.map((p) =>
      p.id === id ? { ...p, verdict, evaluatedAt: today() } : p
    );
    let timeline: TimelineEntry[] | undefined;

    // Leaving "correct" undoes what the file learned from it.
    if (verdict !== 'correct') {
      const had = predictions.find((p) => p.id === id)?.learnedNoteId;
      if (had) {
        const r = withoutLearning(list, id);
        list = r.preds;
        timeline = r.timeline;
      }
    }

    setPredictions(list);
    onUpdateDossier(timeline ? { predictions: list, timeline } : { predictions: list });

    if (verdict === 'correct') {
      setOpenIds((prev) => prev.filter((x) => x !== id)); // close the card
      predsRef.current = list;
      void learnFromPrediction(id);
    }
  };

  const handleSaveActualOutcome = (id: string) => {
    const updated = predictions.map((p) => {
      if (p.id === id) {
        return { ...p, actualOutcome: actualTextTemp.trim() };
      }
      return p;
    });
    setPredictions(updated);
    onUpdateDossier({ predictions: updated });
    setEditingActualId(null);
  };

  const handleDeletePrediction = (id: string) => {
    const target = predictions.find((p) => p.id === id);
    const updated = predictions.filter((p) => p.id !== id);
    setPredictions(updated);
    if (target?.learnedNoteId) {
      onUpdateDossier({
        predictions: updated,
        timeline: (dossier.timeline || []).filter((n) => n.id !== target.learnedNoteId),
      });
    } else {
      onUpdateDossier({ predictions: updated });
    }
  };

  return (
    <div className="bg-vintage-paper border-2 border-[#bfa57d] rounded-lg p-6 sm:p-8 min-h-[600px] shadow-sm relative font-arabic-body text-[#2c1d11]">
      {/* Header */}
      <div className="pb-4 mb-6 border-b-2 border-[#8c6b45]">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl sm:text-3xl font-black font-typewriter tracking-wide text-[#2b1b10]">
            PREDICTIONS & HYPOTHESES
          </h1>
          <span className="text-xl sm:text-2xl font-bold font-arabic-hand text-[#8c1d18]">
            • سجل التوقعات واختبار الفرضيات
          </span>
        </div>
        <p className="text-xs text-[#705238] mt-1">
          مختبر استشراف ردود الأفعال قبل حدوثها ومطابقتها مع الواقع لحساب دقة فهم الشخصية.
        </p>
      </div>

      {/* Top Accuracy Scoreboard */}
      <div className="mb-6 bg-[#f4ecd8] border-2 border-[#8c6b45] rounded-xl p-4 sm:p-5 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {/* Circular/Stamp Accuracy Gauge */}
          <div className="w-16 h-16 rounded-full border-4 border-[#8c1d18] bg-[#fdfbf6] flex flex-col items-center justify-center shadow-inner">
            <span className="text-xl font-black font-typewriter text-[#8c1d18]">
              {stats.accuracyRate}%
            </span>
            <span className="text-[9px] font-bold text-[#5c4028]">الدقة</span>
          </div>

          <div>
            <h2 className="text-base font-bold text-[#3d2716] font-arabic-body">
              مؤشر دقة التوقعات الإجمالية
            </h2>
            <p className="text-xs text-[#7a5f45]">
              {stats.evaluated > 0
                ? `تم تقييم ${stats.evaluated} من أصل ${stats.total} توقع مبني على أرشيف الشخصية.`
                : 'لم يتم تقييم أي توقع بعد. سجل ما حدث على أرض الواقع لحساب النسبة.'}
            </p>
          </div>
        </div>

        {/* Breakdown Badges */}
        <div className="flex flex-wrap gap-2 text-xs font-typewriter">
          <div className="px-3 py-1 bg-emerald-100 text-emerald-900 border border-emerald-300 rounded font-bold flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>صائب: {stats.correct}</span>
          </div>
          <div className="px-3 py-1 bg-amber-100 text-amber-900 border border-amber-300 rounded font-bold flex items-center gap-1">
            <HelpCircle className="w-3.5 h-3.5" />
            <span>صائب جزئياً: {stats.partiallyCorrect}</span>
          </div>
          <div className="px-3 py-1 bg-rose-100 text-rose-900 border border-rose-300 rounded font-bold flex items-center gap-1">
            <XCircle className="w-3.5 h-3.5" />
            <span>خاطئ: {stats.incorrect}</span>
          </div>
          <div className="px-3 py-1 bg-stone-200 text-stone-700 border border-stone-300 rounded font-bold flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            <span>قيد الانتظار: {stats.pending}</span>
          </div>
        </div>
      </div>

      {/* New Prediction Input Box */}
      <form
        onSubmit={handlePredict}
        className="mb-8 p-4 bg-[#f8f2e4] border-2 border-[#bfa57d] rounded-lg shadow-sm"
      >
        <div className="flex items-center gap-2 mb-2 pb-1 border-b border-[#cca779]">
          <Target className="w-4 h-4 text-[#8c1d18]" />
          <label className="text-xs font-bold text-[#4a3422] font-typewriter uppercase">
            SITUATION OR MESSAGE / الموقف أو الرسالة المزمع طرحها:
          </label>
        </div>

        <textarea
          rows={2}
          required
          value={scenarioInput}
          onChange={(e) => setScenarioInput(e.target.value)}
          placeholder="مثال: لو طلبت منه تأجيل تسليم المشروع أسبوعاً إضافياً، كيف ستكون ردة فعله الأولية والعميقة؟"
          className="w-full bg-[#fdfbf7] border border-[#a68660] p-2.5 text-xs sm:text-sm font-arabic-body rounded text-[#1a110a] mb-3 focus:outline-none focus:bg-white"
        />

        <div className="flex justify-between items-center">
          <span className="text-[11px] text-[#7a5f45]">
            يتم التوليد بالاستناد إلى ملف العقل والمحفزات والسجل الزمني الكامل.
          </span>
          <button
            type="submit"
            disabled={isPredicting || !scenarioInput.trim()}
            className="px-5 py-2 bg-[#8c1d18] hover:bg-[#731713] disabled:opacity-50 text-[#fbf7ee] text-xs font-bold rounded shadow transition flex items-center gap-2"
          >
            {isPredicting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>جاري استقراء رد الفعل...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>توقع رد فعله (Gemini AI)</span>
              </>
            )}
          </button>
        </div>
        {aiError && (
        <div className="mt-2 text-[11px] text-rose-800 bg-rose-100 border border-rose-300 rounded px-2 py-1.5 ">
          ⚠ {aiError}
        </div>
      )}
      </form>

      {learnError && (
        <div className="mb-4 text-[11px] text-rose-800 bg-rose-100 border border-rose-300 rounded px-2 py-1.5">
          ⚠ {learnError}
        </div>
      )}

      {/* Predictions Cards List */}
      <div className="space-y-6">
        {predictions.length === 0 ? (
          <div className="p-8 text-center text-xs text-[#8c745c] border-2 border-dashed border-[#cca779] rounded-lg">
            لا توجد توقعات مسجلة بعد. اطرح أول موقف في الصندوق أعلاه لتجربة التوقع.
          </div>
        ) : (
          predictions.map((p, idx) => {
            const closed = p.verdict === 'correct' && !openIds.includes(p.id);
            return (
            <div
              key={p.id}
              className="bg-[#fcf9f2] border-2 border-[#cbb184] rounded-lg p-5 shadow-sm hover:shadow-md transition relative"
            >
              {/* Card Header */}
              <div
                className={`flex flex-wrap justify-between items-center gap-2 pb-2 border-b border-[#cca779] ${closed ? 'mb-2' : 'mb-3'} ${p.verdict === 'correct' ? 'cursor-pointer' : ''}`}
                onClick={p.verdict === 'correct' ? () => toggleOpen(p.id) : undefined}
              >
                <div className="flex items-center gap-2">
                  <span className="font-typewriter text-xs font-bold text-[#8c1d18] bg-[#f2e7d0] px-2 py-0.5 rounded border border-[#cca779]">
                    توقع #{predictions.length - idx} [ {p.date} ]
                  </span>
                  <span className="font-bold text-xs text-[#4a3422]">
                    الموقف: {p.scenario}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {/* Verdict badge */}
                  <span
                    className={`text-[11px] font-bold px-2 py-0.5 rounded border font-arabic-body ${
                      p.verdict === 'correct'
                        ? 'bg-emerald-100 text-emerald-900 border-emerald-400'
                        : p.verdict === 'partially_correct'
                        ? 'bg-amber-100 text-amber-900 border-amber-400'
                        : p.verdict === 'incorrect'
                        ? 'bg-rose-100 text-rose-900 border-rose-400'
                        : 'bg-stone-100 text-stone-700 border-stone-300'
                    }`}
                  >
                    {p.verdict === 'correct'
                      ? 'صائب تماماً ✓'
                      : p.verdict === 'partially_correct'
                      ? 'صائب جزئياً ~'
                      : p.verdict === 'incorrect'
                      ? 'غير صائب ✗'
                      : 'قيد المتابعة ⏳'}
                  </span>

                  {p.verdict === 'correct' && (
                    <span className="text-stone-500 p-1" aria-hidden>
                      {closed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeletePrediction(p.id);
                    }}
                    className="text-stone-400 hover:text-rose-600 transition p-1"
                    title="حذف التوقع"
                    aria-label="حذف"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Learned insight (always visible, even when the card is closed) */}
              {(p.learnedInsight || learningId === p.id) && (
                <div className="mb-3 p-2.5 bg-[#eef3e2] border border-emerald-300 rounded text-xs font-arabic-body text-[#2c3d1a] flex items-start gap-2">
                  <Lightbulb className="w-3.5 h-3.5 mt-0.5 shrink-0 text-emerald-800" />
                  <div className="flex-1">
                    {learningId === p.id ? (
                      <span className="flex items-center gap-1.5">
                        <Loader2 className="w-3 h-3 animate-spin" /> بيتعلّم من التوقع ده...
                      </span>
                    ) : (
                      <>
                        <span className="font-bold">اتضاف للملف تلقائي: </span>
                        {p.learnedInsight}
                        <button
                          type="button"
                          onClick={() => handleRemoveLearning(p.id)}
                          className="mr-2 text-[11px] text-rose-800 hover:underline"
                        >
                          (شيله)
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}
              {closed && (
                <div className="text-[11px] text-[#7a5f45] flex items-center gap-1">
                  <Lock className="w-3 h-3" /> التوقع اتقفل لأنه طلع صح. دوس على الكارت عشان تفتحه.
                </div>
              )}

              {!closed && (
              <>
              {/* Predicted Reaction Box */}
              <div className="mb-4 p-3.5 bg-[#f4ebd6] border-r-4 border-[#8c1d18] rounded text-xs sm:text-sm font-arabic-body text-[#2c1d11] leading-relaxed whitespace-pre-wrap">
                <span className="block font-bold text-[#691410] mb-1 font-typewriter text-[11px]">
                  PREDICTED REACTION / رد الفعل المتوقع:
                </span>
                {p.predictedReaction}
              </div>

              {/* What actually happened section */}
              <div className="p-3 bg-[#faf4e6] border border-[#d9be8c] rounded-md">
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-xs font-bold text-[#5c4028] font-arabic-body">
                    ما حدث بالفعل على أرض الواقع (اختبار الفرضية):
                  </span>
                  {editingActualId !== p.id && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingActualId(p.id);
                        setActualTextTemp(p.actualOutcome || '');
                      }}
                      className="text-[11px] text-[#8c1d18] hover:underline flex items-center gap-1 font-bold"
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>{p.actualOutcome ? 'تعديل النتيجة' : '+ تسجيل ما حدث'}</span>
                    </button>
                  )}
                </div>

                {editingActualId === p.id ? (
                  <div className="space-y-2 mt-2">
                    <textarea
                      rows={2}
                      value={actualTextTemp}
                      onChange={(e) => setActualTextTemp(e.target.value)}
                      placeholder="صف ما حدث بالفعل بعد طرح الموقف..."
                      className="w-full bg-white border border-[#bfa57d] p-2 text-xs rounded font-arabic-body focus:outline-none"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingActualId(null)}
                        className="px-2.5 py-1 text-xs text-stone-600 border border-stone-300 rounded"
                      >
                        إلغاء
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSaveActualOutcome(p.id)}
                        className="px-3 py-1 bg-[#8c1d18] text-white text-xs font-bold rounded"
                      >
                        حفظ النتيجة
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs font-arabic-body text-[#3d2716] italic min-h-[24px]">
                    {p.actualOutcome || 'لم يتم تسجيل ما حدث بعد. بعد وقوع الموقف، سجل النتيجة هنا وقيم التوقع.'}
                  </p>
                )}

                {/* Verdict selector buttons */}
                <div className="mt-3 pt-2 border-t border-[#e5d4b5] flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[11px] font-bold text-[#5c4028]">
                    تقييم صواب التوقع:
                  </span>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleSetVerdict(p.id, 'correct')}
                      className={`px-2.5 py-1 text-xs font-bold rounded border transition ${
                        p.verdict === 'correct'
                          ? 'bg-emerald-800 text-white border-emerald-900 shadow-sm'
                          : 'bg-[#faf5ea] text-emerald-900 border-emerald-300 hover:bg-emerald-100'
                      }`}
                    >
                      صائب تماماً ✓
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSetVerdict(p.id, 'partially_correct')}
                      className={`px-2.5 py-1 text-xs font-bold rounded border transition ${
                        p.verdict === 'partially_correct'
                          ? 'bg-amber-700 text-white border-amber-800 shadow-sm'
                          : 'bg-[#faf5ea] text-amber-900 border-amber-300 hover:bg-amber-100'
                      }`}
                    >
                      صائب جزئياً ~
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSetVerdict(p.id, 'incorrect')}
                      className={`px-2.5 py-1 text-xs font-bold rounded border transition ${
                        p.verdict === 'incorrect'
                          ? 'bg-rose-800 text-white border-rose-900 shadow-sm'
                          : 'bg-[#faf5ea] text-rose-900 border-rose-300 hover:bg-rose-100'
                      }`}
                    >
                      خاطئ ✗
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSetVerdict(p.id, 'pending')}
                      className={`px-2 py-1 text-xs font-bold rounded border transition ${
                        p.verdict === 'pending'
                          ? 'bg-stone-700 text-white border-stone-800'
                          : 'bg-[#faf5ea] text-stone-600 border-stone-300 hover:bg-stone-200'
                      }`}
                    >
                      قيد الانتظار
                    </button>
                  </div>
                </div>
              </div>
              </>
              )}
            </div>
            );
          })
        )}
      </div>
    </div>
  );
};
