import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Copy, Check, FileText, Sparkles } from 'lucide-react';
import { PersonDossier } from '../types/dossier';
import { formatDossierForAI } from '../utils/dossierLogic';

interface CopyForAIModalProps {
  isOpen: boolean;
  onClose: () => void;
  dossier: PersonDossier;
}

export const CopyForAIModal: React.FC<CopyForAIModalProps> = ({ isOpen, onClose, dossier }) => {
  const [copied, setCopied] = useState(false);

  const formattedPrompt = formatDossierForAI(dossier);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(formattedPrompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 24 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="bg-[#fcf8f0] border-4 border-[#8c6b45] max-w-2xl w-full rounded-lg shadow-2xl relative p-6 my-6 text-right font-arabic-body max-h-[90vh] flex flex-col"
          >
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
            <span className="stamp-black text-xs">تجهيز الذكاء الاصطناعي</span>
            <h2 className="text-lg font-bold text-[#3d2716] font-typewriter">
              نسخ كامل الملف للذكاء الاصطناعي (Copy for AI)
            </h2>
          </div>
        </div>

        {/* Instructions banner */}
        <div className="my-3 p-3 bg-[#f5ecda] border-r-4 border-[#8c1d18] rounded text-xs text-[#4a3422] leading-relaxed">
          <p className="font-bold mb-1">💡 كيف تستفيد من هذا النص؟</p>
          <p>
            هذا النص تم تنسيقه ليكون برومبت متكاملاً مع توجيهات أمان منهجية لمحلل الذكاء الاصطناعي
            (تنبيهه بأنها ملاحظات شخصية وليست حقائق قطعية). يمكنك نسخه ولصقه في أي نموذج ذكاء اصطناعي (ChatGPT أو Claude أو Gemini) وسؤاله عما تريد!
          </p>
        </div>

        {/* Text Preview Box */}
        <div className="flex-1 overflow-y-auto bg-[#2b2118] text-[#e6d6c3] p-4 rounded border border-[#6b5239] font-typewriter text-xs whitespace-pre-wrap leading-relaxed select-all my-2">
          {formattedPrompt}
        </div>

        {/* Actions */}
        <div className="pt-3 border-t border-[#b5956f] flex justify-between items-center">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-[#8c6b45] text-[#5c4028] hover:bg-[#ebd9bd] rounded transition text-sm"
          >
            إغلاق
          </button>
          <motion.button
            type="button"
            onClick={handleCopy}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="px-6 py-2.5 bg-[#8c1d18] hover:bg-[#731713] text-[#fbf7ee] font-bold rounded shadow-lg transition text-sm flex items-center gap-2"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-300" />
                <span className="text-emerald-200">تم نسخ الملف بالكامل للحافظة!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>نسخ النص كاملاً للحافظة</span>
              </>
            )}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
      )}
    </AnimatePresence>
  );
};
