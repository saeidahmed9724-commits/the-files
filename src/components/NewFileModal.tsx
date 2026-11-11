import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, UserPlus, Image, Sparkles, Loader2 } from 'lucide-react';
import { uploadDossierPhoto } from '../lib/photos';
import { PersonDossier } from '../types/dossier';

interface NewFileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddDossier: (dossier: PersonDossier) => void;
}

const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&auto=format&fit=crop&q=80',
];

export const NewFileModal: React.FC<NewFileModalProps> = ({ isOpen, onClose, onAddDossier }) => {
  const [name, setName] = useState('');
  const [relationship, setRelationship] = useState('');
  const [occupation, setOccupation] = useState('');
  const [age, setAge] = useState('');
  const [knownSince, setKnownSince] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [initialNote, setInitialNote] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!photoFile) {
      setPhotoPreview('');
      return;
    }
    const url = URL.createObjectURL(photoFile);
    setPhotoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photoFile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || isSaving) return;

    const id = `dos-${Date.now()}`;
    let photoPath: string | undefined;
    if (photoFile) {
      setIsSaving(true);
      setError('');
      try {
        photoPath = await uploadDossierPhoto(id, photoFile);
      } catch (err: any) {
        setError(err?.message || 'فشل رفع الصورة');
        setIsSaving(false);
        return;
      }
    }
    const codeNum = Math.floor(10 + Math.random() * 89);
    const newDossier: PersonDossier = {
      id,
      name: name.trim(),
      codeName: `ملف: ${name.trim().charAt(0)}-${codeNum}`,
      photoPath,
      photoRev: photoPath ? Date.now() : undefined,
      photoUrl: photoUrl.trim() || PRESET_AVATARS[Math.floor(Math.random() * PRESET_AVATARS.length)],
      relationship: relationship.trim() || 'معرفة عامة',
      occupation: occupation.trim() || 'غير محدد',
      age: age.trim() || 'غير محدد',
      knownSince: knownSince.trim() || 'حديثاً',
      emotionalStability: 3,
      personalitySummary: '',
      latestObservationQuote: initialNote.trim() || undefined,
      createdAt: new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString().split('T')[0],
      mind: {
        howTheyThink: '',
        howTheyThinkConfidence: 'medium',
        decisionMaking: '',
        decisionMakingConfidence: 'medium',
        handlingPressure: '',
        handlingPressureConfidence: 'medium',
        emotionalStabilityDesc: '',
        emotionalStabilityConfidence: 'medium',
        coreValues: '',
        coreValuesConfidence: 'medium',
        communicationStyle: '',
        communicationStyleConfidence: 'medium',
      },
      triggers: [],
      comforts: [],
      timeline: initialNote.trim()
        ? [
            {
              id: `note-${Date.now()}`,
              date: new Date().toISOString().split('T')[0],
              type: 'impression',
              source: 'seen',
              text: initialNote.trim(),
              tags: ['انطباع تأسيسي'],
            },
          ]
        : [],
      changesOverTime: { analysisText: '' },
      predictions: [],
    };

    onAddDossier(newDossier);
    setIsSaving(false);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="bg-[#fcf8f0] border-4 border-[#8c6b45] max-w-lg w-full rounded-lg shadow-2xl relative p-6 my-8 text-right font-arabic-body"
            initial={{ opacity: 0, scale: 0.85, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 30 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          >
        {/* Brass Header Badge */}
        <div className="flex justify-between items-center pb-4 mb-4 border-b-2 border-[#b5956f]">
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded hover:bg-[#ebd9bd] text-[#5c4028] transition"
            aria-label="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <span className="stamp-red text-xs">سجل قيد جديد</span>
            <h2 className="text-xl font-bold text-[#3d2716] font-typewriter">
              فتح ملف شخصية جديد
            </h2>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="text-xs text-rose-800 bg-rose-100 border border-rose-300 rounded px-3 py-2">
              ⚠ {error}
            </div>
          )}
          <div>
            <label className="block text-xs font-bold text-[#5c4028] mb-1 font-typewriter uppercase">
              الاسم الكامل *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="مثال: عبد الرحمن السعيد"
              className="w-full bg-[#f4ecd8] border-b-2 border-[#8c6b45] p-2 text-[#2a1a0e] font-arabic-body focus:outline-none focus:bg-[#fff9ec] rounded"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#5c4028] mb-1 font-typewriter">
                صلة القرابة / العلاقة
              </label>
              <input
                type="text"
                value={relationship}
                onChange={(e) => setRelationship(e.target.value)}
                placeholder="صديق مقرب، شريك، زميل..."
                className="w-full bg-[#f4ecd8] border-b-2 border-[#8c6b45] p-2 text-[#2a1a0e] text-sm focus:outline-none rounded"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#5c4028] mb-1 font-typewriter">
                المهنة / النشاط
              </label>
              <input
                type="text"
                value={occupation}
                onChange={(e) => setOccupation(e.target.value)}
                placeholder="مهندس، طبيب، تاجر..."
                className="w-full bg-[#f4ecd8] border-b-2 border-[#8c6b45] p-2 text-[#2a1a0e] text-sm focus:outline-none rounded"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#5c4028] mb-1 font-typewriter">
                العمر التقريبي
              </label>
              <input
                type="text"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="مثال: ٣٢ سنة"
                className="w-full bg-[#f4ecd8] border-b-2 border-[#8c6b45] p-2 text-[#2a1a0e] text-sm focus:outline-none rounded"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#5c4028] mb-1 font-typewriter">
                أعرفه منذ
              </label>
              <input
                type="text"
                value={knownSince}
                onChange={(e) => setKnownSince(e.target.value)}
                placeholder="مثال: صيف ٢٠٢١"
                className="w-full bg-[#f4ecd8] border-b-2 border-[#8c6b45] p-2 text-[#2a1a0e] text-sm focus:outline-none rounded"
              />
            </div>
          </div>

          {/* Photo URL & presets */}
          <div>
            <label className="block text-xs font-bold text-[#5c4028] mb-1 font-typewriter flex justify-between items-center">
              <span>رابط الصورة الشخصية (اختياري)</span>
              <span className="text-[10px] text-[#8a6843]">صورة بولارويد للأرشيف</span>
            </label>
            <div className="flex items-center gap-3 mb-2">
              <label className="px-3 py-1.5 bg-[#ecdcc4] hover:bg-[#dfcbb0] text-[#4a3422] text-xs font-bold rounded border border-[#a68660] cursor-pointer">
                {photoFile ? 'تغيير الصورة' : 'اختيار صورة من الجهاز'}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
                />
              </label>
              {photoPreview && (
                <img
                  src={photoPreview}
                  alt="معاينة"
                  className="w-10 h-10 rounded object-cover grayscale border border-[#a68660]"
                />
              )}
              {photoFile && (
                <button
                  type="button"
                  onClick={() => setPhotoFile(null)}
                  className="text-[11px] text-[#8c1d18] underline"
                >
                  إزالة
                </button>
              )}
            </div>
            <input
              type="url"
              value={photoUrl}
              onChange={(e) => setPhotoUrl(e.target.value)}
              placeholder="أو الصق رابط صورة: https://example.com/photo.jpg"
              className="w-full bg-[#f4ecd8] border-b-2 border-[#8c6b45] p-2 text-xs text-[#2a1a0e] focus:outline-none rounded mb-2"
            />
            {/* Quick avatar selection */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-[#735436]">أو اختر نموذجاً:</span>
              <div className="flex gap-2">
                {PRESET_AVATARS.map((url, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setPhotoUrl(url)}
                    className={`w-7 h-7 rounded-full overflow-hidden border-2 transition ${
                      photoUrl === url ? 'border-[#8c1d18] scale-110' : 'border-stone-400 opacity-70'
                    }`}
                  >
                    <img src={url} alt="preset" className="w-full h-full object-cover grayscale" />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Initial note */}
          <div>
            <label className="block text-xs font-bold text-[#5c4028] mb-1 font-typewriter">
              أول ملاحظة أو انطباع مسجل (اختياري)
            </label>
            <textarea
              rows={2}
              value={initialNote}
              onChange={(e) => setInitialNote(e.target.value)}
              placeholder="اكتب موقفاً أو انطباعاً مبدئياً عن تصرفاته أو طريقته..."
              className="w-full bg-[#f4ecd8] border-2 border-[#b5956f] p-2 text-sm text-[#2a1a0e] rounded focus:outline-none focus:bg-white"
            />
          </div>

          <div className="pt-3 border-t border-[#b5956f] flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-[#8c6b45] text-[#5c4028] hover:bg-[#ebd9bd] rounded transition text-sm"
            >
              إلغاء
            </button>
            <motion.button
              type="submit"
              disabled={isSaving}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="px-5 py-2 bg-[#8c1d18] hover:bg-[#731713] disabled:opacity-60 text-[#fbf7ee] font-bold rounded shadow transition text-sm flex items-center gap-2"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
              <span>{isSaving ? 'جاري رفع الصورة...' : 'إيداع في الأرشيف'}</span>
            </motion.button>
          </div>
        </form>
      </motion.div>
    </motion.div>
      )}
    </AnimatePresence>
  );
};
