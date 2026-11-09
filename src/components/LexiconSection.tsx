import React, { useState } from 'react';
import { BookA, Plus, Trash2 } from 'lucide-react';
import { LexiconItem, LexiconKind, PersonDossier } from '../types/dossier';
import { LEXICON_KIND_LABEL } from '../utils/dossierLogic';

interface Props {
  dossier: PersonDossier;
  onUpdateDossier: (updated: Partial<PersonDossier>) => void;
}

const KIND_STYLE: Record<LexiconKind, string> = {
  stress_word: 'bg-amber-100 text-amber-900 border-amber-400',
  tic: 'bg-sky-100 text-sky-900 border-sky-400',
  body_language: 'bg-purple-100 text-purple-900 border-purple-400',
  tell: 'bg-rose-100 text-rose-900 border-rose-400',
};

const PLACEHOLDER: Record<LexiconKind, string> = {
  stress_word: 'مثال: "يعني" أو "المهم"',
  tic: 'مثال: "والله" في آخر كل جملة',
  body_language: 'مثال: بيحك رقبته',
  tell: 'مثال: بيبدأ كلامه بـ "بصراحة"',
};

export const LexiconSection: React.FC<Props> = ({ dossier, onUpdateDossier }) => {
  const [items, setItems] = useState<LexiconItem[]>(dossier.lexicon || []);
  const [isAdding, setIsAdding] = useState(false);
  const [phrase, setPhrase] = useState('');
  const [kind, setKind] = useState<LexiconKind>('tell');
  const [meaning, setMeaning] = useState('');

  const save = (next: LexiconItem[]) => {
    setItems(next);
    onUpdateDossier({ lexicon: next });
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phrase.trim()) return;
    save([
      { id: `lex-${Date.now()}`, phrase: phrase.trim(), kind, meaning: meaning.trim() || undefined },
      ...items,
    ]);
    setPhrase('');
    setMeaning('');
    setIsAdding(false);
  };

  return (
    <div className="mt-6 bg-[#f7eedc] border-2 border-[#cfa58a] rounded-lg p-4 shadow-sm">
      <div className="flex justify-between items-center mb-3 pb-2 border-b-2 border-[#8c1d18]/40">
        <div className="flex items-center gap-2">
          <BookA className="w-5 h-5 text-[#8c1d18]" />
          <div>
            <h2 className="text-base font-bold text-[#691410]">البصمة اللغوية واللزمات</h2>
            <p className="font-typewriter text-[10px] text-[#8c1d18]/80 uppercase">LEXICON & MICRO-HABITS</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setIsAdding((v) => !v)}
          className="px-2.5 py-1 bg-[#8c1d18] hover:bg-[#731713] text-[#fbf7ee] text-xs font-bold rounded flex items-center gap-1 shadow transition"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>إضافة</span>
        </button>
      </div>

      <p className="text-xs text-[#705238] mb-3 leading-relaxed">
        قاموس الشخص: كلماته اللي بيكررها لما يتوتر، لزماته في الكلام، ولغة جسده لما يكذب أو يتحمس. الذكاء الاصطناعي بيستخدمها
        كإشارات لما يتوقع رد فعله.
      </p>

      {isAdding && (
        <form onSubmit={handleAdd} className="mb-4 p-3 bg-[#f4ecd8] border border-[#cca779] rounded-md space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value as LexiconKind)}
              className="bg-[#faf5eb] border border-[#a68660] text-xs p-2 rounded focus:outline-none"
            >
              {(Object.keys(LEXICON_KIND_LABEL) as LexiconKind[]).map((k) => (
                <option key={k} value={k}>
                  {LEXICON_KIND_LABEL[k]}
                </option>
              ))}
            </select>
            <input
              type="text"
              required
              value={phrase}
              onChange={(e) => setPhrase(e.target.value)}
              placeholder={PLACEHOLDER[kind]}
              className="bg-white border border-[#a68660] text-xs p-2 rounded focus:outline-none"
            />
          </div>
          <input
            type="text"
            value={meaning}
            onChange={(e) => setMeaning(e.target.value)}
            placeholder="غالبًا بتدل على إيه؟ (اختياري) مثال: غالبًا بيخبي حاجة"
            className="w-full bg-white border border-[#a68660] text-xs p-2 rounded focus:outline-none"
          />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setIsAdding(false)} className="px-3 py-1.5 text-xs text-stone-600 border border-stone-300 rounded hover:bg-stone-100">
              إلغاء
            </button>
            <button type="submit" className="px-4 py-1.5 bg-[#8c1d18] hover:bg-[#731713] text-white text-xs font-bold rounded shadow">
              حفظ
            </button>
          </div>
        </form>
      )}

      {items.length === 0 ? (
        <div className="p-6 text-center text-xs text-[#8c745c] border-2 border-dashed border-[#cca779] rounded-lg">
          القاموس فاضي. أضف لزمة بإيدك، أو سجّل فويس في صفحة السجل والذكاء الاصطناعي هيلقطها.
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((it) => (
            <li key={it.id} className="bg-[#faf5ec] border border-[#d6be90] rounded-md p-2.5 flex items-start justify-between gap-2 group">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`text-[10px] px-2 py-0.5 rounded border font-bold ${KIND_STYLE[it.kind]}`}>
                    {LEXICON_KIND_LABEL[it.kind]}
                  </span>
                  <span className="font-arabic-hand text-base font-bold text-[#24170e]">"{it.phrase}"</span>
                </div>
                {it.meaning && <p className="text-xs text-[#5c4028] mt-1">← غالبًا: {it.meaning}</p>}
              </div>
              <button
                type="button"
                onClick={() => save(items.filter((x) => x.id !== it.id))}
                className="text-stone-400 hover:text-rose-600 transition p-1 shrink-0"
                aria-label="حذف"
                title="حذف"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
