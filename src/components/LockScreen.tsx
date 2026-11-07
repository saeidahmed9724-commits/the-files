import React, { useState } from 'react';
import { Lock, KeyRound, ShieldAlert, FolderLock, Sparkles } from 'lucide-react';

interface LockScreenProps {
  onUnlock: () => void;
  correctPasscode: string;
  onUpdatePasscode?: (newCode: string) => void;
}

export const LockScreen: React.FC<LockScreenProps> = ({ onUnlock, correctPasscode, onUpdatePasscode }) => {
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState(false);
  const [showChangeModal, setShowChangeModal] = useState(false);
  const [newCodeInput, setNewCodeInput] = useState('');

  const handleKeyPress = (num: string) => {
    if (passcode.length < 6) {
      const next = passcode + num;
      setPasscode(next);
      setError(false);
      if (next === correctPasscode) {
        setTimeout(() => {
          onUnlock();
        }, 150);
      }
    }
  };

  const handleDelete = () => {
    setPasscode((prev) => prev.slice(0, -1));
    setError(false);
  };

  const handleClear = () => {
    setPasscode('');
    setError(false);
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (passcode === correctPasscode) {
      onUnlock();
    } else {
      setError(true);
      setPasscode('');
    }
  };

  return (
    <div className="min-h-screen bg-desk-wood flex items-center justify-center p-4 relative overflow-hidden font-arabic-body">
      {/* Background Vignette and archive atmosphere */}
      <div className="absolute inset-0 bg-radial-gradient pointer-events-none opacity-80" />
      <div className="absolute top-6 left-6 flex items-center gap-2 text-[#cbb184]/50 text-xs font-typewriter">
        <span>SECURITY LEVEL: CLASSIFIED</span>
        <span>•</span>
        <span>ARCHIVE-V1</span>
      </div>

      <div className="max-w-md w-full relative z-10">
        {/* Vintage Archive Safe Container */}
        <div className="bg-[#1f1712] border-2 border-[#8a6843]/60 rounded-xl p-8 shadow-2xl relative folder-shadow text-center">
          {/* Metallic rivets decoration */}
          <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#8a6843]/40" />
          <div className="absolute top-2 left-2 w-2 h-2 rounded-full bg-[#8a6843]/40" />
          <div className="absolute bottom-2 right-2 w-2 h-2 rounded-full bg-[#8a6843]/40" />
          <div className="absolute bottom-2 left-2 w-2 h-2 rounded-full bg-[#8a6843]/40" />

          {/* Stamped badge */}
          <div className="mb-4 inline-block">
            <span className="stamp-red text-xs">أرشيف سري • سري للغاية</span>
          </div>

          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#2a1f17] border border-[#a68253]/50 flex items-center justify-center text-[#d9be8c] shadow-inner">
            <FolderLock className="w-8 h-8 text-[#d9be8c]" />
          </div>

          <h1 className="text-2xl font-bold text-[#e6d3b3] font-typewriter tracking-wider mb-1">
            THE FILES • الملفات
          </h1>
          <p className="text-[#a89279] text-sm mb-6 font-arabic-body">
            أرشيف دراسة وتحليل الشخصيات | أدخل رمز المرور السري
          </p>

          {/* Passcode Dots Display */}
          <div className="flex justify-center items-center gap-3 mb-6">
            {[0, 1, 2, 3].map((idx) => (
              <div
                key={idx}
                className={`w-4 h-4 rounded-full border-2 transition-all duration-200 ${
                  passcode.length > idx
                    ? 'bg-[#d9be8c] border-[#d9be8c] scale-110 shadow-[0_0_8px_rgba(217,190,140,0.6)]'
                    : 'border-[#5a422d] bg-[#140e0a]'
                }`}
              />
            ))}
          </div>

          {error && (
            <div className="flex items-center justify-center gap-2 text-rose-400 text-sm mb-4 animate-shake">
              <ShieldAlert className="w-4 h-4" />
              <span>الرمز غير صحيح، حاول مرة أخرى</span>
            </div>
          )}

          {/* Numeric Keypad */}
          <div className="grid grid-cols-3 gap-3 max-w-[280px] mx-auto mb-6">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
              <button
                key={digit}
                type="button"
                onClick={() => handleKeyPress(digit)}
                className="h-13 bg-[#2a1e16] hover:bg-[#38291d] active:scale-95 text-[#e6d3b3] font-typewriter text-xl rounded-lg border border-[#5c442e]/60 transition-all flex items-center justify-center shadow-md"
              >
                {digit}
              </button>
            ))}
            <button
              type="button"
              onClick={handleClear}
              className="h-13 bg-[#221710] hover:bg-[#2e2017] text-[#a89279] text-xs font-arabic-body rounded-lg border border-[#5c442e]/40 transition flex items-center justify-center"
            >
              مسح
            </button>
            <button
              type="button"
              onClick={() => handleKeyPress('0')}
              className="h-13 bg-[#2a1e16] hover:bg-[#38291d] active:scale-95 text-[#e6d3b3] font-typewriter text-xl rounded-lg border border-[#5c442e]/60 transition flex items-center justify-center shadow-md"
            >
              0
            </button>
            <button
              type="button"
              onClick={handleDelete}
              className="h-13 bg-[#221710] hover:bg-[#2e2017] text-[#a89279] text-xs font-arabic-body rounded-lg border border-[#5c442e]/40 transition flex items-center justify-center"
            >
              حذف ⌫
            </button>
          </div>

          <button
            type="button"
            onClick={() => handleSubmit()}
            className="w-full py-3 bg-[#8a6843] hover:bg-[#9c764e] text-[#1c140d] font-bold rounded-lg border border-[#cbb184] transition shadow-lg flex items-center justify-center gap-2 mb-3"
          >
            <KeyRound className="w-4 h-4" />
            <span>فتح الأرشيف</span>
          </button>

          {/* Hint / Quick Unlock */}
          <div className="flex items-center justify-between text-xs text-[#8c745c] mt-4 pt-3 border-t border-[#3d2c1e]">
            <span className="font-typewriter">الرمز الافتراضي: 0000</span>
            {onUpdatePasscode && (
              <button
                type="button"
                onClick={() => setShowChangeModal(true)}
                className="underline hover:text-[#d9be8c] transition"
              >
                تغيير الرمز
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Change Passcode Modal */}
      {showChangeModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-[#241a12] border border-[#8a6843] rounded-xl p-6 max-w-sm w-full text-right">
            <h3 className="text-lg font-bold text-[#e6d3b3] mb-2 font-arabic-body">
              تعيين رمز مرور سري جديد
            </h3>
            <p className="text-xs text-[#a89279] mb-4">
              أدخل الرمز السري الجديد (٤ أرقام) لحماية ملفاتك الشخصية:
            </p>
            <input
              type="password"
              maxLength={4}
              value={newCodeInput}
              onChange={(e) => setNewCodeInput(e.target.value.replace(/\D/g, ''))}
              placeholder="مثال: 1234"
              className="w-full bg-[#18110b] border border-[#6b4f32] text-center text-xl font-typewriter text-[#e6d3b3] p-3 rounded-lg mb-4 focus:outline-none focus:border-[#d9be8c]"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  if (newCodeInput.length === 4 && onUpdatePasscode) {
                    onUpdatePasscode(newCodeInput);
                    setShowChangeModal(false);
                    setNewCodeInput('');
                  }
                }}
                disabled={newCodeInput.length !== 4}
                className="flex-1 py-2 bg-[#8a6843] hover:bg-[#9c764e] disabled:opacity-50 text-[#1a120b] font-bold rounded-lg transition"
              >
                حفظ الرمز
              </button>
              <button
                type="button"
                onClick={() => setShowChangeModal(false)}
                className="px-4 py-2 bg-transparent text-[#a89279] hover:text-white border border-[#4a3623] rounded-lg transition"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
