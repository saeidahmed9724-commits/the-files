import React, { useState } from 'react';
import { X, ClipboardPaste, Check, Sparkles } from 'lucide-react';
import { PersonDossier, PredictionEntry } from '../types/dossier';

interface PasteAIModalProps {
  isOpen: boolean;
  onClose: () => void;
  dossier: PersonDossier;
  onSaveSummary: (summary: string) => void;
  onSaveChanges: (analysis: string) => void;
  onSavePrediction: (prediction: PredictionEntry) => void;
}

export const PasteAIModal: React.FC<PasteAIModalProps> = ({
  isOpen,
  onClose,
  dossier,
  onSaveSummary,
  onSaveChanges,
  onSavePrediction,
}) => {
  const [content, setContent] = useState('');
  const [targetSection, setTargetSection] = useState<'summary' | 'changes' | 'prediction'>('summary');
  const [scenarioInput, setScenarioInput] = useState('');
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleApply = () => {
    if (!content.trim()) return;

    if (targetSection === 'summary') {
      onSaveSummary(content.trim());
    } else if (targetSection === 'changes') {
      onSaveChanges(content.trim());
    } else if (targetSection === 'prediction') {
      const newPred: PredictionEntry = {
        id: `pred-${Date.now()}`,
        date: new Date().toISOString().split('T')[0],
        scenario: scenarioInput.trim() || 'توقع مستورد من الذكاء الاصطناعي',
        predictedReaction: content.trim(),
        verdict: 'pending',
      };
      onSavePrediction(newPred);
    }

    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
      setContent('');
      setScenarioInput('');
    }, 900);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#fcf8f0] border-4 border-[#8c6b45] max-w-xl w-full rounded-lg shadow-2xl relative p-6 my-6 text-right font-arabic-body">
        {/* Header */}
        <div className="flex justify-between items-center pb-3 border-b-2 border-[#b5956f]">
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded hover:bg-[#ebd9bd] text-[#5c4028] transition"
            aria-label="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <span className="stamp-red text-xs">إيداع تحليلي</span>
            <h2 className="text-lg font-bold text-[#3d2716] font-typewriter">
              لصق رد الذكاء الاصطناعي (Paste AI Reply)
            </h2>
          </div>
        </div>

        <p className="text-xs text-[#6e5033] my-3 leading-relaxed">
          الصق هنا الإجابة أو التحليل الذي حصلت عليه من (ChatGPT، Claude، Gemini أو أي نموذج آخر)،
          وحدد القسم الذي تود حفظه فيه داخل ملف ({dossier.name}):
        </p>

        {/* Section Target Selection */}
        <div className="mb-4">
          <label className="block text-xs font-bold text-[#5c4028] mb-1.5 font-typewriter">
            القسم المستهدف للحفظ:
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setTargetSection('summary')}
              className={`p-2 rounded text-xs font-bold border transition ${
                targetSection === 'summary'
                  ? 'bg-[#8c1d18] text-[#fbf7ee] border-[#8c1d18] shadow'
                  : 'bg-[#f4ecd8] text-[#4a3422] border-[#b5956f] hover:bg-[#ebe1c9]'
              }`}
            >
              خلاصة الشخصية (ص١)
            </button>
            <button
              type="button"
              onClick={() => setTargetSection('changes')}
              className={`p-2 rounded text-xs font-bold border transition ${
                targetSection === 'changes'
                  ? 'bg-[#8c1d18] text-[#fbf7ee] border-[#8c1d18] shadow'
                  : 'bg-[#f4ecd8] text-[#4a3422] border-[#b5956f] hover:bg-[#ebe1c9]'
              }`}
            >
              التغير عبر الزمن (ص٥)
            </button>
            <button
              type="button"
              onClick={() => setTargetSection('prediction')}
              className={`p-2 rounded text-xs font-bold border transition ${
                targetSection === 'prediction'
                  ? 'bg-[#8c1d18] text-[#fbf7ee] border-[#8c1d18] shadow'
                  : 'bg-[#f4ecd8] text-[#4a3422] border-[#b5956f] hover:bg-[#ebe1c9]'
              }`}
            >
              توقع وسيناريو (ص٦)
            </button>
          </div>
        </div>

        {targetSection === 'prediction' && (
          <div className="mb-3">
            <label className="block text-xs font-bold text-[#5c4028] mb-1 font-typewriter">
              عنوان الموقف أو السيناريو:
            </label>
            <input
              type="text"
              value={scenarioInput}
              onChange={(e) => setScenarioInput(e.target.value)}
              placeholder="مثال: رد فعله لو اعتذرت عن الحضور..."
              className="w-full bg-[#f4ecd8] border-b-2 border-[#8c6b45] p-2 text-xs text-[#2a1a0e] rounded focus:outline-none"
            />
          </div>
        )}

        {/* Text Area */}
        <div className="mb-4">
          <label className="block text-xs font-bold text-[#5c4028] mb-1 font-typewriter">
            نص الرد من الذكاء الاصطناعي:
          </label>
          <textarea
            rows={6}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="الصق نص التحليل هنا..."
            className="w-full bg-[#f4ecd8] border-2 border-[#b5956f] p-3 text-sm text-[#2a1a0e] rounded font-arabic-body focus:outline-none focus:bg-white"
          />
        </div>

        {/* Actions */}
        <div className="pt-3 border-t border-[#b5956f] flex justify-between items-center">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-[#8c6b45] text-[#5c4028] hover:bg-[#ebd9bd] rounded transition text-sm"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={handleApply}
            disabled={!content.trim()}
            className="px-6 py-2.5 bg-[#8c1d18] hover:bg-[#731713] disabled:opacity-50 text-[#fbf7ee] font-bold rounded shadow-lg transition text-sm flex items-center gap-2"
          >
            {savedSuccess ? (
              <>
                <Check className="w-4 h-4 text-emerald-300" />
                <span>تم الحفظ بنجاح في الملف!</span>
              </>
            ) : (
              <>
                <ClipboardPaste className="w-4 h-4" />
                <span>تطبيق وحفظ في الملف</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
