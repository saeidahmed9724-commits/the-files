import React, { useState } from 'react';
import { Brain, Shield, Award, MessageSquare, Zap, Activity, Check, HelpCircle } from 'lucide-react';
import { PersonDossier, ConfidenceLevel, MindThinking } from '../../types/dossier';
import { LexiconSection } from '../LexiconSection';

interface Page2MindProps {
  dossier: PersonDossier;
  onUpdateDossier: (updated: Partial<PersonDossier>) => void;
}

export const Page2Mind: React.FC<Page2MindProps> = ({ dossier, onUpdateDossier }) => {
  const [mind, setMind] = useState<MindThinking>(dossier.mind);
  const [isEditing, setIsEditing] = useState(false);

  const confidenceLabels: Record<ConfidenceLevel, { ar: string; color: string; desc: string }> = {
    low: { ar: 'ثقة منخفضة', color: 'bg-amber-100 text-amber-900 border-amber-400', desc: 'ملاحظة واحدة أو اثنتان فقط' },
    medium: { ar: 'ثقة متوسطة', color: 'bg-sky-100 text-sky-900 border-sky-400', desc: 'تكررت في عدة مواقف' },
    high: { ar: 'ثقة عالية', color: 'bg-emerald-100 text-emerald-900 border-emerald-500', desc: 'سلوك ثابت ومؤكد بالتجربة' },
  };

  const handleConfidenceCycle = (key: keyof MindThinking) => {
    const cycleMap: Record<ConfidenceLevel, ConfidenceLevel> = {
      low: 'medium',
      medium: 'high',
      high: 'low',
    };
    const current = mind[key] as ConfidenceLevel;
    const next = cycleMap[current] || 'medium';
    const updated = { ...mind, [key]: next };
    setMind(updated);
    onUpdateDossier({ mind: updated });
  };

  const handleTextChange = (key: keyof MindThinking, value: string) => {
    const updated = { ...mind, [key]: value };
    setMind(updated);
  };

  const handleSaveAll = () => {
    onUpdateDossier({ mind });
    setIsEditing(false);
  };

  const items = [
    {
      titleAr: 'طريقة التفكير ومعالجة المعلومات',
      titleEn: 'HOW THEY THINK & PROCESS',
      icon: <Brain className="w-5 h-5 text-[#8c1d18]" />,
      textKey: 'howTheyThink' as keyof MindThinking,
      confKey: 'howTheyThinkConfidence' as keyof MindThinking,
      placeholder: 'هل يميل إلى التفكير التحليلي، الحدسي، الاستراتيجي، أم العاطفي؟ كيف يفكك المشكلات؟',
    },
    {
      titleAr: 'أسلوب اتخاذ القرارات',
      titleEn: 'DECISION MAKING PROCESS',
      icon: <Zap className="w-5 h-5 text-[#8c1d18]" />,
      textKey: 'decisionMaking' as keyof MindThinking,
      confKey: 'decisionMakingConfidence' as keyof MindThinking,
      placeholder: 'هل هو سريع ومغامر، أم بطيء ومتردد، أم يستشير كثيراً؟ ما هو المحفز النهائي لحسم قراره؟',
    },
    {
      titleAr: 'التعامل مع الضغط والتوتر',
      titleEn: 'HANDLING PRESSURE & CRISIS',
      icon: <Activity className="w-5 h-5 text-[#8c1d18]" />,
      textKey: 'handlingPressure' as keyof MindThinking,
      confKey: 'handlingPressureConfidence' as keyof MindThinking,
      placeholder: 'كيف يتصرف عندما تتأزم الأمور؟ هل ينسحب، ينفعل، أم يتجمد، أم يتحول إلى قيادي هادئ؟',
    },
    {
      titleAr: 'الثبات الانفعالي والمزاج',
      titleEn: 'EMOTIONAL STABILITY & MOOD',
      icon: <Shield className="w-5 h-5 text-[#8c1d18]" />,
      textKey: 'emotionalStabilityDesc' as keyof MindThinking,
      confKey: 'emotionalStabilityConfidence' as keyof MindThinking,
      placeholder: 'طبيعة مزاجه اليومي: متقلب، هادئ، دفاعي، متفائل؟ كيف يخفي أو يظهر مشاعره؟',
    },
    {
      titleAr: 'القيم والمبادئ الجوهرية',
      titleEn: 'CORE VALUES & ETHICS',
      icon: <Award className="w-5 h-5 text-[#8c1d18]" />,
      textKey: 'coreValues' as keyof MindThinking,
      confKey: 'coreValuesConfidence' as keyof MindThinking,
      placeholder: 'ما هي الخطوط الحمراء التي لا يتنازل عنها؟ (الوفاء، السمعة، الاستقلال المالي، الصدق...)؟',
    },
    {
      titleAr: 'أسلوب التواصل والتعبير',
      titleEn: 'COMMUNICATION STYLE',
      icon: <MessageSquare className="w-5 h-5 text-[#8c1d18]" />,
      textKey: 'communicationStyle' as keyof MindThinking,
      confKey: 'communicationStyleConfidence' as keyof MindThinking,
      placeholder: 'مباشر أم ديبلوماسي غامض؟ يفضل الاستماع أم الحديث؟ نبرته هجومية أم تشاركية؟',
    },
  ];

  return (
    <div className="bg-vintage-paper border-2 border-[#bfa57d] rounded-lg p-6 sm:p-8 min-h-[600px] shadow-sm relative font-arabic-body text-[#2c1d11]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-4 mb-6 border-b-2 border-[#8c6b45]">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-black font-typewriter tracking-wide text-[#2b1b10]">
              MIND & THINKING
            </h1>
            <span className="text-xl sm:text-2xl font-bold font-arabic-hand text-[#8c1d18]">
              • العقل والتفكير
            </span>
          </div>
          <p className="text-xs text-[#705238] mt-1">
            خريطة المعالجة الإدراكية، منظومة القيم، وأنماط السلوك تحت المجهر التحليلي.
          </p>
        </div>

        <div className="flex items-center gap-2 mt-3 sm:mt-0">
          <button
            type="button"
            onClick={() => (isEditing ? handleSaveAll() : setIsEditing(true))}
            className="px-3.5 py-1.5 bg-[#ecdcc4] hover:bg-[#dfcbb0] text-[#4a3422] text-xs font-bold rounded border border-[#a68660] transition flex items-center gap-1.5 shadow-sm"
          >
            {isEditing ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-700" />
                <span>حفظ التعديلات</span>
              </>
            ) : (
              <span>تعديل البنود</span>
            )}
          </button>
        </div>
      </div>

      {/* Grid of 6 dimensions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {items.map((item, idx) => {
          const confidence = (mind[item.confKey] as ConfidenceLevel) || 'medium';
          const confInfo = confidenceLabels[confidence];

          return (
            <div
              key={idx}
              className="bg-[#f5ecda] border-2 border-[#cbb184] rounded-md p-4 shadow-sm flex flex-col justify-between"
            >
              <div>
                <div className="flex justify-between items-center mb-2 pb-1 border-b border-[#cca779]">
                  <div className="flex items-center gap-2">
                    {item.icon}
                    <div>
                      <h3 className="text-sm font-bold text-[#291a0f] font-arabic-body">
                        {item.titleAr}
                      </h3>
                      <p className="font-typewriter text-[10px] text-[#7a5f45] uppercase">
                        {item.titleEn}
                      </p>
                    </div>
                  </div>

                  {/* Confidence Badge */}
                  <button
                    type="button"
                    onClick={() => handleConfidenceCycle(item.confKey)}
                    title={`انقر لتغيير درجة الثقة (${confInfo.desc})`}
                    className={`px-2 py-0.5 text-[11px] font-bold rounded border transition-all flex items-center gap-1 ${confInfo.color}`}
                  >
                    <span>{confInfo.ar}</span>
                    <span className="text-[9px] opacity-70">↺</span>
                  </button>
                </div>

                {isEditing ? (
                  <textarea
                    rows={3}
                    value={(mind[item.textKey] as string) || ''}
                    onChange={(e) => handleTextChange(item.textKey, e.target.value)}
                    placeholder={item.placeholder}
                    className="w-full bg-[#faf5eb] p-2 text-xs font-arabic-body rounded border border-[#bfa57d] text-[#1a110a] focus:outline-none focus:bg-white"
                  />
                ) : (
                  <p className="text-xs font-arabic-body text-[#2c1d11] leading-relaxed min-h-[50px]">
                    {(mind[item.textKey] as string) || (
                      <span className="text-[#8c745c] italic">
                        لم يتم تدوين ملاحظات حول هذا الجانب بعد. انقر على "تعديل البنود" لإضافة تحليلك.
                      </span>
                    )}
                  </p>
                )}
              </div>

              <div className="pt-2 mt-2 border-t border-[#e0c89a] flex justify-between items-center text-[10px] text-[#8c745c] font-typewriter">
                <span>OBSERVATION EVIDENCE</span>
                <span className="text-stone-500">{confInfo.desc}</span>
              </div>
            </div>
          );
        })}
      </div>

      <LexiconSection dossier={dossier} onUpdateDossier={onUpdateDossier} />
    </div>
  );
};
