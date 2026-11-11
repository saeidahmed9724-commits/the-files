import React, { useState } from 'react';
import { motion } from 'motion/react';
import { callAI } from '../../lib/ai';
import { uploadDossierPhoto } from '../../lib/photos';
import { DossierPhoto } from '../DossierPhoto';
import { Star, Sparkles, Quote, Calendar, User, Briefcase, Heart, Clock, Loader2, Edit3, Check } from 'lucide-react';
import { PersonDossier } from '../../types/dossier';
import { getLatestObservation } from '../../utils/dossierLogic';
import { SocialBatteryMeter } from '../SocialBatteryMeter';

interface Page1CharacterProps {
  dossier: PersonDossier;
  onUpdateDossier: (updated: Partial<PersonDossier>) => void;
  onGoToPage?: (page: number) => void;
}

export const Page1Character: React.FC<Page1CharacterProps> = ({ dossier, onUpdateDossier, onGoToPage }) => {
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [aiError, setAiError] = useState('');
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState('');
  const [isEditingFields, setIsEditingFields] = useState(false);
  const [name, setName] = useState(dossier.name);
  const [age, setAge] = useState(dossier.age.toString());
  const [relationship, setRelationship] = useState(dossier.relationship);
  const [occupation, setOccupation] = useState(dossier.occupation);
  const [knownSince, setKnownSince] = useState(dossier.knownSince);
  const [photoUrl, setPhotoUrl] = useState(dossier.photoUrl);
  const [summaryText, setSummaryText] = useState(dossier.personalitySummary);
  const [latestQuote, setLatestQuote] = useState(dossier.latestObservationQuote || '');

  const latestObservation = getLatestObservation(dossier);

  const handleStarClick = (stars: number) => {
    onUpdateDossier({ emotionalStability: stars });
  };

  const handleSaveFields = () => {
    onUpdateDossier({
      name,
      age,
      relationship,
      occupation,
      knownSince,
      photoUrl,
      personalitySummary: summaryText,
      latestObservationQuote: latestQuote,
    });
    setIsEditingFields(false);
  };

  const handleGenerateSummary = async () => {
    setIsGeneratingSummary(true);
    setAiError('');
    try {
      const result = await callAI('summary', { dossier });
      setSummaryText(result);
      onUpdateDossier({ personalitySummary: result });
    } catch (err: any) {
      console.error('Error generating summary:', err);
      setAiError(err?.message || 'حدث خطأ غير متوقع');
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  const handlePhotoPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setIsUploadingPhoto(true);
    setPhotoError('');
    try {
      const path = await uploadDossierPhoto(dossier.id, file);
      onUpdateDossier({ photoPath: path, photoRev: Date.now() });
    } catch (err: any) {
      setPhotoError(err?.message || 'فشل رفع الصورة');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  return (
    <div className="bg-vintage-paper border-2 border-[#bfa57d] rounded-lg p-6 sm:p-8 min-h-[600px] shadow-sm relative overflow-hidden font-arabic-body text-[#2c1d11]">
      {/* Decorative Stamp & Archival Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-4 mb-6 border-b-2 border-[#8c6b45]">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-black font-typewriter tracking-wide text-[#2b1b10]">
              CHARACTER FILE
            </h1>
            <span className="text-xl sm:text-2xl font-bold font-arabic-hand text-[#8c1d18]">
              • ملف الشخصية
            </span>
          </div>
          <div className="w-48 h-1 bg-[#8c1d18] mt-1" />
          <div className="w-32 h-0.5 bg-[#8c6b45] mt-0.5" />
        </div>

        <div className="flex items-center gap-2 mt-3 sm:mt-0">
          <span className="stamp-red stamp-animate text-xs">سري للغاية • TOP SECRET</span>
          <button
            type="button"
            onClick={() => (isEditingFields ? handleSaveFields() : setIsEditingFields(true))}
            className="px-3 py-1 bg-[#ecdcc4] hover:bg-[#dfcbb0] text-[#4a3422] text-xs font-bold rounded border border-[#a68660] transition flex items-center gap-1.5 shadow-sm"
          >
            {isEditingFields ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-700" />
                <span>حفظ التعديلات</span>
              </>
            ) : (
              <>
                <Edit3 className="w-3.5 h-3.5" />
                <span>تعديل البيانات</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Grid: Form Left, Polaroid Right */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mb-6">
        {/* Lined Printed Form Fields */}
        <div className="md:col-span-8 space-y-4">
          {/* Name Field */}
          <div className="flex flex-col sm:flex-row sm:items-baseline gap-2 form-line pb-1.5">
            <span className="font-typewriter font-bold text-xs text-[#523924] uppercase min-w-[120px]">
              الاسم الكامل / NAME:
            </span>
            {isEditingFields ? (
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="flex-1 bg-[#f0e4cd] px-2 py-0.5 rounded text-sm font-arabic-hand text-lg text-[#1a110a] focus:outline-none"
              />
            ) : (
              <span className="text-xl font-bold font-arabic-hand text-[#1c120a] tracking-wide">
                {dossier.name}
              </span>
            )}
          </div>

          {/* Age & Relationship */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-baseline gap-2 form-line pb-1.5">
              <span className="font-typewriter font-bold text-xs text-[#523924] uppercase min-w-[90px]">
                العمر / AGE:
              </span>
              {isEditingFields ? (
                <input
                  type="text"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  className="flex-1 bg-[#f0e4cd] px-2 py-0.5 rounded text-sm font-arabic-hand text-[#1a110a]"
                />
              ) : (
                <span className="text-base font-bold font-arabic-hand text-[#2c1d11]">
                  {dossier.age}
                </span>
              )}
            </div>

            <div className="flex items-baseline gap-2 form-line pb-1.5">
              <span className="font-typewriter font-bold text-xs text-[#523924] uppercase min-w-[100px]">
                الصلة / RELATION:
              </span>
              {isEditingFields ? (
                <input
                  type="text"
                  value={relationship}
                  onChange={(e) => setRelationship(e.target.value)}
                  className="flex-1 bg-[#f0e4cd] px-2 py-0.5 rounded text-sm font-arabic-hand text-[#1a110a]"
                />
              ) : (
                <span className="text-base font-bold font-arabic-hand text-[#2c1d11]">
                  {dossier.relationship}
                </span>
              )}
            </div>
          </div>

          {/* Occupation & Known Since */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-baseline gap-2 form-line pb-1.5">
              <span className="font-typewriter font-bold text-xs text-[#523924] uppercase min-w-[100px]">
                المهنة / OCCUP.:
              </span>
              {isEditingFields ? (
                <input
                  type="text"
                  value={occupation}
                  onChange={(e) => setOccupation(e.target.value)}
                  className="flex-1 bg-[#f0e4cd] px-2 py-0.5 rounded text-sm font-arabic-hand text-[#1a110a]"
                />
              ) : (
                <span className="text-base font-bold font-arabic-hand text-[#2c1d11]">
                  {dossier.occupation}
                </span>
              )}
            </div>

            <div className="flex items-baseline gap-2 form-line pb-1.5">
              <span className="font-typewriter font-bold text-xs text-[#523924] uppercase min-w-[110px]">
                معرفة منذ / SINCE:
              </span>
              {isEditingFields ? (
                <input
                  type="text"
                  value={knownSince}
                  onChange={(e) => setKnownSince(e.target.value)}
                  className="flex-1 bg-[#f0e4cd] px-2 py-0.5 rounded text-sm font-arabic-hand text-[#1a110a]"
                />
              ) : (
                <span className="text-base font-bold font-arabic-hand text-[#2c1d11]">
                  {dossier.knownSince}
                </span>
              )}
            </div>
          </div>

          {isEditingFields && (
            <div className="flex items-baseline gap-2 form-line pb-1.5">
              <span className="font-typewriter font-bold text-xs text-[#523924] uppercase min-w-[110px]">
                رابط الصورة:
              </span>
              <input
                type="url"
                value={photoUrl}
                onChange={(e) => setPhotoUrl(e.target.value)}
                placeholder="https://..."
                className="flex-1 bg-[#f0e4cd] px-2 py-0.5 rounded text-xs text-[#1a110a]"
              />
            </div>
          )}

          {isEditingFields && (
            <div className="flex flex-wrap items-center gap-2 form-line pb-1.5">
              <span className="font-typewriter font-bold text-xs text-[#523924] uppercase min-w-[110px]">
                رفع صورة:
              </span>
              <label className="px-2.5 py-1 bg-[#ecdcc4] hover:bg-[#dfcbb0] text-[#4a3422] text-xs font-bold rounded border border-[#a68660] cursor-pointer inline-flex items-center gap-1.5">
                {isUploadingPhoto ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                <span>{isUploadingPhoto ? 'جاري الرفع...' : 'اختيار صورة من الجهاز'}</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoPick}
                  disabled={isUploadingPhoto}
                  className="hidden"
                />
              </label>
              {photoError && <span className="text-[11px] text-rose-800">⚠ {photoError}</span>}
            </div>
          )}

          {/* Code Name & Archive Reference */}
          <div className="flex items-center gap-4 pt-2 text-xs text-[#73583e] font-typewriter">
            <span>FILE REF: {dossier.codeName || 'CLASS-09'}</span>
            <span>•</span>
            <span>STATUS: ACTIVE OBSERVATION</span>
          </div>
        </div>

        {/* Polaroid Photo with Metallic Paper Clip */}
        <div className="md:col-span-4 flex flex-col items-center justify-center relative">
          <motion.div
            initial={{ opacity: 0, rotate: 6, scale: 0.92 }}
            animate={{ opacity: 1, rotate: 2, scale: 1 }}
            whileHover={{ rotate: 0, scale: 1.04, y: -4 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
            className="relative"
          >
            {/* Paper Clip Visual */}
            <div className="paperclip-clip -top-4 right-4" />

            {/* Polaroid Body */}
            <div className="polaroid-frame w-48 border border-[#ded5c3]">
              <div className="w-full h-44 bg-stone-800 overflow-hidden rounded-sm relative">
                <DossierPhoto dossier={dossier} className="w-full h-full object-cover grayscale contrast-115 sepia-[0.35]" />
                <div className="absolute inset-0 bg-amber-950/15 pointer-events-none" />
              </div>
              <div className="pt-2 text-center">
                <p className="font-arabic-hand text-base font-bold text-[#3d2716] truncate">
                  {dossier.name}
                </p>
                <p className="font-typewriter text-[10px] text-[#8c745c]">
                  PHOTO ID: #{dossier.id.slice(-4).toUpperCase()}
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Latest Observation Box (QUOTE BOX from reference image) */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.4 }}
        className="mb-6 bg-[#f2e7d0] border-2 border-[#ab8e67] p-4 rounded-md shadow-inner relative"
      >
        <div className="flex justify-between items-center mb-2 pb-1.5 border-b border-[#cca779]">
          <div className="flex items-center gap-2">
            <Quote className="w-4 h-4 text-[#8c1d18]" />
            <span className="font-typewriter font-bold text-xs text-[#3a2617] uppercase tracking-wider">
              LATEST OBSERVATION / أحدث ملاحظة مسجلة
            </span>
          </div>
          {latestObservation && (
            <span className="text-[11px] font-typewriter text-[#7a5f45]">
              [ {latestObservation.date} ]
            </span>
          )}
        </div>

        {isEditingFields ? (
          <textarea
            rows={2}
            value={latestQuote}
            onChange={(e) => setLatestQuote(e.target.value)}
            placeholder="اقتباس أو ملخص أحدث ملاحظة..."
            className="w-full bg-[#faf5eb] p-2 text-sm font-arabic-hand rounded border border-[#bfa57d]"
          />
        ) : (
          <p className="font-arabic-hand text-lg text-[#24170e] leading-relaxed italic pr-2">
            "{dossier.latestObservationQuote || latestObservation?.text || 'لا توجد ملاحظات مسجلة بعد. استخدم صفحة السجل الزمني لإضافة أول ملاحظة.'}"
          </p>
        )}

        {latestObservation && !isEditingFields && (
          <div className="flex justify-end gap-2 mt-2 text-[10px] text-[#7a5f45] font-typewriter">
            <span>نوع الرصد: {latestObservation.type}</span>
            <span>•</span>
            <span>المصدر: {latestObservation.source === 'seen' ? 'معاينة شخصية' : 'استنتاج'}</span>
          </div>
        )}
      </motion.div>

      <SocialBatteryMeter dossier={dossier} onGoToTimeline={onGoToPage ? () => onGoToPage(4) : undefined} />

      {/* Bottom Row: 2 Boxes (Emotional Stability & Summary) */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Bottom Left: Emotional Stability Box */}
        <div className="md:col-span-5 bg-[#f5ebd6] border-2 border-[#b5956f] p-4 rounded-md flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-2 pb-1 border-b border-[#cbb184]">
              <span className="font-typewriter font-bold text-xs text-[#4a3422] uppercase tracking-wide">
                EMOTIONAL STABILITY
              </span>
              <span className="text-xs font-bold text-[#8c1d18] font-arabic-body">
                الاستقرار الانفعالي
              </span>
            </div>
            <p className="text-xs text-[#6e5033] mb-3">
              تقدير ذاتي لمدى هدوء الشخص وتماسكه في مواقف الأزمات والتوتر:
            </p>
          </div>

          {/* 5-Star Interactive Rating */}
          <div className="flex items-center justify-center gap-2 py-2 bg-[#eae0c8] rounded border border-[#cca779]">
            {[1, 2, 3, 4, 5].map((star) => (
              <motion.button
                key={star}
                type="button"
                onClick={() => handleStarClick(star)}
                whileHover={{ scale: 1.25 }}
                whileTap={{ scale: 0.85 }}
                className="p-1"
                title={`${star} من 5 نجوم`}
                aria-label={`تقييم ${star} نجوم`}
              >
                <Star
                  className={`w-6 h-6 transition-colors ${
                    star <= (dossier.emotionalStability || 3)
                      ? 'fill-[#8c1d18] text-[#8c1d18]'
                      : 'text-[#ab8e67] hover:text-[#8c1d18]/50'
                  }`}
                />
              </motion.button>
            ))}
            <span className="text-xs font-bold font-typewriter text-[#4a3422] mr-2">
              ({dossier.emotionalStability || 3} / 5)
            </span>
          </div>
        </div>

        {/* Bottom Right: Personality Summary Box with AI Generation */}
        <div className="md:col-span-7 bg-[#f5ebd6] border-2 border-[#b5956f] p-4 rounded-md flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-2 pb-1 border-b border-[#cbb184]">
              <span className="font-typewriter font-bold text-xs text-[#4a3422] uppercase tracking-wide">
                SUMMARY / خلاصة الشخصية
              </span>
              <button
                type="button"
                onClick={handleGenerateSummary}
                disabled={isGeneratingSummary}
                className="px-2.5 py-0.5 bg-[#8c1d18] hover:bg-[#731713] text-[#fcf8f0] text-xs font-bold rounded flex items-center gap-1 shadow-sm transition disabled:opacity-50"
              >
                {isGeneratingSummary ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>جاري التوليد...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3 h-3" />
                    <span>توليد بالذكاء الاصطناعي</span>
                  </>
                )}
              </button>
            </div>
            {aiError && (
        <div className="mt-2 text-[11px] text-rose-800 bg-rose-100 border border-rose-300 rounded px-2 py-1.5 mb-2">
          ⚠ {aiError}
        </div>
      )}

            {isEditingFields ? (
              <textarea
                rows={3}
                value={summaryText}
                onChange={(e) => setSummaryText(e.target.value)}
                placeholder="اكتب خلاصة شخصيته أو ولدها بواسطة الذكاء الاصطناعي..."
                className="w-full bg-[#faf5eb] p-2 text-xs font-arabic-body rounded border border-[#bfa57d]"
              />
            ) : (
              <p className="text-xs font-arabic-body text-[#2c1d11] leading-relaxed">
                {dossier.personalitySummary ||
                  'لم يتم تدوين خلاصة شخصية بعد. يمكنك كتابتها يدوياً بالنقر على "تعديل البيانات" أو النقر على "توليد بالذكاء الاصطناعي" لتحليل ملفه بالكامل.'}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
