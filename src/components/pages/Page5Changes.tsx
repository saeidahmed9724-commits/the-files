import React, { useState } from 'react';
import { callAI } from '../../lib/ai';
import { History, Sparkles, Loader2, Edit3, Check, RefreshCw, FileText } from 'lucide-react';
import { PersonDossier } from '../../types/dossier';

interface Page5ChangesProps {
  dossier: PersonDossier;
  onUpdateDossier: (updated: Partial<PersonDossier>) => void;
}

export const Page5Changes: React.FC<Page5ChangesProps> = ({ dossier, onUpdateDossier }) => {
  const [analysisText, setAnalysisText] = useState(dossier.changesOverTime?.analysisText || '');
  const [lastGenerated, setLastGenerated] = useState(dossier.changesOverTime?.lastGenerated || '');
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiError, setAiError] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setAiError('');
    try {
      const result = await callAI('changes', { dossier });
      const today = new Date().toISOString().split('T')[0];
      setAnalysisText(result);
      setLastGenerated(today);
      onUpdateDossier({
        changesOverTime: {
          analysisText: result,
          lastGenerated: today,
        },
      });
    } catch (err: any) {
      console.error('Error generating changes:', err);
      setAiError(err?.message || 'حدث خطأ غير متوقع');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveText = () => {
    onUpdateDossier({
      changesOverTime: {
        analysisText,
        lastGenerated: lastGenerated || new Date().toISOString().split('T')[0],
      },
    });
    setIsEditing(false);
  };

  return (
    <div className="bg-vintage-paper border-2 border-[#bfa57d] rounded-lg p-6 sm:p-8 min-h-[600px] shadow-sm relative font-arabic-body text-[#2c1d11]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-4 mb-6 border-b-2 border-[#8c6b45]">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-black font-typewriter tracking-wide text-[#2b1b10]">
              CHANGES OVER TIME
            </h1>
            <span className="text-xl sm:text-2xl font-bold font-arabic-hand text-[#8c1d18]">
              • التغير والتحول عبر الزمن
            </span>
          </div>
          <p className="text-xs text-[#705238] mt-1">
            مقارنة ذكية بين الملاحظات التاريخية المبكرة والحديثة لرصد التحولات السلوكية والنفسية المستجدة.
          </p>
        </div>

        <div className="flex items-center gap-2 mt-3 sm:mt-0">
          {analysisText && (
            <button
              type="button"
              onClick={() => (isEditing ? handleSaveText() : setIsEditing(true))}
              className="px-3 py-1.5 bg-[#ecdcc4] hover:bg-[#dfcbb0] text-[#4a3422] text-xs font-bold rounded border border-[#a68660] transition flex items-center gap-1 shadow-sm"
            >
              {isEditing ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-700" />
                  <span>حفظ التعديل</span>
                </>
              ) : (
                <>
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>تعديل النص</span>
                </>
              )}
            </button>
          )}

          <button
            type="button"
            onClick={handleGenerate}
            disabled={isGenerating}
            className="px-4 py-1.5 bg-[#8c1d18] hover:bg-[#731713] text-[#fbf7ee] text-xs font-bold rounded shadow transition flex items-center gap-1.5 disabled:opacity-50"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>جاري تحليل السجلات...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>{analysisText ? 'إعادة التحليل بالذكاء الاصطناعي' : 'تحليل مسار التغير (Gemini)'}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Analysis Display / Empty State */}
      {!analysisText ? (
        <div className="bg-[#f5ecda] border-2 border-dashed border-[#cbb184] rounded-lg p-12 text-center my-8">
          <History className="w-12 h-12 text-[#8c6b45] mx-auto mb-3 opacity-60" />
          <h3 className="text-lg font-bold text-[#4a3422] mb-2 font-arabic-body">
            لم يتم إنشاء تحليل لتطور الشخصية بعد
          </h3>
          <p className="text-xs text-[#7a5f45] max-w-md mx-auto mb-6 leading-relaxed">
            يقوم الذكاء الاصطناعي بدراسة جميع مدخلات السجل الزمني ومقارنة فترات التعارف الأولى مع أحدث الملاحظات لاستخراج:
            الأنماط التي اختفت، السلوكيات التي ترسخت، وأين تتجه بوصلة الشخصية حالياً.
          </p>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={isGenerating}
            className="px-6 py-2.5 bg-[#8c1d18] hover:bg-[#731713] text-white text-xs font-bold rounded-lg shadow-md transition inline-flex items-center gap-2"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>جاري المعالجة...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>بدء تحليل مسار التغير الآن</span>
              </>
            )}
          </button>
          {aiError && (
        <div className="mt-2 text-[11px] text-rose-800 bg-rose-100 border border-rose-300 rounded px-2 py-1.5 ">
          ⚠ {aiError}
        </div>
      )}
        </div>
      ) : (
        <div className="bg-[#faf5eb] border-2 border-[#cbb184] rounded-lg p-6 shadow-inner relative">
          {aiError && (
            <div className="mb-3 text-[11px] text-rose-800 bg-rose-100 border border-rose-300 rounded px-2 py-1.5">
              ⚠ {aiError}
            </div>
          )}
          {/* Metadata bar */}
          <div className="flex justify-between items-center pb-3 mb-4 border-b border-[#cca779] text-xs font-typewriter text-[#7a5f45]">
            <span className="stamp-black text-[11px]">تقرير تحليلي معتمد</span>
            <span>تاريخ إصدار التقرير: {lastGenerated || 'غير محدد'}</span>
          </div>

          {isEditing ? (
            <textarea
              rows={14}
              value={analysisText}
              onChange={(e) => setAnalysisText(e.target.value)}
              className="w-full bg-[#f4ecd8] border border-[#a68660] p-4 text-xs sm:text-sm font-arabic-body rounded leading-relaxed text-[#1a110a] focus:outline-none"
            />
          ) : (
            <div className="prose prose-stone text-xs sm:text-sm font-arabic-body text-[#24170e] leading-relaxed whitespace-pre-wrap">
              {analysisText}
            </div>
          )}

          <div className="mt-6 pt-3 border-t border-[#e0c89a] flex justify-between items-center text-[10px] text-[#8c745c] font-typewriter">
            <span>METHODOLOGY: COMPARATIVE TEMPORAL SYNTHESIS</span>
            <span>MODEL: GEMINI 3.8 FLASH</span>
          </div>
        </div>
      )}
    </div>
  );
};
