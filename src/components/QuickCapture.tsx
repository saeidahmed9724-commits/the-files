import React, { useEffect, useRef, useState } from 'react';
import { Mic, Square, Keyboard, Loader2, Sparkles, X, Check, AlertCircle } from 'lucide-react';
import { callAI } from '../lib/ai';
import { blobToAudioPayload, canRecord, MAX_RECORD_SECONDS, pickRecorderMime } from '../lib/audio';
import {
  EnergyImpact,
  FactSource,
  InfluenceLevel,
  KnowledgeSource,
  KnowledgeStatus,
  LexiconKind,
  LifeFactKind,
  ObservationSource,
  ObservationType,
  PersonDossier,
} from '../types/dossier';
import { CaptureCounts, CaptureSelection } from '../utils/captureApply';
import {
  FACT_SOURCE_LABEL,
  INFLUENCE_LABEL,
  KNOWLEDGE_SOURCE_LABEL,
  KNOWLEDGE_STATUS_LABEL,
  LEXICON_KIND_LABEL,
  LIFE_KIND_LABEL,
} from '../utils/dossierLogic';
import { EnergyPicker } from './EnergyPicker';

interface Props {
  dossier: PersonDossier;
  /** Writes the approved selection into the dossier and returns what was actually saved. */
  onApply: (selection: CaptureSelection, date: string) => CaptureCounts;
}

type Phase = 'idle' | 'recording' | 'processing' | 'review';
type Mode = 'voice' | 'text';
type On<T> = T & { on: boolean };

interface Draft {
  transcript: string;
  date: string;
  entries: On<{ text: string; type: ObservationType; source: ObservationSource; energy?: EnergyImpact | null; tags: string[] }>[];
  changes: On<{ text: string }>[];
  triggers: On<{ text: string; severity: 'mild' | 'moderate' | 'high' }>[];
  comforts: On<{ text: string; impact: 'soothing' | 'uplifting' | 'essential' }>[];
  lexicon: On<{ phrase: string; kind: LexiconKind; meaning: string }>[];
  life: On<{ kind: LifeFactKind; text: string; detail: string; source?: FactSource }>[];
  knowledge: On<{ text: string; status: KnowledgeStatus; source?: KnowledgeSource; via: string }>[];
  circle: On<{ name: string; relation: string; tieToMe: string; influence?: InfluenceLevel }>[];
}

type ListKey = 'entries' | 'changes' | 'triggers' | 'comforts' | 'lexicon' | 'life' | 'knowledge' | 'circle';

const today = () => new Date().toISOString().split('T')[0];
const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

function buildDraft(raw: any): Draft {
  const entries = (raw.entries || []).map((e: any) => ({ ...e, tags: e.tags || [], on: true }));
  // Nothing structured came out, but we do have the user's words: offer them as a plain note.
  if (entries.length === 0 && raw.transcript) {
    entries.push({ text: raw.transcript, type: 'impression', source: 'seen', energy: null, tags: [], on: true });
  }
  return {
    transcript: raw.transcript || '',
    date: today(),
    entries,
    changes: (raw.changes || []).map((text: string) => ({ text, on: true })),
    triggers: (raw.triggers || []).map((t: any) => ({ ...t, on: true })),
    comforts: (raw.comforts || []).map((c: any) => ({ ...c, on: true })),
    lexicon: (raw.lexicon || []).map((l: any) => ({ ...l, meaning: l.meaning || '', on: true })),
    life: (raw.life || []).map((f: any) => ({ ...f, detail: f.detail || '', on: true })),
    knowledge: (raw.knowledge || []).map((k: any) => ({ ...k, via: k.via || '', on: true })),
    circle: (raw.circle || []).map((c: any) => ({ ...c, tieToMe: c.tieToMe || '', on: true })),
  };
}

export const QuickCapture: React.FC<Props> = ({ dossier, onApply }) => {
  const [mode, setMode] = useState<Mode>(canRecord() ? 'voice' : 'text');
  const [phase, setPhase] = useState<Phase>('idle');
  const [elapsed, setElapsed] = useState(0);
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saved, setSaved] = useState<CaptureCounts | null>(null);

  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);
  const cancelledRef = useRef(false);

  const stopTimer = () => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = null;
  };
  const stopStream = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  useEffect(
    () => () => {
      cancelledRef.current = true;
      stopTimer();
      if (recRef.current && recRef.current.state !== 'inactive') recRef.current.stop();
      stopStream();
    },
    []
  );

  // Only the fields the model needs; keeps the request small next to the audio.
  const slimDossier = () => ({
    name: dossier.name,
    relationship: dossier.relationship,
    triggers: dossier.triggers,
    comforts: dossier.comforts,
    lexicon: dossier.lexicon,
    life: dossier.life,
    knowledge: dossier.knowledge,
    circle: dossier.circle,
  });

  const runExtraction = async (body: Record<string, unknown>) => {
    setPhase('processing');
    setError('');
    try {
      const raw = await callAI('extract', { dossier: slimDossier(), ...body });
      const parsed = JSON.parse(raw);
      setDraft(buildDraft(parsed));
      setPhase('review');
    } catch (err: any) {
      setError(err instanceof SyntaxError ? 'رد غير مفهوم من الذكاء الاصطناعي، جرّب تاني.' : err?.message || 'حصل خطأ غير متوقع');
      setPhase('idle');
    }
  };

  const processAudio = async (blob: Blob, seconds: number) => {
    if (seconds < 2) {
      setError('التسجيل قصير جدًا، احكي الموقف في كام جملة.');
      setPhase('idle');
      return;
    }
    setPhase('processing');
    try {
      const audio = await blobToAudioPayload(blob);
      await runExtraction({ audio });
    } catch (err: any) {
      setError(err?.message || 'تعذّرت معالجة التسجيل');
      setPhase('idle');
    }
  };

  const startRecording = async () => {
    setError('');
    setSaved(null);
    if (!canRecord()) {
      setError('المتصفح ده مبيدعمش التسجيل، استخدم الكتابة.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mime = pickRecorderMime();
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      chunksRef.current = [];
      cancelledRef.current = false;
      const startedAt = Date.now();
      rec.ondataavailable = (e) => {
        if (e.data.size) chunksRef.current.push(e.data);
      };
      rec.onstop = () => {
        stopTimer();
        stopStream();
        if (cancelledRef.current) return;
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || mime || 'audio/webm' });
        processAudio(blob, Math.round((Date.now() - startedAt) / 1000));
      };
      rec.start();
      recRef.current = rec;
      setElapsed(0);
      setPhase('recording');
      timerRef.current = window.setInterval(() => setElapsed((s) => s + 1), 1000);
    } catch {
      stopStream();
      setError('مقدرناش نوصل للمايك. اسمح بالإذن من المتصفح أو استخدم الكتابة.');
    }
  };

  const stopRecording = () => {
    if (recRef.current && recRef.current.state !== 'inactive') recRef.current.stop();
  };

  const cancelRecording = () => {
    cancelledRef.current = true;
    stopRecording();
    stopTimer();
    stopStream();
    setPhase('idle');
  };

  useEffect(() => {
    if (phase === 'recording' && elapsed >= MAX_RECORD_SECONDS) stopRecording();
  }, [elapsed, phase]);

  const submitText = () => {
    if (!text.trim()) return;
    setSaved(null);
    runExtraction({ text: text.trim() });
  };

  const discard = () => {
    setDraft(null);
    setPhase('idle');
  };

  const patch = <K extends ListKey>(key: K, i: number, change: Partial<Draft[K][number]>) =>
    setDraft((d) => (d ? { ...d, [key]: d[key].map((x, idx) => (idx === i ? { ...x, ...change } : x)) } : d));

  const save = () => {
    if (!draft) return;
    const selection: CaptureSelection = {
      entries: draft.entries.filter((e) => e.on && e.text.trim()).map(({ on, ...e }) => e),
      changes: draft.changes.filter((c) => c.on).map((c) => c.text),
      triggers: draft.triggers.filter((t) => t.on).map(({ on, ...t }) => t),
      comforts: draft.comforts.filter((c) => c.on).map(({ on, ...c }) => c),
      lexicon: draft.lexicon.filter((l) => l.on).map(({ on, ...l }) => l),
      life: draft.life.filter((f) => f.on).map(({ on, ...f }) => f),
      knowledge: draft.knowledge.filter((k) => k.on).map(({ on, ...k }) => k),
      circle: draft.circle.filter((c) => c.on).map(({ on, ...c }) => c),
    };
    const counts = onApply(selection, draft.date || today());
    setSaved(counts);
    setDraft(null);
    setText('');
    setPhase('idle');
  };

  const selectedCount = draft
    ? [draft.entries, draft.changes, draft.triggers, draft.comforts, draft.lexicon, draft.life, draft.knowledge, draft.circle].reduce(
        (n, a) => n + a.filter((x) => x.on).length,
        0
      )
    : 0;

  const check = (on: boolean, set: (v: boolean) => void, label: string) => (
    <input type="checkbox" checked={on} onChange={(e) => set(e.target.checked)} aria-label={label} className="mt-1 accent-[#8c1d18] shrink-0" />
  );
  const section = (title: string, count: number, children: React.ReactNode) =>
    count > 0 && (
      <div className="mb-3">
        <div className="text-[11px] font-bold text-[#8c1d18] font-typewriter mb-1.5">{title}</div>
        <div className="space-y-2">{children}</div>
      </div>
    );

  return (
    <div className="mb-6 p-4 bg-[#f4ecd8] border-2 border-[#8c6b45] rounded-lg shadow-md">
      <div className="flex flex-wrap justify-between items-center gap-2 mb-3 pb-2 border-b border-[#cca779]">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#8c1d18]" />
          <span className="font-bold text-sm text-[#3d2716]">إدخال سريع بعد ما تقابله</span>
          <span className="font-typewriter text-[10px] text-[#7a5f45]">VOICE MEMO TO DOSSIER</span>
        </div>
        {phase !== 'review' && phase !== 'recording' && phase !== 'processing' && (
          <div className="flex rounded overflow-hidden border border-[#a68660] text-xs font-bold">
            <button
              type="button"
              onClick={() => setMode('voice')}
              className={`px-3 py-1 flex items-center gap-1 ${mode === 'voice' ? 'bg-[#8c1d18] text-white' : 'bg-[#faf5eb] text-[#5c4028]'}`}
            >
              <Mic className="w-3.5 h-3.5" /> صوت
            </button>
            <button
              type="button"
              onClick={() => setMode('text')}
              className={`px-3 py-1 flex items-center gap-1 ${mode === 'text' ? 'bg-[#8c1d18] text-white' : 'bg-[#faf5eb] text-[#5c4028]'}`}
            >
              <Keyboard className="w-3.5 h-3.5" /> كتابة
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="mb-3 text-[11px] text-rose-800 bg-rose-100 border border-rose-300 rounded px-2 py-1.5 flex items-start gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {saved && phase === 'idle' && (
        <div className="mb-3 text-[11px] text-emerald-900 bg-emerald-100 border border-emerald-400 rounded px-2 py-1.5">
          اتحفظ: {saved.entries} موقف
          {saved.changes ? `، ${saved.changes} تغير` : ''}
          {saved.triggers ? `، ${saved.triggers} محفز` : ''}
          {saved.comforts ? `، ${saved.comforts} مريح` : ''}
          {saved.lexicon ? `، ${saved.lexicon} في القاموس` : ''}
          {saved.life ? `، ${saved.life} عن حياته` : ''}
          {saved.knowledge ? `، ${saved.knowledge} عن اللي عارفه عني` : ''}
          {saved.circle ? `، ${saved.circle} في دايرته` : ''}
          {saved.skippedDuplicates ? ` (اتخطّينا ${saved.skippedDuplicates} مكرر)` : ''}.
        </div>
      )}

      {phase === 'idle' && mode === 'voice' && (
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <button
            type="button"
            onClick={startRecording}
            className="px-5 py-2.5 bg-[#8c1d18] hover:bg-[#731713] text-white text-sm font-bold rounded-lg shadow flex items-center gap-2"
          >
            <Mic className="w-4 h-4" /> ابدأ التسجيل
          </button>
          <p className="text-xs text-[#6e5033] leading-relaxed">
            احكي اللي حصل في دقيقة. الذكاء الاصطناعي هيفرّغه ويوزعه على السجل والتغيرات والمحفزات والقاموس، وإنت بتراجعه قبل الحفظ.
          </p>
        </div>
      )}

      {phase === 'idle' && mode === 'text' && (
        <div>
          <textarea
            rows={3}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="اكتب اللي حصل زي ما بتحكيه لصاحبك: الموقف، قال إيه، اتصرف إزاي، حسيت بإيه بعدها..."
            className="w-full bg-white border border-[#a68660] p-2.5 text-xs rounded focus:outline-none"
          />
          <div className="flex justify-end mt-2">
            <button
              type="button"
              onClick={submitText}
              disabled={!text.trim()}
              className="px-4 py-1.5 bg-[#8c1d18] hover:bg-[#731713] disabled:opacity-40 text-white text-xs font-bold rounded shadow flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" /> وزّع الملاحظة
            </button>
          </div>
        </div>
      )}

      {phase === 'recording' && (
        <div className="flex flex-wrap items-center gap-3">
          <span className="w-3 h-3 rounded-full bg-red-600 animate-pulse" aria-hidden="true" />
          <span className="font-typewriter text-sm font-bold text-[#3a2617]" dir="ltr">
            {fmt(elapsed)} / {fmt(MAX_RECORD_SECONDS)}
          </span>
          <button
            type="button"
            onClick={stopRecording}
            className="px-4 py-2 bg-[#2d2016] hover:bg-black text-white text-xs font-bold rounded-lg flex items-center gap-1.5"
          >
            <Square className="w-3.5 h-3.5 fill-white" /> إنهاء وتفريغ
          </button>
          <button type="button" onClick={cancelRecording} className="px-3 py-2 text-xs text-stone-600 border border-stone-300 rounded-lg hover:bg-stone-100">
            إلغاء
          </button>
        </div>
      )}

      {phase === 'processing' && (
        <div className="flex items-center gap-2 text-xs font-bold text-[#5c4028] py-2">
          <Loader2 className="w-4 h-4 animate-spin" /> جاري التفريغ وتوزيع المعلومات...
        </div>
      )}

      {phase === 'review' && draft && (
        <div>
          {draft.transcript && (
            <details className="mb-3 text-xs text-[#5c4028]">
              <summary className="cursor-pointer font-bold">التفريغ</summary>
              <p className="mt-1.5 p-2 bg-[#faf5eb] border border-[#d6be90] rounded leading-relaxed whitespace-pre-wrap">{draft.transcript}</p>
            </details>
          )}

          <div className="mb-3 flex items-center gap-2 text-xs">
            <label className="font-bold text-[#5c4028] font-typewriter">التاريخ:</label>
            <input
              type="date"
              value={draft.date}
              onChange={(e) => setDraft({ ...draft, date: e.target.value })}
              className="bg-[#faf5eb] border border-[#a68660] p-1.5 rounded focus:outline-none"
            />
          </div>

          {section('الموقف ← السجل الزمني', draft.entries.length,
            draft.entries.map((e, i) => (
              <div key={i} className="flex gap-2 p-2 bg-[#faf5ec] border border-[#d6be90] rounded">
                {check(e.on, (v) => patch('entries', i, { on: v }), 'حفظ الموقف')}
                <div className="flex-1 min-w-0 space-y-2">
                  <textarea
                    rows={2}
                    value={e.text}
                    onChange={(ev) => patch('entries', i, { text: ev.target.value })}
                    className="w-full bg-white border border-[#a68660] p-2 text-xs rounded focus:outline-none"
                  />
                  <EnergyPicker compact value={e.energy} onChange={(v) => patch('entries', i, { energy: v ?? null })} />
                </div>
              </div>
            )))}

          {section('تغير في الشخصية ← صفحة التغير عبر الزمن', draft.changes.length,
            draft.changes.map((c, i) => (
              <div key={i} className="flex gap-2 p-2 bg-[#faf5ec] border border-[#d6be90] rounded">
                {check(c.on, (v) => patch('changes', i, { on: v }), 'حفظ التغير')}
                <input
                  value={c.text}
                  onChange={(ev) => patch('changes', i, { text: ev.target.value })}
                  className="flex-1 bg-white border border-[#a68660] p-1.5 text-xs rounded focus:outline-none"
                />
              </div>
            )))}

          {section('بيضايقه ← المحفزات', draft.triggers.length,
            draft.triggers.map((t, i) => (
              <div key={i} className="flex gap-2 p-2 bg-[#faf5ec] border border-[#d6be90] rounded">
                {check(t.on, (v) => patch('triggers', i, { on: v }), 'حفظ المحفز')}
                <input
                  value={t.text}
                  onChange={(ev) => patch('triggers', i, { text: ev.target.value })}
                  className="flex-1 bg-white border border-[#a68660] p-1.5 text-xs rounded focus:outline-none"
                />
              </div>
            )))}

          {section('بيريحه ← المريحات', draft.comforts.length,
            draft.comforts.map((c, i) => (
              <div key={i} className="flex gap-2 p-2 bg-[#faf5ec] border border-[#d6be90] rounded">
                {check(c.on, (v) => patch('comforts', i, { on: v }), 'حفظ المريح')}
                <input
                  value={c.text}
                  onChange={(ev) => patch('comforts', i, { text: ev.target.value })}
                  className="flex-1 bg-white border border-[#a68660] p-1.5 text-xs rounded focus:outline-none"
                />
              </div>
            )))}

          {section('لزمات وكلمات ← القاموس', draft.lexicon.length,
            draft.lexicon.map((l, i) => (
              <div key={i} className="flex gap-2 p-2 bg-[#faf5ec] border border-[#d6be90] rounded">
                {check(l.on, (v) => patch('lexicon', i, { on: v }), 'حفظ في القاموس')}
                <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-3 gap-1.5">
                  <input
                    value={l.phrase}
                    onChange={(ev) => patch('lexicon', i, { phrase: ev.target.value })}
                    className="bg-white border border-[#a68660] p-1.5 text-xs rounded focus:outline-none"
                  />
                  <select
                    value={l.kind}
                    onChange={(ev) => patch('lexicon', i, { kind: ev.target.value as LexiconKind })}
                    className="bg-[#faf5eb] border border-[#a68660] p-1.5 text-xs rounded focus:outline-none"
                  >
                    {(Object.keys(LEXICON_KIND_LABEL) as LexiconKind[]).map((k) => (
                      <option key={k} value={k}>{LEXICON_KIND_LABEL[k]}</option>
                    ))}
                  </select>
                  <input
                    value={l.meaning}
                    placeholder="بتدل على إيه؟"
                    onChange={(ev) => patch('lexicon', i, { meaning: ev.target.value })}
                    className="bg-white border border-[#a68660] p-1.5 text-xs rounded focus:outline-none"
                  />
                </div>
              </div>
            )))}

          {section('حياته اليومية ← صفحة حياته ودايرته', draft.life.length,
            draft.life.map((f, i) => (
              <div key={i} className="flex gap-2 p-2 bg-[#faf5ec] border border-[#d6be90] rounded">
                {check(f.on, (v) => patch('life', i, { on: v }), 'حفظ معلومة عن حياته')}
                <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-3 gap-1.5">
                  <select
                    value={f.kind}
                    onChange={(ev) => patch('life', i, { kind: ev.target.value as LifeFactKind })}
                    className="bg-[#faf5eb] border border-[#a68660] p-1.5 text-xs rounded focus:outline-none"
                  >
                    {(Object.keys(LIFE_KIND_LABEL) as LifeFactKind[]).map((k) => (
                      <option key={k} value={k}>{LIFE_KIND_LABEL[k]}</option>
                    ))}
                  </select>
                  <input
                    value={f.text}
                    onChange={(ev) => patch('life', i, { text: ev.target.value })}
                    className="bg-white border border-[#a68660] p-1.5 text-xs rounded focus:outline-none sm:col-span-2"
                  />
                  <input
                    value={f.detail}
                    placeholder="قد إيه / إمتى؟"
                    onChange={(ev) => patch('life', i, { detail: ev.target.value })}
                    className="bg-white border border-[#a68660] p-1.5 text-xs rounded focus:outline-none sm:col-span-2"
                  />
                  <select
                    value={f.source || ''}
                    onChange={(ev) => patch('life', i, { source: (ev.target.value || undefined) as FactSource | undefined })}
                    className="bg-[#faf5eb] border border-[#a68660] p-1.5 text-xs rounded focus:outline-none"
                  >
                    <option value="">المصدر؟</option>
                    {(Object.keys(FACT_SOURCE_LABEL) as FactSource[]).map((k) => (
                      <option key={k} value={k}>{FACT_SOURCE_LABEL[k]}</option>
                    ))}
                  </select>
                </div>
              </div>
            )))}

          {section('هو عارف إيه عني ← سجل المعرفة', draft.knowledge.length,
            draft.knowledge.map((k, i) => (
              <div key={i} className="flex gap-2 p-2 bg-[#faf5ec] border border-[#d6be90] rounded">
                {check(k.on, (v) => patch('knowledge', i, { on: v }), 'حفظ في سجل المعرفة')}
                <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-3 gap-1.5">
                  <input
                    value={k.text}
                    onChange={(ev) => patch('knowledge', i, { text: ev.target.value })}
                    className="bg-white border border-[#a68660] p-1.5 text-xs rounded focus:outline-none sm:col-span-3"
                  />
                  <select
                    value={k.status}
                    onChange={(ev) => patch('knowledge', i, { status: ev.target.value as KnowledgeStatus })}
                    className="bg-[#faf5eb] border border-[#a68660] p-1.5 text-xs rounded focus:outline-none"
                  >
                    {(Object.keys(KNOWLEDGE_STATUS_LABEL) as KnowledgeStatus[]).map((x) => (
                      <option key={x} value={x}>{KNOWLEDGE_STATUS_LABEL[x]}</option>
                    ))}
                  </select>
                  <select
                    value={k.source || ''}
                    onChange={(ev) => patch('knowledge', i, { source: (ev.target.value || undefined) as KnowledgeSource | undefined })}
                    className="bg-[#faf5eb] border border-[#a68660] p-1.5 text-xs rounded focus:outline-none"
                  >
                    <option value="">عرفها إزاي؟</option>
                    {(Object.keys(KNOWLEDGE_SOURCE_LABEL) as KnowledgeSource[]).map((x) => (
                      <option key={x} value={x}>{KNOWLEDGE_SOURCE_LABEL[x]}</option>
                    ))}
                  </select>
                  <input
                    value={k.via}
                    placeholder="عن طريق مين؟"
                    onChange={(ev) => patch('knowledge', i, { via: ev.target.value })}
                    className="bg-white border border-[#a68660] p-1.5 text-xs rounded focus:outline-none"
                  />
                </div>
              </div>
            )))}

          {section('ناس في حياته ← دايرته', draft.circle.length,
            draft.circle.map((c, i) => (
              <div key={i} className="flex gap-2 p-2 bg-[#faf5ec] border border-[#d6be90] rounded">
                {check(c.on, (v) => patch('circle', i, { on: v }), 'حفظ في دايرته')}
                <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-3 gap-1.5">
                  <input
                    value={c.name}
                    onChange={(ev) => patch('circle', i, { name: ev.target.value })}
                    className="bg-white border border-[#a68660] p-1.5 text-xs rounded focus:outline-none"
                  />
                  <input
                    value={c.relation}
                    placeholder="علاقته بيه"
                    onChange={(ev) => patch('circle', i, { relation: ev.target.value })}
                    className="bg-white border border-[#a68660] p-1.5 text-xs rounded focus:outline-none"
                  />
                  <select
                    value={c.influence || ''}
                    onChange={(ev) => patch('circle', i, { influence: (ev.target.value || undefined) as InfluenceLevel | undefined })}
                    className="bg-[#faf5eb] border border-[#a68660] p-1.5 text-xs rounded focus:outline-none"
                  >
                    <option value="">بيسمع كلامه؟</option>
                    {(Object.keys(INFLUENCE_LABEL) as InfluenceLevel[]).map((x) => (
                      <option key={x} value={x}>{INFLUENCE_LABEL[x]}</option>
                    ))}
                  </select>
                  <input
                    value={c.tieToMe}
                    placeholder="علاقته بيا (اختياري)"
                    onChange={(ev) => patch('circle', i, { tieToMe: ev.target.value })}
                    className="bg-white border border-[#a68660] p-1.5 text-xs rounded focus:outline-none sm:col-span-3"
                  />
                </div>
              </div>
            )))}

          {selectedCount === 0 && draft.entries.length + draft.changes.length + draft.triggers.length + draft.comforts.length + draft.lexicon.length + draft.life.length + draft.knowledge.length + draft.circle.length === 0 && (
            <p className="text-xs text-[#6e5033] mb-3">ما لقيتش حاجة واضحة أحفظها. جرّب تحكي بتفاصيل أكتر.</p>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-[#cca779]">
            <button type="button" onClick={discard} className="px-3 py-1.5 text-xs text-stone-600 border border-stone-300 rounded hover:bg-stone-100 flex items-center gap-1">
              <X className="w-3.5 h-3.5" /> تجاهل
            </button>
            <button
              type="button"
              onClick={save}
              disabled={selectedCount === 0}
              className="px-5 py-1.5 bg-[#8c1d18] hover:bg-[#731713] disabled:opacity-40 text-white text-xs font-bold rounded shadow flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" /> حفظ المحدد ({selectedCount})
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
