import React, { useEffect, useRef, useState } from 'react';
import { Compass, MessagesSquare, Loader2, Send, RotateCcw, ClipboardCheck, Target, Info } from 'lucide-react';
import { callAI } from '../../lib/ai';
import { PersonDossier, PredictionEntry } from '../../types/dossier';

interface Page7SimulatorProps {
  dossier: PersonDossier;
  onUpdateDossier: (updated: Partial<PersonDossier>) => void;
}

type Mode = 'approach' | 'chat';
interface ChatMsg {
  role: 'me' | 'them';
  text: string;
}

export const Page7Simulator: React.FC<Page7SimulatorProps> = ({ dossier, onUpdateDossier }) => {
  const [mode, setMode] = useState<Mode>('approach');

  // ---- Approach analysis ----
  const [topic, setTopic] = useState('');
  const [plan, setPlan] = useState('');
  const [approachResult, setApproachResult] = useState('');
  const [approachSavedFor, setApproachSavedFor] = useState('');
  const [approachLoading, setApproachLoading] = useState(false);
  const [approachError, setApproachError] = useState('');

  // ---- Roleplay chat ----
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [draft, setDraft] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState('');
  const [debrief, setDebrief] = useState('');
  const [debriefLoading, setDebriefLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [messages, chatLoading]);

  const runApproach = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;
    setApproachLoading(true);
    setApproachError('');
    setApproachResult('');
    setApproachSavedFor('');
    try {
      const result = await callAI('approach', { dossier, topic: topic.trim(), plan: plan.trim() });
      setApproachResult(result);
    } catch (err: any) {
      setApproachError(err?.message || 'حدث خطأ غير متوقع');
    } finally {
      setApproachLoading(false);
    }
  };

  // Turn the analysis into a pending prediction so it can be checked against reality later.
  const saveAsPrediction = () => {
    if (!approachResult) return;
    const entry: PredictionEntry = {
      id: `pred-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      scenario: plan.trim() ? `${topic.trim()} (هقولها: ${plan.trim()})` : topic.trim(),
      predictedReaction: approachResult,
      verdict: 'pending',
    };
    onUpdateDossier({ predictions: [entry, ...(dossier.predictions || [])] });
    setApproachSavedFor(approachResult);
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text || chatLoading) return;

    const next: ChatMsg[] = [...messages, { role: 'me', text }];
    setMessages(next);
    setDraft('');
    setChatLoading(true);
    setChatError('');
    setDebrief('');
    try {
      const reply = await callAI('simulate', { dossier, history: next });
      setMessages([...next, { role: 'them', text: reply.trim() }]);
    } catch (err: any) {
      // Roll back so the user can retry with the same text.
      setMessages(messages);
      setDraft(text);
      setChatError(err?.message || 'حدث خطأ غير متوقع');
    } finally {
      setChatLoading(false);
    }
  };

  const runDebrief = async () => {
    setDebriefLoading(true);
    setChatError('');
    try {
      setDebrief(await callAI('debrief', { dossier, history: messages }));
    } catch (err: any) {
      setChatError(err?.message || 'حدث خطأ غير متوقع');
    } finally {
      setDebriefLoading(false);
    }
  };

  const resetChat = () => {
    setMessages([]);
    setDraft('');
    setDebrief('');
    setChatError('');
  };

  const hasExchange = messages.some((m) => m.role === 'them');
  const firstName = dossier.name.split(' ')[0];

  return (
    <div className="bg-vintage-paper border-2 border-[#bfa57d] rounded-lg p-6 sm:p-8 min-h-[600px] shadow-sm relative font-arabic-body text-[#2c1d11]">
      {/* Header */}
      <div className="pb-4 mb-5 border-b-2 border-[#8c6b45]">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl sm:text-3xl font-black font-typewriter tracking-wide text-[#2b1b10]">
            CONVERSATION SIMULATOR
          </h1>
          <span className="text-xl sm:text-2xl font-bold font-arabic-hand text-[#8c1d18]">• محاكي المواجهات</span>
        </div>
        <p className="text-xs text-[#705238] mt-1">
          جرّب الكلام مع {firstName} قبل ما تقوله بجد: حلّل مدخلك، أو مثّل المحادثة.
        </p>
      </div>

      <div className="mb-5 flex items-start gap-2 text-[11px] text-[#7a5f45] bg-[#f4ecd8] border border-[#cca779] rounded px-3 py-2">
        <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
        <span>
          ده تمثيل مبني على ملاحظاتك إنت في الملف، مش الشخص الحقيقي. كل ما الملف فيه مواقف أكتر، التمثيل بيبقى أقرب.
        </span>
      </div>

      {/* Mode switch */}
      <div className="flex gap-2 mb-5">
        <button
          type="button"
          onClick={() => setMode('approach')}
          className={`flex-1 px-3 py-2 rounded border text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition ${
            mode === 'approach'
              ? 'bg-[#8c1d18] text-[#fbf7ee] border-[#8c1d18] shadow'
              : 'bg-[#f4ecd8] text-[#4a3422] border-[#bfa57d] hover:bg-[#fff9ec]'
          }`}
        >
          <Compass className="w-4 h-4" />
          <span>حلّل مدخلي</span>
        </button>
        <button
          type="button"
          onClick={() => setMode('chat')}
          className={`flex-1 px-3 py-2 rounded border text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition ${
            mode === 'chat'
              ? 'bg-[#8c1d18] text-[#fbf7ee] border-[#8c1d18] shadow'
              : 'bg-[#f4ecd8] text-[#4a3422] border-[#bfa57d] hover:bg-[#fff9ec]'
          }`}
        >
          <MessagesSquare className="w-4 h-4" />
          <span>مثّل المحادثة</span>
        </button>
      </div>

      {/* ---------------- Approach mode ---------------- */}
      {mode === 'approach' && (
        <div>
          <form onSubmit={runApproach} className="p-4 bg-[#f8f2e4] border-2 border-[#bfa57d] rounded-lg shadow-sm space-y-3">
            <div>
              <label className="block text-xs font-bold text-[#4a3422] font-typewriter mb-1">
                TOPIC / عايز تفتح معاه إيه؟
              </label>
              <textarea
                rows={2}
                required
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="مثال: عايز أقوله إني مش هقدر أكمل في المشروع ده"
                className="w-full bg-[#fdfbf7] border border-[#a68660] p-2.5 text-xs sm:text-sm font-arabic-body rounded text-[#1a110a] focus:outline-none focus:bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#4a3422] font-typewriter mb-1">
                MY OPENING / هتقولها إزاي؟ (اختياري)
              </label>
              <textarea
                rows={2}
                value={plan}
                onChange={(e) => setPlan(e.target.value)}
                placeholder="اكتب الجملة اللي ناوي تبدأ بيها، ولو سايبها فاضية هقترح لك مدخل"
                className="w-full bg-[#fdfbf7] border border-[#a68660] p-2.5 text-xs sm:text-sm font-arabic-body rounded text-[#1a110a] focus:outline-none focus:bg-white"
              />
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={approachLoading || !topic.trim()}
                className="px-5 py-2 bg-[#8c1d18] hover:bg-[#731713] disabled:opacity-50 text-[#fbf7ee] text-xs font-bold rounded shadow transition flex items-center gap-2"
              >
                {approachLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>جاري التحليل...</span>
                  </>
                ) : (
                  <>
                    <Compass className="w-3.5 h-3.5" />
                    <span>حلّل واقترح مدخل</span>
                  </>
                )}
              </button>
            </div>
            {approachError && (
              <div className="text-[11px] text-rose-800 bg-rose-100 border border-rose-300 rounded px-2 py-1.5">
                ⚠ {approachError}
              </div>
            )}
          </form>

          {approachResult && (
            <div className="mt-5 bg-[#fcf9f2] border-2 border-[#cbb184] rounded-lg p-5 shadow-sm">
              <div className="p-3.5 bg-[#f4ebd6] border-r-4 border-[#8c1d18] rounded text-xs sm:text-sm font-arabic-body text-[#2c1d11] leading-relaxed whitespace-pre-wrap">
                <span className="block font-bold text-[#691410] mb-1 font-typewriter text-[11px]">
                  ANALYSIS / تحليل المواجهة:
                </span>
                {approachResult}
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <span className="text-[11px] text-[#7a5f45]">
                  لو فتحت الموضوع بجد، احفظه كتوقع وبعدين سجّل اللي حصل فعلًا.
                </span>
                {approachSavedFor === approachResult ? (
                  <span className="text-[11px] font-bold text-emerald-800 flex items-center gap-1">
                    <ClipboardCheck className="w-3.5 h-3.5" /> اتحفظ في صفحة التوقعات
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={saveAsPrediction}
                    className="px-3 py-1.5 bg-[#faf5ea] border border-[#8c1d18] text-[#8c1d18] hover:bg-[#f2e7d0] text-xs font-bold rounded flex items-center gap-1.5 transition"
                  >
                    <Target className="w-3.5 h-3.5" />
                    <span>احفظه كتوقع</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ---------------- Roleplay chat mode ---------------- */}
      {mode === 'chat' && (
        <div>
          <div className="bg-[#f8f2e4] border-2 border-[#bfa57d] rounded-lg shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 bg-[#ecdcc4] border-b border-[#bfa57d]">
              <span className="text-xs font-bold text-[#3d2716]">محادثة تجريبية مع {dossier.name}</span>
              {messages.length > 0 && (
                <button
                  type="button"
                  onClick={resetChat}
                  className="text-[11px] text-[#8c1d18] hover:underline flex items-center gap-1 font-bold"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>ابدأ من جديد</span>
                </button>
              )}
            </div>

            <div className="p-3 sm:p-4 space-y-3 min-h-[260px] max-h-[420px] overflow-y-auto">
              {messages.length === 0 && !chatLoading && (
                <p className="text-xs text-[#8c745c] text-center py-10">
                  ابدأ بأول جملة كأنك بتكلمه بجد، وهو هيرد زي ما الملف بيقول.
                </p>
              )}
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'me' ? 'justify-start' : 'justify-end'}`}>
                  <div
                    className={`max-w-[85%] px-3 py-2 rounded-lg text-xs sm:text-sm leading-relaxed whitespace-pre-wrap border ${
                      m.role === 'me'
                        ? 'bg-[#fdfbf7] border-[#bfa57d] text-[#2c1d11]'
                        : 'bg-[#f2e1c4] border-[#8c6b45] text-[#2b1b10]'
                    }`}
                  >
                    <span className="block text-[10px] font-bold text-[#8c1d18] mb-0.5 font-typewriter">
                      {m.role === 'me' ? 'أنا' : firstName}
                    </span>
                    {m.text}
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div className="flex justify-end">
                  <div className="px-3 py-2 rounded-lg text-xs border border-[#8c6b45] bg-[#f2e1c4] text-[#5c4028] flex items-center gap-1.5">
                    <Loader2 className="w-3 h-3 animate-spin" /> {firstName} بيكتب...
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            <form onSubmit={sendMessage} className="flex gap-2 p-3 border-t border-[#bfa57d] bg-[#f4ecd8]">
              <input
                type="text"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                disabled={chatLoading}
                placeholder="اكتب رسالتك..."
                className="flex-1 bg-[#fdfbf7] border border-[#a68660] px-3 py-2 text-xs sm:text-sm font-arabic-body rounded text-[#1a110a] focus:outline-none focus:bg-white"
              />
              <button
                type="submit"
                disabled={chatLoading || !draft.trim()}
                className="px-4 py-2 bg-[#8c1d18] hover:bg-[#731713] disabled:opacity-50 text-[#fbf7ee] text-xs font-bold rounded shadow transition flex items-center gap-1.5"
                aria-label="إرسال"
              >
                <Send className="w-3.5 h-3.5 rotate-180" />
                <span>إرسال</span>
              </button>
            </form>
          </div>

          {chatError && (
            <div className="mt-3 text-[11px] text-rose-800 bg-rose-100 border border-rose-300 rounded px-2 py-1.5">
              ⚠ {chatError}
            </div>
          )}

          {hasExchange && (
            <div className="mt-4">
              <button
                type="button"
                onClick={runDebrief}
                disabled={debriefLoading || chatLoading}
                className="px-4 py-2 bg-[#faf5ea] border border-[#8c1d18] text-[#8c1d18] hover:bg-[#f2e7d0] disabled:opacity-50 text-xs font-bold rounded flex items-center gap-2 transition"
              >
                {debriefLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>بيقيّم المحادثة...</span>
                  </>
                ) : (
                  <>
                    <ClipboardCheck className="w-3.5 h-3.5" />
                    <span>قيّم المحادثة وقولي أعمل إيه</span>
                  </>
                )}
              </button>

              {debrief && (
                <div className="mt-3 p-3.5 bg-[#f4ebd6] border-r-4 border-[#8c1d18] rounded text-xs sm:text-sm font-arabic-body text-[#2c1d11] leading-relaxed whitespace-pre-wrap">
                  <span className="block font-bold text-[#691410] mb-1 font-typewriter text-[11px]">
                    DEBRIEF / تقييم المحادثة:
                  </span>
                  {debrief}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
