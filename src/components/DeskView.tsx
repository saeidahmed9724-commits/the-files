import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search,
  Plus,
  Download,
  Upload,
  KeyRound,
  Lock,
  DatabaseBackup,
  Folder,
  FolderOpen,
  Calendar,
  Eye,
  FileText,
  RotateCcw,
  Sparkles,
  Shield,
  Clock,
  UserRound,
  Star,
} from 'lucide-react';
import { PersonDossier } from '../types/dossier';
import { searchDossiers } from '../utils/dossierLogic';
import { NewFileModal } from './NewFileModal';
import { DossierPhoto } from './DossierPhoto';
import { ChangeCodeModal } from './ChangeCodeModal';

interface DeskViewProps {
  dossiers: PersonDossier[];
  onOpenDossier: (dossier: PersonDossier) => void;
  onAddDossier: (dossier: PersonDossier) => void;
  onExportData: () => void;
  onImportData: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onLock: () => void;
  onLoadSamples: () => void;
  /** Creates (or opens) the user's own file. */
  onCreateSelf: () => void;
  legacyCount: number;
  onImportFromBrowser: () => void;
}

export const DeskView: React.FC<DeskViewProps> = ({
  dossiers,
  onOpenDossier,
  onAddDossier,
  onExportData,
  onImportData,
  onLock,
  onLoadSamples,
  onCreateSelf,
  legacyCount,
  onImportFromBrowser,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewModal, setShowNewModal] = useState(false);
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [openingFolderId, setOpeningFolderId] = useState<string | null>(null);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const filteredDossiers = searchDossiers(dossiers, searchQuery);

  // Predefined rotation angles for realistic scattered folders on desk
  const rotations = [-2.5, 1.8, -1.2, 2.8, -3.2, 1.5, -2, 2.2];

  const handleFolderClick = (dossier: PersonDossier) => {
    setOpeningFolderId(dossier.id);
    setTimeout(() => {
      onOpenDossier(dossier);
      setOpeningFolderId(null);
    }, 400);
  };

  return (
    <div className="min-h-screen bg-desk-wood py-6 px-4 sm:px-8 relative overflow-x-hidden font-arabic-body text-[#e6d6c3]">
      {/* Background vignette & vintage leather mat atmosphere — subtle breathing */}
      <motion.div
        className="absolute inset-0 bg-radial-gradient pointer-events-none"
        animate={{ opacity: [0.8, 0.85, 0.8] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Top Desk Header & Toolbar — slide down from top */}
      <motion.header
        initial={{ y: -30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 80, damping: 18, mass: 0.8 }}
        className="relative z-20 max-w-7xl mx-auto mb-8 bg-[#1f1610]/90 border border-[#8a6843]/60 rounded-2xl p-4 sm:p-5 shadow-2xl backdrop-blur-md"
      >
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 pb-4 border-b border-[#4d3623]">
          {/* Logo & Subtitle */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-[#2e1f15] border-2 border-[#8c6b45] flex items-center justify-center text-[#d9be8c] shadow-inner">
              <FolderOpen className="w-6 h-6 text-[#d9be8c]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-black font-typewriter tracking-wider text-[#f5ebd6]">
                  THE FILES
                </h1>
                <span className="text-xl sm:text-2xl font-bold font-arabic-hand text-[#c94a44]">
                  • الملفات
                </span>
                <span className="stamp-red text-[10px] hidden sm:inline-block">
                  أرشيف شخصي سري
                </span>
              </div>
              <p className="text-xs text-[#a89279] mt-0.5">
                نظام الأرشيف والملاحظات الميدانية لدراسة الشخصيات وتوقع ردود أفعالها.
              </p>
            </div>
          </div>

          {/* Quick Actions: Add File, Export, Import, Lock */}
          <div className="flex flex-wrap items-center gap-2">
            {/* "+ ملف جديد" button with gentle pulse animation */}
            <motion.button
              type="button"
              onClick={() => setShowNewModal(true)}
              animate={{ scale: [1, 1.02, 1] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
              whileHover={{ scale: 1.06 }}
              whileTap={{ scale: 0.95 }}
              className="px-4 py-2 bg-[#8c1d18] hover:bg-[#a3221c] text-[#fbf7ee] font-bold text-xs sm:text-sm rounded-lg shadow-lg border border-[#c43d36] transition flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>+ ملف جديد</span>
            </motion.button>

            <button
              type="button"
              onClick={onExportData}
              title="تصدير نسخة احتياطية من الأرشيف كملف JSON"
              className="px-3 py-2 bg-[#2a1d14] hover:bg-[#38271c] text-[#d9be8c] text-xs font-bold rounded-lg border border-[#5c4028] transition flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">تصدير البيانات</span>
            </button>

            <label
              title="استيراد ملف بيانات JSON"
              className="px-3 py-2 bg-[#2a1d14] hover:bg-[#38271c] text-[#d9be8c] text-xs font-bold rounded-lg border border-[#5c4028] transition flex items-center gap-1.5 cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">استيراد بيانات</span>
              <input
                type="file"
                accept=".json"
                onChange={onImportData}
                className="hidden"
              />
            </label>

            {legacyCount > 0 && (
              <button
                type="button"
                onClick={onImportFromBrowser}
                title="رفع الملفات المحفوظة قديماً في هذا المتصفح إلى حسابك"
                className="px-3 py-2 bg-[#3a2a12] hover:bg-[#4a3718] text-[#f0d9a0] text-xs font-bold rounded-lg border border-[#a68253] transition flex items-center gap-1.5"
              >
                <DatabaseBackup className="w-3.5 h-3.5" />
                <span>استيراد من هذا المتصفح ({legacyCount})</span>
              </button>
            )}

            <button
              type="button"
              onClick={onLock}
              title="قفل الأرشيف فوراً"
              className="px-3 py-2 bg-[#19100a] hover:bg-[#261910] text-[#a89279] hover:text-[#e6d6c3] text-xs font-bold rounded-lg border border-[#4a3420] transition flex items-center gap-1.5"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>قفل</span>
            </button>

            <button
              type="button"
              onClick={() => setShowCodeModal(true)}
              title="تغيير رمز المرور"
              className="px-3 py-2 bg-[#19100a] hover:bg-[#261910] text-[#a89279] hover:text-[#e6d6c3] text-xs font-bold rounded-lg border border-[#4a3420] transition flex items-center gap-1.5"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">تغيير الرمز</span>
            </button>
          </div>
        </div>

        {/* Search Bar & Archive Counter */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3">
          <motion.div
            className="relative w-full sm:max-w-md"
            animate={
              isSearchFocused
                ? {
                    boxShadow: [
                      '0 0 0px 0px rgba(217,190,140,0)',
                      '0 0 12px 3px rgba(217,190,140,0.35)',
                      '0 0 0px 0px rgba(217,190,140,0)',
                    ],
                  }
                : { boxShadow: '0 0 0px 0px rgba(217,190,140,0)' }
            }
            transition={
              isSearchFocused
                ? { duration: 1.8, repeat: Infinity, ease: 'easeInOut' }
                : { duration: 0.3 }
            }
            style={{ borderRadius: '0.5rem' }}
          >
            <Search className="w-4 h-4 text-[#8c745c] absolute right-3 top-3 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setIsSearchFocused(false)}
              placeholder="ابحث عن اسم أو صلة قرابة أو مهنة..."
              className="w-full bg-[#18110b] border border-[#5c4028] text-xs text-[#f5ebd6] pr-9 pl-4 py-2 rounded-lg focus:outline-none focus:border-[#d9be8c]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute left-3 top-2.5 text-xs text-[#8c745c] hover:text-white"
              >
                ✕
              </button>
            )}
          </motion.div>

          <div className="flex items-center gap-3 text-xs text-[#a89279] font-typewriter">
            <span>
              إجمالي الملفات: <strong className="text-[#d9be8c]">{dossiers.length}</strong>
            </span>
            <span>•</span>
            <button
              type="button"
              onClick={onLoadSamples}
              className="underline hover:text-[#d9be8c] transition flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              <span>تحميل ملفات نموذجية</span>
            </button>
          </div>
        </div>
      </motion.header>

      <AnimatePresence>
        {showCodeModal && <ChangeCodeModal onClose={() => setShowCodeModal(false)} />}
      </AnimatePresence>

      {/* Desk Surface: Scattered Manila Folders */}
      <main className="relative z-10 max-w-7xl mx-auto pb-16">
        {!dossiers.some((d) => d.isSelf) && !searchQuery && (
          <button
            type="button"
            onClick={onCreateSelf}
            className="w-full mb-6 flex items-center gap-3 text-right bg-gradient-to-l from-[#3a2a12] to-[#2a1d14] hover:from-[#4a3517] border-2 border-dashed border-[#d9be8c]/70 hover:border-[#d9be8c] rounded-xl px-5 py-4 transition shadow-lg"
          >
            <UserRound className="w-8 h-8 text-[#d9be8c] shrink-0" />
            <span className="flex-1">
              <span className="block text-base font-bold text-[#f3e3c3]">ابدأ ملفك الشخصي</span>
              <span className="block text-xs text-[#cbb184]">ملف ليك إنت: بتحكي فيه باستمرار، وفيه يوميات وأهداف وصفحة بتوريك الناس بتشحنك ولا بتتعبك.</span>
            </span>
            <span className="text-[#d9be8c] text-sm font-bold">+ ابدأ</span>
          </button>
        )}
        {filteredDossiers.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="bg-[#1f1610]/80 border-2 border-dashed border-[#5c4028] rounded-xl p-12 text-center max-w-md mx-auto my-12"
          >
            {/* Empty state icon with gentle floating bounce */}
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            >
              <Folder className="w-12 h-12 text-[#8c6b45] mx-auto mb-3 opacity-60" />
            </motion.div>
            <h3 className="text-base font-bold text-[#e6d6c3] mb-1">
              {dossiers.length === 0 ? 'الأرشيف فارغ' : 'لا توجد ملفات مطابقة'}
            </h3>
            <p className="text-xs text-[#a89279] mb-4">
              {dossiers.length === 0
                ? 'ابدأ بفتح ملف جديد، أو استورد بياناتك القديمة، أو حمّل ملفات نموذجية للتجربة.'
                : `لم نعثر على أي ملف يطابق بحثك "${searchQuery}". يمكنك إضافة ملف جديد أو مسح البحث.`}
            </p>
            <button
              type="button"
              onClick={() => setShowNewModal(true)}
              className="px-4 py-2 bg-[#8c1d18] text-white text-xs font-bold rounded-lg shadow"
            >
              + إضافة ملف جديد الآن
            </button>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 sm:gap-10 pt-4">
            <AnimatePresence mode="popLayout">
              {filteredDossiers.map((dossier, idx) => {
                const rot = rotations[idx % rotations.length];
                const isOpening = openingFolderId === dossier.id;
                const isSelf = !!dossier.isSelf;

                return (
                  <motion.div
                    key={dossier.id}
                    layout
                    onClick={() => handleFolderClick(dossier)}
                    initial={{ opacity: 0, y: 40, rotate: 0 }}
                    animate={
                      isOpening
                        ? { opacity: 0, scale: 1.12, y: -10, rotate: 0 }
                        : { opacity: 1, y: 0, rotate: rot }
                    }
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    transition={
                      isOpening
                        ? { duration: 0.35, ease: 'easeIn' }
                        : { delay: idx * 0.08, duration: 0.45, ease: 'easeOut' }
                    }
                    whileHover={{ rotate: 0, y: -12, scale: 1.03 }}
                    className="group relative select-none cursor-pointer"
                  >
                    {/* Manila Folder Tab sticking out on top right */}
                    <div className="flex justify-between items-end mr-6 -mb-0.5 relative z-0">
                      <div className={`${isSelf ? 'bg-[#e0b34a] group-hover:bg-[#ecc261] border-[#8a5f12]' : 'bg-[#c5a76e] group-hover:bg-[#d6ba82] border-[#8c6b45]'} border-t-2 border-r-2 border-l-2 px-4 py-1.5 rounded-t-lg shadow-sm transition flex items-center gap-1.5`}>
                        {isSelf && <Star className="w-3 h-3 text-[#6b4708] fill-[#6b4708]" />}
                        <span className="font-typewriter text-xs font-bold text-[#1a120a] uppercase tracking-wide">
                          {dossier.name}
                        </span>
                      </div>

                      <div className="text-[10px] font-typewriter text-[#cbb184]/70 hidden sm:block">
                        REF: #{dossier.id.slice(-4).toUpperCase()}
                      </div>
                    </div>

                    {/* Manila Folder Closed Cover Card */}
                    <div className={`${isSelf ? 'bg-[#ead9a8] group-hover:bg-[#efe0b4] border-[#b8860b] ring-2 ring-[#e0b34a]/60' : 'bg-[#dfc89d] group-hover:bg-[#e4ceaa] border-[#8c6b45]'} border-4 rounded-xl p-5 shadow-2xl relative folder-shadow folder-shadow-hover transition min-h-[300px] flex flex-col justify-between overflow-hidden`}>
                      {/* Folder spine crease line */}
                      <div className="absolute right-0 top-0 bottom-0 w-3 bg-gradient-to-l from-[#a88a5b]/40 to-transparent pointer-events-none" />

                      {/* Rubber Stamp mark on folder cover (top left in RTL) */}
                      <div className="absolute top-3 left-4 pointer-events-none opacity-85 group-hover:opacity-100 transition z-10">
                        <span className="stamp-red text-[10px] transform -rotate-6">
                          {dossier.codeName || 'ملف سري'}
                        </span>
                      </div>

                      {/* Folder Cover Header: Name & Relationship */}
                      <div>
                        <div className="flex justify-between items-start mb-4">
                          <div className="pt-1">
                            <span className="stamp-black text-[10px] mb-1.5 block w-fit">
                              CONFIDENTIAL
                            </span>
                            <h2 className="text-xl font-bold font-arabic-hand text-[#24170e] tracking-wide">
                              {dossier.name}
                            </h2>
                            <p className="text-xs text-[#5c4028] font-bold font-arabic-body">
                              {dossier.relationship}
                            </p>
                            <p className="text-[11px] text-[#735436] font-typewriter">
                              {dossier.occupation}
                            </p>
                          </div>

                          {/* Small Polaroid Photo Clipped on the front cover */}
                          <div className="relative transform rotate-3 group-hover:rotate-0 transition-transform duration-300">
                            {/* Paper Clip Visual */}
                            <div className="paperclip-clip -top-3 right-3" />

                            {/* Polaroid thumbnail */}
                            <div className="polaroid-frame w-24 p-1.5 pb-4 border border-[#cfc0a3]">
                              <div className="w-full h-20 bg-stone-900 overflow-hidden rounded-xs">
                                <DossierPhoto dossier={dossier} className="w-full h-full object-cover grayscale contrast-110 sepia-[0.3]" />
                              </div>
                              <p className="text-[9px] font-arabic-hand text-center text-[#3d2716] font-bold mt-1 truncate">
                                {dossier.name.split(' ')[0]}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Brief latest observation snippet */}
                        <div className="bg-[#f2e5cb] border border-[#bfa478] p-2.5 rounded-md mb-3 text-xs text-[#2c1d11] font-arabic-body leading-relaxed line-clamp-2">
                          {dossier.latestObservationQuote ||
                            dossier.personalitySummary ||
                            'انقر لفتح الملف والاطلاع على سجل الملاحظات والتحليل.'}
                        </div>
                      </div>

                      {/* Folder Footer: Metadata Badges */}
                      <div className="pt-3 border-t border-[#c2a77a] flex items-center justify-between text-[11px] font-typewriter text-[#5c4028]">
                        <div className="flex items-center gap-2">
                          <span className="flex items-center gap-1 font-bold">
                            <FileText className="w-3.5 h-3.5 text-[#8c1d18]" />
                            <span>{dossier.timeline?.length || 0} ملاحظة</span>
                          </span>
                          <span>•</span>
                          <span>{dossier.predictions?.length || 0} توقع</span>
                        </div>

                        <div className="flex items-center gap-1 text-[#8c1d18] font-bold group-hover:underline">
                          <span>فتح الملف ➔</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </main>

      {/* New File Modal */}
      <NewFileModal
        isOpen={showNewModal}
        onClose={() => setShowNewModal(false)}
        onAddDossier={onAddDossier}
      />
    </div>
  );
};
