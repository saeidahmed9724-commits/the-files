import React, { useState } from 'react';
import { AlertCircle, Smile, Plus, Trash2, Edit2, Check, X, ShieldAlert, Sparkles } from 'lucide-react';
import { PersonDossier, TriggerItem, ComfortItem } from '../../types/dossier';

interface Page3TriggersProps {
  dossier: PersonDossier;
  onUpdateDossier: (updated: Partial<PersonDossier>) => void;
}

export const Page3Triggers: React.FC<Page3TriggersProps> = ({ dossier, onUpdateDossier }) => {
  const [triggers, setTriggers] = useState<TriggerItem[]>(dossier.triggers || []);
  const [comforts, setComforts] = useState<ComfortItem[]>(dossier.comforts || []);

  // Form states for adding new trigger
  const [newTriggerText, setNewTriggerText] = useState('');
  const [newTriggerSeverity, setNewTriggerSeverity] = useState<'mild' | 'moderate' | 'high'>('high');
  const [isAddingTrigger, setIsAddingTrigger] = useState(false);

  // Form states for adding new comfort
  const [newComfortText, setNewComfortText] = useState('');
  const [newComfortImpact, setNewComfortImpact] = useState<'soothing' | 'uplifting' | 'essential'>('essential');
  const [isAddingComfort, setIsAddingComfort] = useState(false);

  const handleAddTrigger = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTriggerText.trim()) return;

    const item: TriggerItem = {
      id: `trig-${Date.now()}`,
      text: newTriggerText.trim(),
      severity: newTriggerSeverity,
    };
    const updated = [item, ...triggers];
    setTriggers(updated);
    onUpdateDossier({ triggers: updated });
    setNewTriggerText('');
    setIsAddingTrigger(false);
  };

  const handleDeleteTrigger = (id: string) => {
    const updated = triggers.filter((t) => t.id !== id);
    setTriggers(updated);
    onUpdateDossier({ triggers: updated });
  };

  const handleAddComfort = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComfortText.trim()) return;

    const item: ComfortItem = {
      id: `comf-${Date.now()}`,
      text: newComfortText.trim(),
      impact: newComfortImpact,
    };
    const updated = [item, ...comforts];
    setComforts(updated);
    onUpdateDossier({ comforts: updated });
    setNewComfortText('');
    setIsAddingComfort(false);
  };

  const handleDeleteComfort = (id: string) => {
    const updated = comforts.filter((c) => c.id !== id);
    setComforts(updated);
    onUpdateDossier({ comforts: updated });
  };

  return (
    <div className="bg-vintage-paper border-2 border-[#bfa57d] rounded-lg p-6 sm:p-8 min-h-[600px] shadow-sm relative font-arabic-body text-[#2c1d11]">
      {/* Header */}
      <div className="pb-4 mb-6 border-b-2 border-[#8c6b45]">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl sm:text-3xl font-black font-typewriter tracking-wide text-[#2b1b10]">
            TRIGGERS & COMFORTS
          </h1>
          <span className="text-xl sm:text-2xl font-bold font-arabic-hand text-[#8c1d18]">
            • المحفزات والمريحات
          </span>
        </div>
        <p className="text-xs text-[#705238] mt-1">
          سجل الحساسيات ومثيرات التوتر مقابل مفاتيح الهدوء ومحفزات الرضا.
        </p>
      </div>

      {/* Two Paper Ledger Columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Column 1: Triggers / What bothers them */}
        <div className="bg-[#f7eedc] border-2 border-[#cfa58a] rounded-lg p-4 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-3 pb-2 border-b-2 border-[#8c1d18]/40">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-[#8c1d18]" />
                <div>
                  <h2 className="text-base font-bold text-[#691410] font-arabic-body">
                    ما يزعجه ويثير توتره (Triggers)
                  </h2>
                  <p className="font-typewriter text-[10px] text-[#8c1d18]/80 uppercase">
                    WHAT AGITATES & BOTHERS THEM
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsAddingTrigger(true)}
                className="px-2.5 py-1 bg-[#8c1d18] hover:bg-[#731713] text-[#fbf7ee] text-xs font-bold rounded flex items-center gap-1 shadow transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>إضافة بند</span>
              </button>
            </div>

            {/* Add Trigger inline form */}
            {isAddingTrigger && (
              <form onSubmit={handleAddTrigger} className="mb-4 p-3 bg-[#fae8e4] border border-[#d98b85] rounded-md">
                <label className="block text-xs font-bold text-[#691410] mb-1 font-arabic-body">
                  نص المثير أو التصرف المزعج:
                </label>
                <textarea
                  rows={2}
                  required
                  value={newTriggerText}
                  onChange={(e) => setNewTriggerText(e.target.value)}
                  placeholder="مثال: التردد المفرط، مقاطعة حديثه، التأخر عن المواعيد..."
                  className="w-full bg-white border border-[#c9837d] p-2 text-xs rounded text-[#1a110a] mb-2 focus:outline-none"
                />
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-1 text-xs">
                    <span className="text-[#691410] text-[11px]">شدة الأثر:</span>
                    <select
                      value={newTriggerSeverity}
                      onChange={(e) => setNewTriggerSeverity(e.target.value as any)}
                      className="bg-white border border-[#c9837d] text-[11px] p-1 rounded"
                    >
                      <option value="high">مرتفع الحساسية (حرج)</option>
                      <option value="moderate">متوسط (مزعج)</option>
                      <option value="mild">خفيف (متحفظ)</option>
                    </select>
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => setIsAddingTrigger(false)}
                      className="px-2 py-0.5 text-xs text-stone-600 border border-stone-300 rounded"
                    >
                      إلغاء
                    </button>
                    <button
                      type="submit"
                      className="px-3 py-0.5 bg-[#8c1d18] text-white text-xs font-bold rounded"
                    >
                      حفظ
                    </button>
                  </div>
                </div>
              </form>
            )}

            {/* List of Triggers */}
            <div className="space-y-2.5">
              {triggers.length === 0 ? (
                <div className="p-6 text-center text-xs text-[#8c745c] italic border border-dashed border-[#d9b897] rounded">
                  لا توجد بنود مسجلة بعد. أضف التصرفات التي تسبب له الضيق لتجنبها.
                </div>
              ) : (
                triggers.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 bg-[#faefe3] border-r-4 border-[#8c1d18] border border-[#e0cbb2] rounded flex justify-between items-start gap-2 group hover:bg-[#fce9da] transition shadow-xs"
                  >
                    <div className="flex-1">
                      <p className="text-xs font-arabic-body text-[#2c1d11] leading-relaxed">
                        {item.text}
                      </p>
                      {item.severity && (
                        <span
                          className={`inline-block mt-1 text-[10px] px-1.5 py-0.2 rounded font-typewriter ${
                            item.severity === 'high'
                              ? 'bg-rose-100 text-rose-900 border border-rose-300'
                              : 'bg-amber-100 text-amber-900 border border-amber-300'
                          }`}
                        >
                          {item.severity === 'high' ? 'حساسية عالية' : 'إزعاج معتدل'}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteTrigger(item.id)}
                      className="text-stone-400 hover:text-rose-600 transition p-1"
                      title="حذف البند"
                      aria-label="حذف"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Column 2: Comforts / What calms them */}
        <div className="bg-[#f4efe1] border-2 border-[#b5c7a3] rounded-lg p-4 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-3 pb-2 border-b-2 border-emerald-800/40">
              <div className="flex items-center gap-2">
                <Smile className="w-5 h-5 text-emerald-800" />
                <div>
                  <h2 className="text-base font-bold text-[#1b3d22] font-arabic-body">
                    ما يريحه وما يسعده (Comforts)
                  </h2>
                  <p className="font-typewriter text-[10px] text-emerald-900/80 uppercase">
                    WHAT CALMS, COMFORTS & PLEASES THEM
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsAddingComfort(true)}
                className="px-2.5 py-1 bg-emerald-800 hover:bg-emerald-900 text-[#fbf7ee] text-xs font-bold rounded flex items-center gap-1 shadow transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>إضافة بند</span>
              </button>
            </div>

            {/* Add Comfort inline form */}
            {isAddingComfort && (
              <form onSubmit={handleAddComfort} className="mb-4 p-3 bg-[#e8f2e1] border border-[#a6caa0] rounded-md">
                <label className="block text-xs font-bold text-[#1b3d22] mb-1 font-arabic-body">
                  نص التصرف المهدئ أو المفضل:
                </label>
                <textarea
                  rows={2}
                  required
                  value={newComfortText}
                  onChange={(e) => setNewComfortText(e.target.value)}
                  placeholder="مثال: الاستماع باهتمام، تقديم خيارات واضحة، التقدير الصادق..."
                  className="w-full bg-white border border-[#9dc396] p-2 text-xs rounded text-[#1a110a] mb-2 focus:outline-none"
                />
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-1 text-xs">
                    <span className="text-[#1b3d22] text-[11px]">طبيعة الأثر:</span>
                    <select
                      value={newComfortImpact}
                      onChange={(e) => setNewComfortImpact(e.target.value as any)}
                      className="bg-white border border-[#9dc396] text-[11px] p-1 rounded"
                    >
                      <option value="essential">مفتاح جوهري (أساسي)</option>
                      <option value="soothing">مهدئ ومريح (لطيف)</option>
                      <option value="uplifting">محفز إيجابي (دافع)</option>
                    </select>
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => setIsAddingComfort(false)}
                      className="px-2 py-0.5 text-xs text-stone-600 border border-stone-300 rounded"
                    >
                      إلغاء
                    </button>
                    <button
                      type="submit"
                      className="px-3 py-0.5 bg-emerald-800 text-white text-xs font-bold rounded"
                    >
                      حفظ
                    </button>
                  </div>
                </div>
              </form>
            )}

            {/* List of Comforts */}
            <div className="space-y-2.5">
              {comforts.length === 0 ? (
                <div className="p-6 text-center text-xs text-[#8c745c] italic border border-dashed border-[#b3c7a3] rounded">
                  لا توجد بنود مسجلة بعد. أضف التصرفات والأجواء التي تجعله مرتاحاً ومنفتحاً للتفاهم.
                </div>
              ) : (
                comforts.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 bg-[#f8fbf5] border-r-4 border-emerald-700 border border-[#cce0c2] rounded flex justify-between items-start gap-2 group hover:bg-[#eef8ea] transition shadow-xs"
                  >
                    <div className="flex-1">
                      <p className="text-xs font-arabic-body text-[#1a2e1d] leading-relaxed">
                        {item.text}
                      </p>
                      {item.impact && (
                        <span className="inline-block mt-1 text-[10px] px-1.5 py-0.2 rounded font-typewriter bg-emerald-100 text-emerald-900 border border-emerald-300">
                          {item.impact === 'essential' ? 'مفتاح جوهري' : 'مهدئ ومريح'}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteComfort(item.id)}
                      className="text-stone-400 hover:text-rose-600 transition p-1"
                      title="حذف البند"
                      aria-label="حذف"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
