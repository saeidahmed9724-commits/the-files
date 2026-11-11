import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowRight,
  ArrowLeft,
  X,
  Copy,
  ClipboardPaste,
  Trash2,
  BookOpen,
  ChevronRight,
  ChevronLeft,
  FolderClosed,
  FolderOpen,
  User,
  Brain,
  Smile,
  Clock,
  History,
  Target,
  Share2,
  MessagesSquare,
  Users,
} from 'lucide-react';
import { PersonDossier, PredictionEntry } from '../types/dossier';
import { Page1Character } from './pages/Page1Character';
import { Page2Mind } from './pages/Page2Mind';
import { Page3Triggers } from './pages/Page3Triggers';
import { Page4Timeline } from './pages/Page4Timeline';
import { Page5Changes } from './pages/Page5Changes';
import { Page6Predictions } from './pages/Page6Predictions';
import { Page7Simulator } from './pages/Page7Simulator';
import { Page8Life } from './pages/Page8Life';
import { CopyForAIModal } from './CopyForAIModal';
import { PasteAIModal } from './PasteAIModal';

interface FolderViewProps {
  dossier: PersonDossier;
  onClose: () => void;
  onUpdateDossier: (updated: Partial<PersonDossier>) => void;
  onDeleteDossier: (id: string) => void;
  /** Other files in the archive, for linking circle members. */
  linkable?: { id: string; name: string }[];
  onOpenLinked?: (id: string) => void;
}

export const FolderView: React.FC<FolderViewProps> = ({
  dossier,
  onClose,
  onUpdateDossier,
  onDeleteDossier,
  linkable = [],
  onOpenLinked,
}) => {
  const [activePage, setActivePage] = useState<number>(1);
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  // Track direction for AnimatePresence page transitions
  const directionRef = useRef<'next' | 'prev'>('next');

  const pages = [
    { num: 1, id: 'char', title: 'ملف الشخصية', icon: User, code: 'FILE-01' },
    { num: 2, id: 'mind', title: 'العقل والتفكير', icon: Brain, code: 'MIND-02' },
    { num: 3, id: 'trig', title: 'المحفزات والمريحات', icon: Smile, code: 'TRIG-03' },
    { num: 4, id: 'time', title: 'سجل الملاحظات', icon: Clock, code: 'LOG-04' },
    { num: 5, id: 'evol', title: 'التغير عبر الزمن', icon: History, code: 'EVOL-05' },
    { num: 6, id: 'pred', title: 'التوقعات والفرضيات', icon: Target, code: 'PRED-06' },
    { num: 7, id: 'sim', title: 'محاكي المواجهات', icon: MessagesSquare, code: 'SIM-07' },
    { num: 8, id: 'life', title: 'حياته ودايرته', icon: Users, code: 'LIFE-08' },
  ];

  const goToPage = (pageNumber: number) => {
    if (pageNumber === activePage || pageNumber < 1 || pageNumber > 8) return;
    directionRef.current = pageNumber > activePage ? 'next' : 'prev';
    setActivePage(pageNumber);
  };

  const handleNextPage = () => {
    if (activePage < 8) goToPage(activePage + 1);
  };

  const handlePrevPage = () => {
    if (activePage > 1) goToPage(activePage - 1);
  };

  /** Render the current page content */
  const renderPage = () => {
    switch (activePage) {
      case 1:
        return <Page1Character dossier={dossier} onUpdateDossier={onUpdateDossier} onGoToPage={goToPage} />;
      case 2:
        return <Page2Mind dossier={dossier} onUpdateDossier={onUpdateDossier} />;
      case 3:
        return <Page3Triggers dossier={dossier} onUpdateDossier={onUpdateDossier} />;
      case 4:
        return <Page4Timeline dossier={dossier} onUpdateDossier={onUpdateDossier} linkable={linkable} />;
      case 5:
        return <Page5Changes dossier={dossier} onUpdateDossier={onUpdateDossier} />;
      case 6:
        return <Page6Predictions dossier={dossier} onUpdateDossier={onUpdateDossier} />;
      case 7:
        return <Page7Simulator dossier={dossier} onUpdateDossier={onUpdateDossier} />;
      case 8:
        return <Page8Life dossier={dossier} onUpdateDossier={onUpdateDossier} linkable={linkable} onOpenLinked={onOpenLinked} />;
      default:
        return null;
    }
  };

  const direction = directionRef.current;

  return (
    // 1) Overall entrance: fade in from below
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="min-h-screen bg-desk-wood py-6 px-3 sm:px-6 flex flex-col items-center justify-start relative overflow-x-hidden font-arabic-body"
    >
      {/* Background vignette */}
      <div className="absolute inset-0 bg-radial-gradient pointer-events-none opacity-80" />

      {/* 2) Top Floating Control Bar — slides in from top with spring */}
      <motion.div
        initial={{ opacity: 0, y: -40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 24, delay: 0.15 }}
        className="w-full max-w-5xl z-20 flex flex-wrap items-center justify-between gap-3 mb-4 bg-[#1f1610]/90 border border-[#8a6843]/60 px-4 py-2.5 rounded-xl shadow-xl backdrop-blur-md"
      >
        {/* Close Button / Return to desk */}
        <button
          type="button"
          onClick={onClose}
          className="px-3.5 py-1.5 bg-[#8a6843] hover:bg-[#9c764e] active:scale-95 text-[#1a120a] font-bold rounded-lg border border-[#d9be8c] transition flex items-center gap-2 shadow text-xs sm:text-sm"
        >
          <FolderClosed className="w-4 h-4" />
          <span>إغلاق الملف والعودة للمكتب</span>
        </button>

        {/* Person details pill */}
        <div className="flex items-center gap-2 text-[#d9be8c] font-typewriter text-xs sm:text-sm">
          <span className="font-bold text-[#fcf8f0] font-arabic-hand text-base sm:text-lg">
            {dossier.name}
          </span>
          <span className="text-[#8c745c] hidden sm:inline">•</span>
          <span className="text-[#cbb184] hidden sm:inline">{dossier.relationship}</span>
          <span className="text-[#8c745c] hidden sm:inline">•</span>
          <span className="stamp-red text-[10px] hidden md:inline-block">
            {dossier.codeName || 'ملف سري'}
          </span>
        </div>

        {/* Action Buttons: Copy for AI, Paste AI, Delete */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowCopyModal(true)}
            title="نسخ الملف بالكامل كبرومبت للذكاء الاصطناعي"
            className="px-3 py-1.5 bg-[#2d2016] hover:bg-[#3d2b1e] text-[#e6d3b3] hover:text-white text-xs font-bold rounded-lg border border-[#735436] transition flex items-center gap-1.5 shadow"
          >
            <Copy className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">نسخ للذكاء الاصطناعي</span>
            <span className="sm:hidden">نسخ</span>
          </button>

          <button
            type="button"
            onClick={() => setShowPasteModal(true)}
            title="لصق رد من ChatGPT أو Claude أو Gemini"
            className="px-3 py-1.5 bg-[#2d2016] hover:bg-[#3d2b1e] text-[#e6d3b3] hover:text-white text-xs font-bold rounded-lg border border-[#735436] transition flex items-center gap-1.5 shadow"
          >
            <ClipboardPaste className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">لصق رد الذكاء الاصطناعي</span>
            <span className="sm:hidden">لصق</span>
          </button>

          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            title="حذف هذا الملف نهائياً من الأرشيف"
            className="p-1.5 bg-[#2d2016] hover:bg-rose-950/60 text-stone-400 hover:text-rose-400 rounded-lg border border-[#735436] transition"
            aria-label="حذف الملف"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </motion.div>

      {/* Manila Folder Book Container */}
      <div className="w-full max-w-5xl z-10 relative">
        {/* 4) Tab buttons with animated active indicator */}
        <div className="flex items-end justify-between px-6 -mb-1 relative z-0">
          <div className="flex gap-1 overflow-x-auto pb-1 max-w-full scrollbar-none">
            {pages.map((p) => {
              const Icon = p.icon;
              const isActive = activePage === p.num;
              return (
                <button
                  key={p.num}
                  type="button"
                  onClick={() => goToPage(p.num)}
                  className={`relative px-3 sm:px-4 py-2 rounded-t-lg font-typewriter text-xs sm:text-sm font-bold border-t-2 border-r-2 border-l-2 transition-colors flex items-center gap-1.5 whitespace-nowrap shadow-md ${
                    isActive
                      ? 'text-[#1c120a] border-[#8c6b45] translate-y-0.5 z-10'
                      : 'bg-[#b89f74] hover:bg-[#c9af83] text-[#3d2a1a] border-[#8a6843] opacity-85 hover:opacity-100'
                  }`}
                >
                  {/* layoutId active indicator slides between tabs */}
                  {isActive && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute inset-0 bg-[#dfc89d] rounded-t-[6px] -z-10"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                  <Icon className="w-3.5 h-3.5 relative z-10" />
                  <span className="font-arabic-body relative z-10">{p.title}</span>
                  <span className="text-[10px] opacity-70 font-typewriter relative z-10">({p.num})</span>
                </button>
              );
            })}
          </div>

          <div className="hidden md:flex items-center gap-2 pb-2 text-xs font-typewriter text-[#cbb184]">
            <span>DOSSIER #{dossier.id.slice(-6).toUpperCase()}</span>
          </div>
        </div>

        {/* 8) Opened Folder Manila Base — subtle shadow animation on mount */}
        <motion.div
          initial={{ boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}
          animate={{ boxShadow: '0 25px 50px -12px rgba(0,0,0,0.4), 0 12px 24px -8px rgba(140,107,69,0.3)' }}
          transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
          className="bg-[#dfc89d] border-4 border-[#8c6b45] rounded-xl p-3 sm:p-5 relative folder-shadow min-h-[700px] flex flex-col justify-between"
        >
          {/* Manila texture details & spine shadow */}
          <div className="absolute inset-y-0 right-1/2 w-6 bg-gradient-to-r from-transparent via-[#bfa478]/40 to-transparent pointer-events-none hidden md:block" />
          <div className="absolute top-2 left-4 text-[10px] font-typewriter text-[#8a6843] select-none">
            CONFIDENTIAL ARCHIVE • STRICTLY PRIVATE
          </div>

          {/* 3) Active Page with AnimatePresence page-flip animation */}
          <div className="relative z-10 overflow-hidden">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={activePage}
                initial={{ opacity: 0, x: direction === 'next' ? 50 : -50, scale: 0.98 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: direction === 'next' ? -50 : 50, scale: 0.98 }}
                transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
              >
                {renderPage()}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Bottom Book Page Navigation Bar */}
          <div className="mt-6 pt-4 border-t-2 border-[#bfa478] flex items-center justify-between z-20">
            {/* 5) Prev Page Button — whileTap & whileHover */}
            <motion.button
              type="button"
              onClick={handlePrevPage}
              disabled={activePage === 1}
              whileTap={{ scale: 0.95 }}
              whileHover={{ scale: 1.05 }}
              className="px-4 py-2 bg-[#ecdcc4] hover:bg-[#f5e9d6] disabled:opacity-30 disabled:pointer-events-none text-[#2d1c10] font-bold rounded-lg border border-[#a68660] transition flex items-center gap-2 text-xs sm:text-sm shadow-sm"
            >
              <ArrowRight className="w-4 h-4" />
              <span>الصفحة السابقة</span>
            </motion.button>

            {/* 6) Page Indicator Dots — active dot scales up with spring */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((num) => (
                <motion.button
                  key={num}
                  type="button"
                  onClick={() => goToPage(num)}
                  aria-label={`انتقال للصفحة ${num}`}
                  animate={
                    activePage === num
                      ? { scale: 1.2, backgroundColor: '#8c1d18', color: '#fcf8f0' }
                      : { scale: 1, backgroundColor: '#ecdcc4', color: '#4a3422' }
                  }
                  transition={
                    activePage === num
                      ? { type: 'spring', stiffness: 400, damping: 17 }
                      : { duration: 0.2 }
                  }
                  whileHover={{ scale: activePage === num ? 1.25 : 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full font-typewriter text-xs font-bold flex items-center justify-center border ${
                    activePage === num
                      ? 'border-[#8c1d18] shadow'
                      : 'border-[#b5956f]'
                  }`}
                >
                  {num}
                </motion.button>
              ))}
              <span className="text-xs font-bold text-[#5c4028] mr-2 font-arabic-body hidden sm:inline">
                (صفحة {activePage} من ٨)
              </span>
            </div>

            {/* 5) Next Page Button — whileTap & whileHover */}
            <motion.button
              type="button"
              onClick={handleNextPage}
              disabled={activePage === 8}
              whileTap={{ scale: 0.95 }}
              whileHover={{ scale: 1.05 }}
              className="px-4 py-2 bg-[#ecdcc4] hover:bg-[#f5e9d6] disabled:opacity-30 disabled:pointer-events-none text-[#2d1c10] font-bold rounded-lg border border-[#a68660] transition flex items-center gap-2 text-xs sm:text-sm shadow-sm"
            >
              <span>الصفحة التالية</span>
              <ArrowLeft className="w-4 h-4" />
            </motion.button>
          </div>
        </motion.div>
      </div>

      {/* Copy For AI Modal */}
      <CopyForAIModal
        isOpen={showCopyModal}
        onClose={() => setShowCopyModal(false)}
        dossier={dossier}
      />

      {/* Paste AI Reply Modal */}
      <PasteAIModal
        isOpen={showPasteModal}
        onClose={() => setShowPasteModal(false)}
        dossier={dossier}
        onSaveSummary={(summary) => onUpdateDossier({ personalitySummary: summary })}
        onSaveChanges={(analysis) =>
          onUpdateDossier({
            changesOverTime: {
              ...dossier.changesOverTime,
              analysisText: analysis,
              lastGenerated: new Date().toISOString().split('T')[0],
            },
          })
        }
        onSavePrediction={(prediction) =>
          onUpdateDossier({
            predictions: [prediction, ...(dossier.predictions || [])],
          })
        }
      />

      {/* 7) Delete Confirmation Modal — AnimatePresence with backdrop fade & modal scale-in */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div
            key="delete-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ type: 'spring', stiffness: 350, damping: 25 }}
              className="bg-[#241a12] border-2 border-rose-800 rounded-xl p-6 max-w-sm w-full text-right font-arabic-body"
            >
              <h3 className="text-lg font-bold text-rose-300 mb-2 font-arabic-body">
                تأكيد إتلاف وحذف الملف
              </h3>
              <p className="text-xs text-[#a89279] mb-4 leading-relaxed">
                هل أنت متأكد من رغبتك في حذف ملف ({dossier.name}) نهائياً من الأرشيف؟ لا يمكن التراجع عن هذا الإجراء بعد تنفيذه.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onDeleteDossier(dossier.id);
                    setShowDeleteConfirm(false);
                  }}
                  className="flex-1 py-2 bg-rose-800 hover:bg-rose-900 text-white font-bold rounded-lg transition text-xs"
                >
                  نعم، احذف الملف
                </button>
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 bg-transparent text-[#a89279] hover:text-white border border-[#4a3623] rounded-lg transition text-xs"
                >
                  إلغاء
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
