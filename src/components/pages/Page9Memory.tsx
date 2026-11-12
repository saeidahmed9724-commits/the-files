import React, { useMemo, useState } from 'react';
import { Search, Loader2, Info, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { callAI } from '../../lib/ai';
import { PersonDossier } from '../../types/dossier';
import {
  KIND_LABEL,
  MemoryItem,
  buildMemoryCorpus,
  citedTags,
  selectRelevant,
  splitAnswer,
} from '../../utils/memory';

interface Page9MemoryProps {
  dossier: PersonDossier;
}

interface QAItem {
  id: string;
  question: string;
  answer: string;
  sent: MemoryItem[]; // the items the AI was given (used to resolve the source codes)
  searched: number; // size of the whole memory at question time
}

// Kept outside the component so the answers survive flipping to another page and back.
const sessionHistory = new Map<string, QAItem[]>();

const SUGGESTIONS = [
  'إيه اللي بيضايقه ومتكرر؟',
  'إزاي أطلب منه طلب؟',
  'بيوعد وميلتزمش؟',
  'إيه اللي اتغير فيه مؤخرًا؟',
  'بيتصرف إزاي لما يتضغط؟',
];

export const Page9Memory: React.FC<Page9MemoryProps> = ({ dossier }) => {
  const firstName = dossier.name.split(' ')[0];
  const corpus = useMemo(() => buildMemoryCorpus(dossier), [dossier]);
  const noteCount = corpus.filter((i) => i.kind === 'note').length;
  const predCount = corpus.filter((i) => i.kind === 'prediction').length;
  const otherCount = corpus.length - noteCount - predCount;

  const [qa, setQa] = useState<QAItem[]>(() => sessionHistory.get(dossier.id) || []);
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [openSources, setOpenSources] = useState<Record<string, boolean>>({});

  const ask = async (text: string) => {
    const q = text.trim();
    if (q.length < 3 || loading || corpus.length === 0) return;
    setLoading(true);
    setError('');
    try {
      const sent = selectRelevant(corpus, q);
      const answer = await callAI('ask', {
        dossier: { name: dossier.name, relationship: dossier.relationship, occupation: dossier.occupation },
        question: q,
        memory: sent.map(({ tag, date, meta, text: t }) => ({ tag, date, meta, text: t })),
      });
      const item: QAItem = { id: `qa-${Date.now()}`, question: q, answer, sent, searched: corpus.length };
      const next = [item, ...qa];
      setQa(next);
      sessionHistory.set(dossier.id, next);
      setQuestion('');
    } catch (err: any) {
      setError(err?.message || 'حدث خطأ غير متوقع');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    ask(question);
  };

  const removeItem = (id: string) => {
    const next = qa.filter((x) => x.id !== id);
    setQa(next);
    sessionHistory.set(dossier.id, next);
  };

  const renderAnswer = (item: QAItem, idx: number) => {
    const valid = new Set(item.sent.map((i) => i.tag));
    const parts = splitAnswer(item.answer, valid);
    const order = citedTags(parts);
    const sources = order
      .map((tag) => item.sent.find((i) => i.tag === tag))
      .filter((x): x is MemoryItem => Boolean(x));
    const isOpen = openSources[item.id] ?? idx === 0;

    return (
      <div key={item.id} className="bg-[#fcf9f2] border-2 border-[#cbb184] rounded-lg p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3 mb-3 pb-2 border-b border-[#cca779]">
          <span className="font-bold text-sm text-[#4a3422]">{item.question}</span>
          <button
            type="button"
            onClick={() => removeItem(item.id)}
            className="text-stone-400 hover:text-rose-600 transition p-1 shrink-0"
            title="حذف"
            aria-label="حذف"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="p-3.5 bg-[#f4ebd6] border-r-4 border-[#8c1d18] rounded text-xs sm:text-sm font-arabic-body text-[#2c1d11] leading-relaxed whitespace-pre-wrap">
          <span className="block font-bold text-[#691410] mb-1 font-typewriter text-[11px]">
            FROM THE FILE / من واقع الملف:
          </span>
          {parts.map((p, i) =>
            p.type === 'text' ? (
              <span key={i}>{p.value}</span>
            ) : (
              <sup key={i} className="mx-0.5">
                {p.tags.map((t, j) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setOpenSources((prev) => ({ ...prev, [item.id]: true }))}
                    className="px-1 text-[10px] font-bold font-typewriter text-[#8c1d18] hover:underline"
                    title="شوف المصدر"
                  >
                    {order.indexOf(t) + 1}
                    {j < p.tags.length - 1 ? '،' : ''}
                  </button>
                ))}
              </sup>
            )
          )}
        </div>

        <div className="mt-3">
          {sources.length > 0 ? (
            <>
              <button
                type="button"
                onClick={() => setOpenSources((prev) => ({ ...prev, [item.id]: !isOpen }))}
                className="flex items-center gap-1 text-[11px] font-bold text-[#5c4028] hover:text-[#8c1d18]"
              >
                {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                <span>المصادر ({sources.length})</span>
              </button>
              {isOpen && (
                <ol className="mt-2 space-y-1.5">
                  {sources.map((s, i) => (
                    <li
                      key={s.tag}
                      className="text-[11px] leading-relaxed bg-[#faf4e6] border border-[#d9be8c] rounded px-2.5 py-1.5 text-[#3d2716]"
                    >
                      <span className="font-typewriter font-bold text-[#8c1d18]">{i + 1}.</span>{' '}
                      <span className="font-bold">{KIND_LABEL[s.kind]}</span>
                      {s.date ? <span className="text-[#7a5f45]"> · {s.date}</span> : null}
                      {s.meta ? <span className="text-[#7a5f45]"> · {s.meta}</span> : null}
                      <div className="mt-0.5 whitespace-pre-wrap">{s.text}</div>
                    </li>
                  ))}
                </ol>
              )}
            </>
          ) : (
            <span className="text-[11px] text-[#8c745c]">الإجابة دي مجاتش بمصادر محددة من الملف، فخد بالك منها.</span>
          )}
        </div>

        <div className="mt-3 text-[10px] text-[#8c745c]">
          {item.sent.length >= item.searched
            ? `بحثت في كل الملف (${item.searched} معلومة).`
            : `الملف كبير، فاخترت ${item.sent.length} معلومة من ${item.searched} الأقرب لسؤالك.`}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-vintage-paper border-2 border-[#bfa57d] rounded-lg p-6 sm:p-8 min-h-[600px] shadow-sm relative font-arabic-body text-[#2c1d11]">
      {/* Header */}
      <div className="pb-4 mb-5 border-b-2 border-[#8c6b45]">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl sm:text-3xl font-black font-typewriter tracking-wide text-[#2b1b10]">
            CONTEXTUAL MEMORY
          </h1>
          <span className="text-xl sm:text-2xl font-bold font-arabic-hand text-[#8c1d18]">• الذاكرة السياقية</span>
        </div>
        <p className="text-xs text-[#705238] mt-1">
          اسأل أي سؤال عن {firstName} بالكلام العادي، وأنا أدوّر في كل مواقفك وملاحظاتك القديمة وأجمع اللي له علاقة.
        </p>
      </div>

      <div className="mb-5 flex items-start gap-2 text-[11px] text-[#7a5f45] bg-[#f4ecd8] border border-[#cca779] rounded px-3 py-2">
        <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
        <span>
          {corpus.length === 0
            ? 'الملف لسه فاضي. سجّل ملاحظات ومواقف في صفحة السجل الأول عشان الذاكرة يبقى فيها حاجة تدوّر فيها.'
            : `هدوّر في ${noteCount} ملاحظة وموقف، و${predCount} توقع، و${otherCount} معلومة تانية من ملفه. الإجابة مبنية على اللي سجلته إنت بس، وكل معلومة فيها رقم مصدر.`}
        </span>
      </div>

      {/* Ask box */}
      <form onSubmit={handleSubmit} className="p-4 bg-[#f8f2e4] border-2 border-[#bfa57d] rounded-lg shadow-sm space-y-3">
        <label className="block text-xs font-bold text-[#4a3422] font-typewriter">QUESTION / عايز تعرف إيه عنه؟</label>
        <textarea
          rows={2}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
              e.preventDefault();
              ask(question);
            }
          }}
          placeholder={`مثال: ${firstName} بيتصرف إزاي لما حد يتأخر عليه؟`}
          disabled={corpus.length === 0}
          className="w-full bg-[#fdfbf7] border border-[#a68660] p-2.5 text-xs sm:text-sm font-arabic-body rounded text-[#1a110a] focus:outline-none focus:bg-white disabled:opacity-60"
        />

        {qa.length === 0 && corpus.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => ask(s)}
                disabled={loading}
                className="px-2.5 py-1 text-[11px] bg-[#f4ecd8] hover:bg-[#fff9ec] border border-[#bfa57d] rounded-full text-[#4a3422] disabled:opacity-50 transition"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading || question.trim().length < 3 || corpus.length === 0}
            className="px-5 py-2 bg-[#8c1d18] hover:bg-[#731713] disabled:opacity-50 text-[#fbf7ee] text-xs font-bold rounded shadow transition flex items-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>بدوّر في الذاكرة...</span>
              </>
            ) : (
              <>
                <Search className="w-3.5 h-3.5" />
                <span>دوّر في الذاكرة</span>
              </>
            )}
          </button>
        </div>

        {error && (
          <div className="text-[11px] text-rose-800 bg-rose-100 border border-rose-300 rounded px-2 py-1.5">⚠ {error}</div>
        )}
      </form>

      {/* Answers, newest first */}
      <div className="mt-6 space-y-5">{qa.map((item, idx) => renderAnswer(item, idx))}</div>
    </div>
  );
};
