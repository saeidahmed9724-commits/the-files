import React, { useState } from 'react';
import { BookHeart, Target, Flame, Trash2, Loader2, Sparkles, Plus, Check, Pause, Play, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { callAI } from '../../lib/ai';
import { GoalItem, GoalStatus, JournalEntry, PersonDossier } from '../../types/dossier';
import {
  dailySeries,
  daysUntil,
  ENERGY_LABEL,
  goalProgress,
  journalStats,
  makeGoal,
  makeJournalEntry,
  MOOD_EMOJI,
  MOOD_LABEL,
  normalizeTags,
  tagImpacts,
  todayStr,
} from '../../utils/selfLogic';

interface Props {
  dossier: PersonDossier;
  onUpdateDossier: (updated: Partial<PersonDossier>) => void;
}

type Tab = 'journal' | 'goals';

const MOOD_COLOR = ['', '#b3402f', '#c9772f', '#c9a93b', '#7a9a45', '#3f8a4f'];
const MIN_ENTRIES_FOR_AI = 3;
const SHOWN_ENTRIES = 12;

export const Page10Diary: React.FC<Props> = ({ dossier, onUpdateDossier }) => {
  const [tab, setTab] = useState<Tab>('journal');

  // ----- journal state -----
  const journal: JournalEntry[] = dossier.journal || [];
  const [mood, setMood] = useState(3);
  const [energy, setEnergy] = useState(3);
  const [text, setText] = useState('');
  const [tagsRaw, setTagsRaw] = useState('');
  const [date, setDate] = useState(todayStr());
  const [showAll, setShowAll] = useState(false);
  const [review, setReview] = useState('');
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewError, setReviewError] = useState('');

  // ----- goals state -----
  const goals: GoalItem[] = dossier.goals || [];
  const [goalText, setGoalText] = useState('');
  const [goalDate, setGoalDate] = useState('');

  const stats = journalStats(journal);
  const series = dailySeries(journal, 30);
  const impacts = tagImpacts(journal);
  const sorted = [...journal].sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
  const shown = showAll ? sorted : sorted.slice(0, SHOWN_ENTRIES);
  const gp = goalProgress(goals);

  const addEntry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() && !tagsRaw.trim()) return;
    const entry = makeJournalEntry({ mood, energy, text, tags: normalizeTags(tagsRaw), date: date || todayStr() });
    onUpdateDossier({ journal: [entry, ...journal] });
    setText('');
    setTagsRaw('');
    setReview('');
  };

  const removeEntry = (id: string) => onUpdateDossier({ journal: journal.filter((j) => j.id !== id) });

  const runReview = async () => {
    setReviewLoading(true);
    setReviewError('');
    setReview('');
    try {
      setReview(await callAI('selfreview', { dossier }));
    } catch (err: any) {
      setReviewError(err?.message || 'حصل خطأ غير متوقع');
    } finally {
      setReviewLoading(false);
    }
  };

  const addGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!goalText.trim()) return;
    onUpdateDossier({ goals: [makeGoal(goalText, goalDate), ...goals] });
    setGoalText('');
    setGoalDate('');
  };
  const setGoalStatus = (id: string, status: GoalStatus) =>
    onUpdateDossier({ goals: goals.map((g) => (g.id === id ? { ...g, status } : g)) });
  const removeGoal = (id: string) => onUpdateDossier({ goals: goals.filter((g) => g.id !== id) });

  // ----- chart -----
  const W = 300;
  const H = 80;
  const barW = W / series.length;
  const energyPoints = series
    .map((p, i) => (p.energy === null ? null : `${(i * barW + barW / 2).toFixed(1)},${(H - (p.energy / 5) * (H - 8) - 2).toFixed(1)}`))
    .filter(Boolean)
    .join(' ');

  const TrendIcon = stats.moodTrend === 'improving' ? TrendingUp : stats.moodTrend === 'worsening' ? TrendingDown : Minus;
  const trendText = stats.moodTrend === 'improving' ? 'بيتحسن' : stats.moodTrend === 'worsening' ? 'بينزل' : stats.moodTrend === 'stable' ? 'ثابت' : '';

  const input = 'w-full bg-[#fdfbf7] border border-[#a68660] p-2.5 text-xs sm:text-sm font-arabic-body rounded text-[#1a110a] focus:outline-none focus:bg-white';

  return (
    <div className="bg-vintage-paper border-2 border-[#bfa57d] rounded-lg p-6 sm:p-8 min-h-[600px] shadow-sm relative font-arabic-body text-[#2c1d11]">
      <div className="pb-4 mb-5 border-b-2 border-[#8c6b45]">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl sm:text-3xl font-black font-typewriter tracking-wide text-[#2b1b10]">MY DIARY</h1>
          <span className="text-xl sm:text-2xl font-bold font-arabic-hand text-[#8c1d18]">• يومياتي وأهدافي</span>
        </div>
        <p className="text-xs text-[#705238] mt-1">سجّل يومك في دقيقة، ومع الوقت هتشوف إيه اللي بيشحنك وإيه اللي بيتعبك.</p>
      </div>

      <div className="flex gap-2 mb-5">
        {([['journal', 'يومياتي', BookHeart], ['goals', 'أهدافي', Target]] as const).map(([id, label, Icon]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`flex-1 px-3 py-2 rounded border text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition ${
              tab === id ? 'bg-[#8c1d18] text-[#fbf7ee] border-[#8c1d18] shadow' : 'bg-[#f4ecd8] text-[#4a3422] border-[#bfa57d] hover:bg-[#fff9ec]'
            }`}
          >
            <Icon className="w-4 h-4" />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* ===================== JOURNAL ===================== */}
      {tab === 'journal' && (
        <div className="space-y-5">
          {/* stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="bg-[#f8f2e4] border border-[#cca779] rounded-lg p-3 text-center">
              <Flame className="w-4 h-4 mx-auto text-[#c9772f]" />
              <div className="text-xl font-black font-typewriter">{stats.streak}</div>
              <div className="text-[11px] text-[#705238]">يوم ورا بعض</div>
            </div>
            <div className="bg-[#f8f2e4] border border-[#cca779] rounded-lg p-3 text-center">
              <div className="text-xl font-black font-typewriter">{stats.last7Mood ?? '—'}</div>
              <div className="text-[11px] text-[#705238] flex items-center justify-center gap-1">
                مزاج آخر 7 أيام
                {stats.moodTrend && (
                  <span className="inline-flex items-center gap-0.5 font-bold text-[#8c1d18]">
                    <TrendIcon className="w-3 h-3" />
                    {trendText}
                  </span>
                )}
              </div>
            </div>
            <div className="bg-[#f8f2e4] border border-[#cca779] rounded-lg p-3 text-center">
              <div className="text-xl font-black font-typewriter">{stats.last7Energy ?? '—'}</div>
              <div className="text-[11px] text-[#705238]">طاقة آخر 7 أيام</div>
            </div>
            <div className="bg-[#f8f2e4] border border-[#cca779] rounded-lg p-3 text-center">
              <div className="text-xl font-black font-typewriter">{stats.total}</div>
              <div className="text-[11px] text-[#705238]">تسجيل</div>
            </div>
          </div>

          {/* check-in */}
          <form onSubmit={addEntry} className="p-4 bg-[#f8f2e4] border-2 border-[#bfa57d] rounded-lg shadow-sm space-y-3">
            <div>
              <label className="block text-xs font-bold text-[#4a3422] font-typewriter mb-1.5">MOOD / مزاجك إيه؟</label>
              <div className="flex gap-1.5">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setMood(n)}
                    aria-pressed={mood === n}
                    className={`flex-1 py-2 rounded border text-center transition ${
                      mood === n ? 'bg-[#8c1d18] text-white border-[#8c1d18] shadow' : 'bg-[#fdfbf7] border-[#a68660] hover:bg-white'
                    }`}
                  >
                    <div className="text-lg leading-none">{MOOD_EMOJI[n]}</div>
                    <div className="text-[10px] mt-0.5">{MOOD_LABEL[n]}</div>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-[#4a3422] font-typewriter mb-1.5">ENERGY / طاقتك؟</label>
              <div className="flex gap-1.5">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setEnergy(n)}
                    aria-pressed={energy === n}
                    className={`flex-1 py-1.5 rounded border text-[11px] font-bold transition ${
                      energy === n ? 'bg-[#2d2016] text-[#fbf7ee] border-[#2d2016] shadow' : 'bg-[#fdfbf7] border-[#a68660] hover:bg-white'
                    }`}
                  >
                    {ENERGY_LABEL[n]}
                  </button>
                ))}
              </div>
            </div>
            <textarea
              rows={3}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="احكي يومك... إيه اللي حصل؟ حاسس بإيه؟ إيه اللي شاغل بالك؟"
              className={input}
            />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input
                type="text"
                value={tagsRaw}
                onChange={(e) => setTagsRaw(e.target.value)}
                placeholder="وسوم: شغل، كورة، أمي، فلان"
                className={`${input} sm:col-span-2`}
              />
              <input type="date" value={date} max={todayStr()} onChange={(e) => setDate(e.target.value)} className={input} />
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] text-[#7a5f45]">الوسوم هي اللي بتخلّي الموقع يكتشف إيه بيشحنك وإيه بيستنزفك.</span>
              <button
                type="submit"
                disabled={!text.trim() && !tagsRaw.trim()}
                className="px-5 py-2 bg-[#8c1d18] hover:bg-[#731713] disabled:opacity-50 text-[#fbf7ee] text-xs font-bold rounded shadow transition flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>سجّل</span>
              </button>
            </div>
          </form>

          {/* chart */}
          {journal.length > 0 && (
            <div className="bg-[#fcf9f2] border-2 border-[#cbb184] rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-bold text-[#3d2716]">آخر 30 يوم</h3>
                <span className="text-[10px] text-[#7a5f45]">الأعمدة = المزاج • الخط = الطاقة</span>
              </div>
              <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-24" role="img" aria-label="مزاجك وطاقتك آخر 30 يوم">
                {series.map((p, i) =>
                  p.mood === null ? (
                    <rect key={p.date} x={i * barW + 1} y={H - 3} width={barW - 2} height={2} fill="#d9c7a4" />
                  ) : (
                    <rect
                      key={p.date}
                      x={i * barW + 1}
                      y={H - (p.mood / 5) * (H - 8) - 2}
                      width={barW - 2}
                      height={(p.mood / 5) * (H - 8)}
                      rx={1.5}
                      fill={MOOD_COLOR[Math.round(p.mood)]}
                      opacity={0.85}
                    >
                      <title>{`${p.date}: مزاج ${p.mood}`}</title>
                    </rect>
                  )
                )}
                {energyPoints && <polyline points={energyPoints} fill="none" stroke="#2d2016" strokeWidth={1.5} strokeLinejoin="round" />}
              </svg>
            </div>
          )}

          {/* patterns + AI */}
          <div className="bg-[#fcf9f2] border-2 border-[#cbb184] rounded-lg p-4 space-y-3">
            <h3 className="text-sm font-bold text-[#3d2716]">أنماطك</h3>
            {impacts.charging.length === 0 && impacts.draining.length === 0 ? (
              <p className="text-xs text-[#7a5f45]">
                لسه بدري. لما تسجل كام يوم بوسوم متكررة (على الأقل مرتين لكل وسم) هتظهر هنا الحاجات اللي بتحسّن أو بتوطّي مزاجك وطاقتك.
              </p>
            ) : (
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <div className="text-xs font-bold text-emerald-800 mb-1">بيشحنك</div>
                  {impacts.charging.length === 0 && <div className="text-[11px] text-[#7a5f45]">—</div>}
                  {impacts.charging.map((t) => (
                    <div key={t.tag} className="text-xs flex items-center justify-between py-0.5">
                      <span>#{t.tag}</span>
                      <span className="text-[11px] text-[#5c4028]">مزاج {t.mood} • طاقة {t.energy} ({t.count}×)</span>
                    </div>
                  ))}
                </div>
                <div>
                  <div className="text-xs font-bold text-rose-800 mb-1">بيستنزفك</div>
                  {impacts.draining.length === 0 && <div className="text-[11px] text-[#7a5f45]">—</div>}
                  {impacts.draining.map((t) => (
                    <div key={t.tag} className="text-xs flex items-center justify-between py-0.5">
                      <span>#{t.tag}</span>
                      <span className="text-[11px] text-[#5c4028]">مزاج {t.mood} • طاقة {t.energy} ({t.count}×)</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-2 border-t border-[#d9c7a4]">
              <button
                type="button"
                onClick={runReview}
                disabled={reviewLoading || journal.length < MIN_ENTRIES_FOR_AI}
                className="px-4 py-2 bg-[#faf5ea] border border-[#8c1d18] text-[#8c1d18] hover:bg-[#f2e7d0] disabled:opacity-50 text-xs font-bold rounded flex items-center gap-2 transition"
              >
                {reviewLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                <span>{reviewLoading ? 'بيقرا يومياتك...' : 'حلّلني من يومياتي'}</span>
              </button>
              {journal.length < MIN_ENTRIES_FOR_AI && (
                <p className="text-[11px] text-[#7a5f45] mt-1.5">محتاج {MIN_ENTRIES_FOR_AI} تسجيلات على الأقل.</p>
              )}
              {reviewError && (
                <div className="mt-2 text-[11px] text-rose-800 bg-rose-100 border border-rose-300 rounded px-2 py-1.5">⚠ {reviewError}</div>
              )}
              {review && (
                <div className="mt-3 p-3.5 bg-[#f4ebd6] border-r-4 border-[#8c1d18] rounded text-xs sm:text-sm leading-relaxed whitespace-pre-wrap">
                  <span className="block font-bold text-[#691410] mb-1 font-typewriter text-[11px]">SELF REVIEW / قراءة في يومياتك:</span>
                  {review}
                </div>
              )}
            </div>
          </div>

          {/* entries */}
          <div>
            <h3 className="text-sm font-bold text-[#3d2716] mb-2 border-b border-[#cca779] pb-1">السجل ({journal.length})</h3>
            {journal.length === 0 ? (
              <p className="text-xs text-[#8c745c] text-center py-6">لسه مفيش تسجيلات. اكتب أول يوم فوق.</p>
            ) : (
              <div className="space-y-2.5">
                {shown.map((j) => (
                  <div key={j.id} className="bg-[#fcf9f2] border border-[#cbb184] rounded-lg p-3 flex gap-3 items-start">
                    <div className="text-2xl leading-none pt-0.5" title={MOOD_LABEL[j.mood]}>{MOOD_EMOJI[j.mood]}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap text-[11px] text-[#705238] font-typewriter">
                        <span>{j.date}</span>
                        <span>• طاقة: {ENERGY_LABEL[j.energy]}</span>
                        {j.tags?.map((t) => (
                          <span key={t} className="px-1.5 py-0.5 rounded bg-[#ebd9bd] border border-[#cca779] font-arabic-body">#{t}</span>
                        ))}
                      </div>
                      {j.text && <p className="text-xs sm:text-sm leading-relaxed mt-1 whitespace-pre-wrap">{j.text}</p>}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeEntry(j.id)}
                      className="p-1 text-stone-400 hover:text-rose-700 transition"
                      aria-label="مسح التسجيل"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                {sorted.length > SHOWN_ENTRIES && (
                  <button type="button" onClick={() => setShowAll((v) => !v)} className="text-xs text-[#8c1d18] font-bold hover:underline">
                    {showAll ? 'اعرض الأحدث بس' : `اعرض الكل (${sorted.length})`}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===================== GOALS ===================== */}
      {tab === 'goals' && (
        <div className="space-y-5">
          <form onSubmit={addGoal} className="p-4 bg-[#f8f2e4] border-2 border-[#bfa57d] rounded-lg shadow-sm space-y-2.5">
            <label className="block text-xs font-bold text-[#4a3422] font-typewriter">NEW GOAL / هدف جديد</label>
            <input type="text" value={goalText} onChange={(e) => setGoalText(e.target.value)} placeholder="مثال: أخس 5 كيلو، أخلص الكورس، أوفّر مبلغ" className={input} />
            <div className="flex gap-2 items-center">
              <input type="date" value={goalDate} min={todayStr()} onChange={(e) => setGoalDate(e.target.value)} className={`${input} flex-1`} aria-label="الموعد المستهدف (اختياري)" />
              <button
                type="submit"
                disabled={!goalText.trim()}
                className="px-5 py-2 bg-[#8c1d18] hover:bg-[#731713] disabled:opacity-50 text-[#fbf7ee] text-xs font-bold rounded shadow transition flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>ضيف</span>
              </button>
            </div>
            <p className="text-[11px] text-[#7a5f45]">الموعد اختياري.</p>
          </form>

          {goals.length > 0 && (
            <div className="grid grid-cols-3 gap-2.5">
              <div className="bg-[#f8f2e4] border border-[#cca779] rounded-lg p-3 text-center">
                <div className="text-xl font-black font-typewriter">{gp.active}</div>
                <div className="text-[11px] text-[#705238]">شغّال</div>
              </div>
              <div className="bg-[#f8f2e4] border border-[#cca779] rounded-lg p-3 text-center">
                <div className="text-xl font-black font-typewriter">{gp.done}</div>
                <div className="text-[11px] text-[#705238]">خلص{gp.percentDone !== null ? ` (${gp.percentDone}%)` : ''}</div>
              </div>
              <div className="bg-[#f8f2e4] border border-[#cca779] rounded-lg p-3 text-center">
                <div className="text-xl font-black font-typewriter">{gp.paused}</div>
                <div className="text-[11px] text-[#705238]">موقوف</div>
              </div>
            </div>
          )}

          {goals.length === 0 ? (
            <p className="text-xs text-[#8c745c] text-center py-8">لسه مفيش أهداف. ضيف أول هدف فوق.</p>
          ) : (
            <div className="space-y-2.5">
              {[...goals]
                .sort((a, b) => ['active', 'paused', 'done'].indexOf(a.status) - ['active', 'paused', 'done'].indexOf(b.status))
                .map((g) => {
                  const left = g.status === 'active' ? daysUntil(g.targetDate) : null;
                  return (
                    <div key={g.id} className={`border rounded-lg p-3 flex gap-3 items-start ${g.status === 'done' ? 'bg-[#eef3e2] border-emerald-300' : 'bg-[#fcf9f2] border-[#cbb184]'}`}>
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs sm:text-sm leading-relaxed ${g.status === 'done' ? 'line-through text-[#5c6b45]' : ''}`}>{g.text}</p>
                        <div className="text-[11px] text-[#705238] mt-1 flex gap-2 flex-wrap">
                          <span>اتضاف {g.createdAt}</span>
                          {g.targetDate && <span>• الموعد {g.targetDate}</span>}
                          {left !== null && (
                            <span className={left < 0 ? 'text-rose-800 font-bold' : left <= 7 ? 'text-amber-800 font-bold' : ''}>
                              {left < 0 ? `• فات بـ ${-left} يوم` : left === 0 ? '• النهارده' : `• فاضل ${left} يوم`}
                            </span>
                          )}
                          {g.status === 'paused' && <span className="font-bold">• موقوف</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {g.status !== 'done' && (
                          <button type="button" onClick={() => setGoalStatus(g.id, 'done')} title="خلص" className="p-1.5 rounded border border-emerald-600 text-emerald-700 hover:bg-emerald-50">
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {g.status === 'active' && (
                          <button type="button" onClick={() => setGoalStatus(g.id, 'paused')} title="وقّف" className="p-1.5 rounded border border-[#a68660] text-[#5c4028] hover:bg-[#f4ecd8]">
                            <Pause className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {g.status !== 'active' && (
                          <button type="button" onClick={() => setGoalStatus(g.id, 'active')} title="رجّعه شغّال" className="p-1.5 rounded border border-[#a68660] text-[#5c4028] hover:bg-[#f4ecd8]">
                            <Play className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button type="button" onClick={() => removeGoal(g.id)} title="امسحه" className="p-1.5 text-stone-400 hover:text-rose-700">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
