import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Wand2, Loader2, FileUp, Check, AlertCircle, Info } from 'lucide-react';
import { callAI } from '../lib/ai';
import { PersonDossier } from '../types/dossier';
import {
  applyImport,
  ImportCounts,
  ImportResult,
  ImportSelection,
  isBlankValue,
  MIND_KEYS,
  MIND_LABEL,
  MindKey,
  ProfileKey,
  PROFILE_LABEL,
  totalImported,
} from '../utils/importApply';
import { INFLUENCE_LABEL, LEXICON_KIND_LABEL, LIFE_KIND_LABEL } from '../utils/dossierLogic';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  dossier: PersonDossier;
  linkable?: { id: string; name: string }[];
  /** Writes the patch into the dossier. */
  onApply: (patch: Partial<PersonDossier>) => void;
}

type Phase = 'input' | 'processing' | 'review' | 'done';
type ListKey = 'entries' | 'changes' | 'triggers' | 'comforts' | 'lexicon' | 'life' | 'knowledge' | 'circle';

const MAX_CHARS = 40000;
const PROFILE_KEYS: ProfileKey[] = ['age', 'occupation', 'relationship', 'knownSince', 'emotionalStability', 'personalitySummary'];

const CONF_LABEL = { low: 'ثقة منخفضة', medium: 'ثقة متوسطة', high: 'ثقة عالية' } as const;
const SEVERITY_LABEL = { mild: 'خفيف', moderate: 'متوسط', high: 'قوي' } as const;
const IMPACT_LABEL = { soothing: 'بيهدّيه', uplifting: 'بيفرّحه', essential: 'أساسي' } as const;
const KNOW_LABEL = { knows: 'عارف', unsure: 'مش متأكد', unknown: 'مش عارف' } as const;
const TYPE_LABEL = { incident: 'موقف', conversation: 'حوار', impression: 'انطباع' } as const;

const LIST_TITLE: Record<ListKey, string> = {
  entries: 'انطباعات تتضاف للسجل',
  changes: 'تغيرات عن زمان',
  triggers: 'اللي بيضايقه',
  comforts: 'اللي بيفرحه ويريحه',
  lexicon: 'قاموسه ولزماته',
  life: 'حياته اليومية',
  knowledge: 'اللي عارفه عنك',
  circle: 'دايرته',
};

interface Row {
  text: string;
  badge?: string;
  sub?: string;
}

const today = () => new Date().toISOString().split('T')[0];

function listRows(r: ImportResult): Record<ListKey, Row[]> {
  return {
    entries: r.entries.map((e) => ({ text: e.text, badge: TYPE_LABEL[e.type] })),
    changes: r.changes.map((c) => ({ text: c })),
    triggers: r.triggers.map((t) => ({ text: t.text, badge: SEVERITY_LABEL[t.severity] })),
    comforts: r.comforts.map((c) => ({ text: c.text, badge: IMPACT_LABEL[c.impact] })),
    lexicon: r.lexicon.map((l) => ({ text: l.phrase, badge: LEXICON_KIND_LABEL[l.kind], sub: l.meaning || undefined })),
    life: r.life.map((f) => ({ text: f.text, badge: LIFE_KIND_LABEL[f.kind], sub: f.detail || undefined })),
    knowledge: r.knowledge.map((k) => ({ text: k.text, badge: KNOW_LABEL[k.status], sub: k.via ? `عن طريق ${k.via}` : undefined })),
    circle: r.circle.map((c) => ({
      text: c.name,
      badge: c.influence ? INFLUENCE_LABEL[c.influence] : undefined,
      sub: [c.relation, c.tieToMe].filter(Boolean).join(' • ') || undefined,
    })),
  };
}

const LIST_KEYS: ListKey[] = ['entries', 'triggers', 'comforts', 'circle', 'life', 'lexicon', 'knowledge', 'changes'];

export const ImportProfileModal: React.FC<Props> = ({ isOpen, onClose, dossier, linkable = [], onApply }) => {
  const [phase, setPhase] = useState<Phase>('input');
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [result, setResult] = useState<ImportResult | null>(null);
  const [profileOn, setProfileOn] = useState<Record<string, boolean>>({});
  const [mindOn, setMindOn] = useState<Record<string, boolean>>({});
  const [listOn, setListOn] = useState<Record<ListKey, boolean[]>>({} as Record<ListKey, boolean[]>);
  const [counts, setCounts] = useState<ImportCounts | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setPhase('input');
      setText('');
      setError('');
      setResult(null);
      setCounts(null);
    }
  }, [isOpen]);

  const existingProfile = (k: ProfileKey): string => {
    if (k === 'emotionalStability') return dossier.emotionalStability === 3 ? '' : `${dossier.emotionalStability} نجوم`;
    const v = dossier[k] as string | number;
    return isBlankValue(v) ? '' : String(v);
  };

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      const content = await file.text();
      setText(content);
      setError('');
    } catch {
      setError('تعذّر قراءة الملف، جرّب ملف نصي (txt أو md).');
    }
  };

  const run = async () => {
    setPhase('processing');
    setError('');
    try {
      // Only what the AI needs to avoid repeating items: not the whole dossier.
      const slim = {
        name: dossier.name,
        relationship: dossier.relationship,
        triggers: dossier.triggers,
        comforts: dossier.comforts,
        lexicon: dossier.lexicon,
        life: dossier.life,
        circle: dossier.circle,
      };
      const raw = await callAI('import', { dossier: slim, text });
      const r = JSON.parse(raw) as ImportResult;

      // Defaults: tick everything new; tick a filled-in field only if it is empty today.
      const p: Record<string, boolean> = {};
      PROFILE_KEYS.forEach((k) => {
        const v = r.profile[k];
        p[k] = v !== null && v !== undefined && !existingProfile(k);
      });
      const m: Record<string, boolean> = {};
      MIND_KEYS.forEach((k) => (m[k] = !!r.mind[k]?.text));
      const rows = listRows(r);
      const l = {} as Record<ListKey, boolean[]>;
      LIST_KEYS.forEach((k) => (l[k] = rows[k].map(() => true)));

      setProfileOn(p);
      setMindOn(m);
      setListOn(l);
      setResult(r);
      setPhase('review');
    } catch (err: any) {
      setError(err?.message || 'حصل خطأ غير متوقع');
      setPhase('input');
    }
  };

  const selectedCount = () => {
    if (!result) return 0;
    return (
      Object.values(profileOn).filter(Boolean).length +
      Object.values(mindOn).filter(Boolean).length +
      LIST_KEYS.reduce((n, k) => n + (listOn[k] || []).filter(Boolean).length, 0)
    );
  };

  const apply = () => {
    if (!result) return;
    const pick = <T,>(arr: T[], key: ListKey): T[] => arr.filter((_, i) => listOn[key]?.[i]);
    const sel: ImportSelection = {
      profile: {},
      mind: {},
      entries: pick(result.entries, 'entries'),
      changes: pick(result.changes, 'changes'),
      triggers: pick(result.triggers, 'triggers'),
      comforts: pick(result.comforts, 'comforts'),
      lexicon: pick(result.lexicon, 'lexicon'),
      life: pick(result.life, 'life'),
      knowledge: pick(result.knowledge, 'knowledge'),
      circle: pick(result.circle, 'circle'),
    };
    PROFILE_KEYS.forEach((k) => {
      const v = result.profile[k];
      if (profileOn[k] && v !== null && v !== undefined) (sel.profile as any)[k] = v;
    });
    MIND_KEYS.forEach((k) => {
      if (mindOn[k] && result.mind[k]?.text) sel.mind[k] = result.mind[k];
    });

    const { patch, counts: c } = applyImport(dossier, sel, today(), Date.now(), linkable);
    onApply(patch);
    setCounts(c);
    setPhase('done');
  };

  const toggleList = (k: ListKey, i: number) =>
    setListOn((prev) => ({ ...prev, [k]: prev[k].map((v, idx) => (idx === i ? !v : v)) }));

  const Check_ = ({ on, onClick }: { on: boolean; onClick: () => void }) => (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={`mt-0.5 w-5 h-5 shrink-0 rounded border-2 flex items-center justify-center transition ${
        on ? 'bg-[#8c1d18] border-[#8c1d18] text-white' : 'bg-white border-[#a68660]'
      }`}
    >
      {on && <Check className="w-3.5 h-3.5" />}
    </button>
  );

  const Badge = ({ children }: { children: React.ReactNode }) => (
    <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#ebd9bd] border border-[#cca779] text-[#5c4028] whitespace-nowrap">
      {children}
    </span>
  );

  const rows = result ? listRows(result) : null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 24 }}
            transition={{ type: 'spring', stiffness: 300, damping: 26 }}
            className="bg-[#fcf8f0] border-4 border-[#8c6b45] max-w-3xl w-full rounded-lg shadow-2xl p-4 sm:p-6 text-right font-arabic-body max-h-[92vh] flex flex-col"
          >
            {/* Header */}
            <div className="flex justify-between items-center pb-3 border-b-2 border-[#b5956f] shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="p-1 rounded hover:bg-[#ebd9bd] text-[#5c4028] transition"
                aria-label="إغلاق"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-2">
                <Wand2 className="w-5 h-5 text-[#8c1d18]" />
                <h2 className="text-base sm:text-lg font-bold text-[#3d2716]">املأ الملف من نص</h2>
              </div>
            </div>

            {/* ---------------- Input ---------------- */}
            {(phase === 'input' || phase === 'processing') && (
              <div className="pt-4 flex flex-col gap-3 overflow-y-auto">
                <p className="text-xs text-[#5c4028] leading-relaxed">
                  الصق أي كلام عن {dossier.name}: وصف، إجابات أسئلة، ملاحظات، شات، بأي ترتيب وأي طول. الذكاء الاصطناعي هيوزّعه على
                  الملف كله (الخلاصة، العقل، المحفزات، الدايرة، الحياة، السجل...) وانت تراجع قبل ما يتكتب.
                </p>

                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  disabled={phase === 'processing'}
                  rows={12}
                  placeholder="الصق النص هنا..."
                  className="w-full bg-white border border-[#a68660] p-3 text-xs sm:text-sm rounded text-[#1a110a] focus:outline-none leading-relaxed"
                />

                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <input
                      ref={fileRef}
                      type="file"
                      accept=".txt,.md,.text,text/plain,text/markdown"
                      className="hidden"
                      onChange={(e) => {
                        handleFile(e.target.files?.[0]);
                        e.target.value = '';
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      disabled={phase === 'processing'}
                      className="px-3 py-1.5 bg-[#f4ecd8] border border-[#a68660] hover:bg-[#fff9ec] text-[#4a3422] text-xs font-bold rounded flex items-center gap-1.5 transition disabled:opacity-50"
                    >
                      <FileUp className="w-3.5 h-3.5" />
                      <span>ارفع ملف نصي</span>
                    </button>
                    <span className={`text-[11px] ${text.length > MAX_CHARS ? 'text-rose-700 font-bold' : 'text-[#7a5f45]'}`}>
                      {text.length.toLocaleString('en-US')} / {MAX_CHARS.toLocaleString('en-US')} حرف
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={run}
                    disabled={phase === 'processing' || text.trim().length < 40}
                    className="px-5 py-2 bg-[#8c1d18] hover:bg-[#731713] disabled:opacity-50 text-[#fbf7ee] text-xs sm:text-sm font-bold rounded shadow transition flex items-center gap-2"
                  >
                    {phase === 'processing' ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>بيقرا ويوزّع...</span>
                      </>
                    ) : (
                      <>
                        <Wand2 className="w-4 h-4" />
                        <span>حلّل وجهّز الملف</span>
                      </>
                    )}
                  </button>
                </div>

                {text.length > MAX_CHARS && (
                  <div className="text-[11px] text-amber-900 bg-amber-100 border border-amber-300 rounded px-2 py-1.5 flex items-start gap-1.5">
                    <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                    <span>النص أطول من الحد، هيتقرا أول {MAX_CHARS.toLocaleString('en-US')} حرف بس. قسّمه على مرتين لو عايز كله.</span>
                  </div>
                )}
                {error && (
                  <div className="text-[11px] text-rose-800 bg-rose-100 border border-rose-300 rounded px-2 py-1.5 flex items-start gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}
              </div>
            )}

            {/* ---------------- Review ---------------- */}
            {phase === 'review' && result && rows && (
              <>
                <div className="pt-3 shrink-0 text-[11px] text-[#7a5f45] flex items-start gap-1.5">
                  <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  <span>
                    ده استنتاج من النص، مش حقايق. شيل العلامة من أي حاجة مش عايزها. اللي مكتوب عندك فعلًا مش هيتمسح: النص الجديد
                    بيتضاف تحته.
                    {result.truncated && ' (النص كان طويل جدًا فاتقرا أوله بس.)'}
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto mt-3 space-y-5 pr-1">
                  {/* Profile fields */}
                  {PROFILE_KEYS.some((k) => result.profile[k] !== null && result.profile[k] !== undefined) && (
                    <section>
                      <h3 className="text-sm font-bold text-[#3d2716] mb-2 border-b border-[#cca779] pb-1">بيانات الملف</h3>
                      <div className="space-y-2">
                        {PROFILE_KEYS.map((k) => {
                          const v = result.profile[k];
                          if (v === null || v === undefined) return null;
                          const existing = existingProfile(k);
                          return (
                            <div key={k} className="flex gap-2 items-start">
                              <Check_ on={!!profileOn[k]} onClick={() => setProfileOn((p) => ({ ...p, [k]: !p[k] }))} />
                              <div className="flex-1 text-xs sm:text-sm">
                                <span className="font-bold text-[#8c1d18]">{PROFILE_LABEL[k]}: </span>
                                <span className="text-[#2c1d11]">{k === 'emotionalStability' ? `${v} من 5` : String(v)}</span>
                                {existing && (
                                  <div className="text-[11px] text-[#7a5f45] mt-0.5">
                                    عندك دلوقتي: {existing} (لو علّمت هيتبدّل)
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </section>
                  )}

                  {/* Mind */}
                  {MIND_KEYS.some((k) => result.mind[k]?.text) && (
                    <section>
                      <h3 className="text-sm font-bold text-[#3d2716] mb-2 border-b border-[#cca779] pb-1">العقل والتفكير</h3>
                      <div className="space-y-2.5">
                        {MIND_KEYS.map((k: MindKey) => {
                          const f = result.mind[k];
                          if (!f?.text) return null;
                          const hasExisting = !!String(dossier.mind[k] || '').trim();
                          return (
                            <div key={k} className="flex gap-2 items-start">
                              <Check_ on={!!mindOn[k]} onClick={() => setMindOn((p) => ({ ...p, [k]: !p[k] }))} />
                              <div className="flex-1 text-xs sm:text-sm">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-bold text-[#8c1d18]">{MIND_LABEL[k]}</span>
                                  <Badge>{CONF_LABEL[f.confidence]}</Badge>
                                </div>
                                <p className="text-[#2c1d11] leading-relaxed mt-0.5">{f.text}</p>
                                {hasExisting && (
                                  <div className="text-[11px] text-[#7a5f45] mt-0.5">هيتضاف تحت اللي مكتوب عندك</div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </section>
                  )}

                  {/* Lists */}
                  {LIST_KEYS.map((k) =>
                    rows[k].length ? (
                      <section key={k}>
                        <h3 className="text-sm font-bold text-[#3d2716] mb-2 border-b border-[#cca779] pb-1">
                          {LIST_TITLE[k]} <span className="text-[11px] font-normal text-[#7a5f45]">({rows[k].length})</span>
                        </h3>
                        <div className="space-y-2">
                          {rows[k].map((row, i) => (
                            <div key={i} className="flex gap-2 items-start">
                              <Check_ on={!!listOn[k]?.[i]} onClick={() => toggleList(k, i)} />
                              <div className="flex-1 text-xs sm:text-sm">
                                <div className="flex items-start gap-2 flex-wrap">
                                  <span className="text-[#2c1d11] leading-relaxed">{row.text}</span>
                                  {row.badge && <Badge>{row.badge}</Badge>}
                                </div>
                                {row.sub && <div className="text-[11px] text-[#7a5f45] mt-0.5">{row.sub}</div>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </section>
                    ) : null
                  )}
                </div>

                <div className="pt-3 mt-3 border-t-2 border-[#b5956f] flex items-center justify-between gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setPhase('input')}
                    className="px-3 py-2 text-xs text-[#5c4028] hover:underline"
                  >
                    رجوع للنص
                  </button>
                  <button
                    type="button"
                    onClick={apply}
                    disabled={selectedCount() === 0}
                    className="px-5 py-2 bg-[#8c1d18] hover:bg-[#731713] disabled:opacity-50 text-[#fbf7ee] text-xs sm:text-sm font-bold rounded shadow transition flex items-center gap-2"
                  >
                    <Check className="w-4 h-4" />
                    <span>املأ الملف ({selectedCount()})</span>
                  </button>
                </div>
              </>
            )}

            {/* ---------------- Done ---------------- */}
            {phase === 'done' && counts && (
              <div className="py-8 text-center">
                <div className="mx-auto w-12 h-12 rounded-full bg-emerald-100 border-2 border-emerald-600 flex items-center justify-center mb-3">
                  <Check className="w-6 h-6 text-emerald-700" />
                </div>
                <h3 className="text-base font-bold text-[#3d2716] mb-2">
                  {totalImported(counts) > 0 ? `اتملّى الملف (${totalImported(counts)} عنصر)` : 'مفيش حاجة جديدة اتضافت'}
                </h3>
                <p className="text-xs text-[#5c4028] leading-relaxed max-w-md mx-auto">
                  {[
                    counts.profileFields && `${counts.profileFields} من بيانات الملف`,
                    counts.mindFields && `${counts.mindFields} في العقل والتفكير`,
                    counts.triggers && `${counts.triggers} محفز`,
                    counts.comforts && `${counts.comforts} مريح`,
                    counts.entries && `${counts.entries} في السجل`,
                    counts.circle && `${counts.circle} في الدايرة`,
                    counts.life && `${counts.life} عن حياته`,
                    counts.lexicon && `${counts.lexicon} في القاموس`,
                    counts.knowledge && `${counts.knowledge} عن اللي يعرفه`,
                    counts.changes && `${counts.changes} تغير`,
                  ]
                    .filter(Boolean)
                    .join(' • ')}
                  {counts.skippedDuplicates > 0 && ` • اتجاهلت ${counts.skippedDuplicates} مكرر`}
                </p>
                <p className="text-[11px] text-[#7a5f45] mt-3">كل حاجة اتضافت تقدر تعدلها أو تمسحها من صفحتها.</p>
                <button
                  type="button"
                  onClick={onClose}
                  className="mt-5 px-6 py-2 bg-[#8c1d18] hover:bg-[#731713] text-[#fbf7ee] text-sm font-bold rounded shadow transition"
                >
                  تمام
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
