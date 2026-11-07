import React, { useState } from 'react';
import {
  Search,
  Plus,
  Download,
  Upload,
  Lock,
  Folder,
  FolderOpen,
  Calendar,
  Eye,
  FileText,
  RotateCcw,
  Sparkles,
  Shield,
  Clock,
} from 'lucide-react';
import { PersonDossier } from '../types/dossier';
import { searchDossiers } from '../utils/dossierLogic';
import { NewFileModal } from './NewFileModal';

interface DeskViewProps {
  dossiers: PersonDossier[];
  onOpenDossier: (dossier: PersonDossier) => void;
  onAddDossier: (dossier: PersonDossier) => void;
  onExportData: () => void;
  onImportData: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onLock: () => void;
  onResetData: () => void;
}

export const DeskView: React.FC<DeskViewProps> = ({
  dossiers,
  onOpenDossier,
  onAddDossier,
  onExportData,
  onImportData,
  onLock,
  onResetData,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewModal, setShowNewModal] = useState(false);
  const [openingFolderId, setOpeningFolderId] = useState<string | null>(null);

  const filteredDossiers = searchDossiers(dossiers, searchQuery);

  // Predefined rotation angles for realistic scattered folders on desk
  const rotations = [-2.5, 1.8, -1.2, 2.8, -3.2, 1.5, -2, 2.2];

  const handleFolderClick = (dossier: PersonDossier) => {
    setOpeningFolderId(dossier.id);
    setTimeout(() => {
      onOpenDossier(dossier);
      setOpeningFolderId(null);
    }, 250);
  };

  return (
    <div className="min-h-screen bg-desk-wood py-6 px-4 sm:px-8 relative overflow-x-hidden font-arabic-body text-[#e6d6c3]">
      {/* Background vignette & vintage leather mat atmosphere */}
      <div className="absolute inset-0 bg-radial-gradient pointer-events-none opacity-85" />

      {/* Top Desk Header & Toolbar */}
      <header className="relative z-20 max-w-7xl mx-auto mb-8 bg-[#1f1610]/90 border border-[#8a6843]/60 rounded-2xl p-4 sm:p-5 shadow-2xl backdrop-blur-md">
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
            <button
              type="button"
              onClick={() => setShowNewModal(true)}
              className="px-4 py-2 bg-[#8c1d18] hover:bg-[#a3221c] active:scale-95 text-[#fbf7ee] font-bold text-xs sm:text-sm rounded-lg shadow-lg border border-[#c43d36] transition flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>+ ملف جديد</span>
            </button>

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

            <button
              type="button"
              onClick={onLock}
              title="قفل الأرشيف فوراً"
              className="px-3 py-2 bg-[#19100a] hover:bg-[#261910] text-[#a89279] hover:text-[#e6d6c3] text-xs font-bold rounded-lg border border-[#4a3420] transition flex items-center gap-1.5"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>قفل</span>
            </button>
          </div>
        </div>

        {/* Search Bar & Archive Counter */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3">
          <div className="relative w-full sm:max-w-md">
            <Search className="w-4 h-4 text-[#8c745c] absolute right-3 top-3 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
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
          </div>

          <div className="flex items-center gap-3 text-xs text-[#a89279] font-typewriter">
            <span>
              إجمالي الملفات: <strong className="text-[#d9be8c]">{dossiers.length}</strong>
            </span>
            <span>•</span>
            <button
              type="button"
              onClick={onResetData}
              className="underline hover:text-[#d9be8c] transition flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              <span>إعادة النماذج الأصلية</span>
            </button>
          </div>
        </div>
      </header>

      {/* Desk Surface: Scattered Manila Folders */}
      <main className="relative z-10 max-w-7xl mx-auto pb-16">
        {filteredDossiers.length === 0 ? (
          <div className="bg-[#1f1610]/80 border-2 border-dashed border-[#5c4028] rounded-xl p-12 text-center max-w-md mx-auto my-12">
            <Folder className="w-12 h-12 text-[#8c6b45] mx-auto mb-3 opacity-60" />
            <h3 className="text-base font-bold text-[#e6d6c3] mb-1">
              لا توجد ملفات مطابقة
            </h3>
            <p className="text-xs text-[#a89279] mb-4">
              لم نعثر على أي ملف يطابق بحثك "{searchQuery}". يمكنك إضافة ملف جديد أو مسح البحث.
            </p>
            <button
              type="button"
              onClick={() => setShowNewModal(true)}
              className="px-4 py-2 bg-[#8c1d18] text-white text-xs font-bold rounded-lg shadow"
            >
              + إضافة ملف جديد الآن
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 sm:gap-10 pt-4">
            {filteredDossiers.map((dossier, idx) => {
              const rot = rotations[idx % rotations.length];
              const isOpening = openingFolderId === dossier.id;

              return (
                <div
                  key={dossier.id}
                  onClick={() => handleFolderClick(dossier)}
                  style={{
                    transform: `rotate(${rot}deg)`,
                  }}
                  className={`group relative transition-all duration-300 select-none cursor-pointer hover:rotate-0 hover:-translate-y-3 hover:scale-[1.02] ${
                    isOpening ? 'scale-105 opacity-80' : ''
                  }`}
                >
                  {/* Manila Folder Tab sticking out on top right */}
                  <div className="flex justify-between items-end mr-6 -mb-0.5 relative z-0">
                    <div className="bg-[#c5a76e] group-hover:bg-[#d6ba82] border-t-2 border-r-2 border-l-2 border-[#8c6b45] px-4 py-1.5 rounded-t-lg shadow-sm transition">
                      <span className="font-typewriter text-xs font-bold text-[#1a120a] uppercase tracking-wide">
                        {dossier.name}
                      </span>
                    </div>

                    <div className="text-[10px] font-typewriter text-[#cbb184]/70 hidden sm:block">
                      REF: #{dossier.id.slice(-4).toUpperCase()}
                    </div>
                  </div>

                  {/* Manila Folder Closed Cover Card */}
                  <div className="bg-[#dfc89d] group-hover:bg-[#e4ceaa] border-4 border-[#8c6b45] rounded-xl p-5 shadow-2xl relative folder-shadow transition min-h-[300px] flex flex-col justify-between overflow-hidden">
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
                              <img
                                src={dossier.photoUrl}
                                alt={dossier.name}
                                className="w-full h-full object-cover grayscale contrast-110 sepia-[0.3]"
                              />
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
                </div>
              );
            })}
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
