import React, { useState } from 'react';
import { ShieldAlert, KeyRound, FolderLock, Loader2 } from 'lucide-react';
import { supabase, supabaseConfigured } from '../lib/supabase';

const OWNER_EMAIL = import.meta.env.VITE_OWNER_EMAIL as string | undefined;

/** The Supabase password is derived from the passcode (min length 6 is required by Supabase). */
export const passcodeToPassword = (code: string) => `files-${code}`;

interface LockScreenProps {
  onUnlock: () => void;
}

export const LockScreen: React.FC<LockScreenProps> = ({ onUnlock }) => {
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleKeyPress = (num: string) => {
    if (passcode.length < 6 && !loading) {
      setPasscode(passcode + num);
      setError('');
    }
  };
  const handleDelete = () => {
    setPasscode((p) => p.slice(0, -1));
    setError('');
  };
  const handleClear = () => {
    setPasscode('');
    setError('');
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (passcode.length < 4 || loading) return;
    if (!supabaseConfigured || !OWNER_EMAIL) {
      setError('إعدادات Supabase ناقصة (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY / VITE_OWNER_EMAIL)');
      return;
    }
    setLoading(true);
    const { error: err } = await supabase.auth.signInWithPassword({
      email: OWNER_EMAIL,
      password: passcodeToPassword(passcode),
    });
    setLoading(false);
    setPasscode('');
    if (err) {
      setError(
        err.message.toLowerCase().includes('invalid')
          ? 'الرمز غير صحيح، حاول مرة أخرى'
          : `تعذّر الدخول: ${err.message}`
      );
      return;
    }
    onUnlock();
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
            {Array.from({ length: Math.max(4, passcode.length) }, (_, i) => i).map((idx) => (
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
              <span>{error}</span>
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
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
            <span>{loading ? 'جاري الفتح...' : 'فتح الأرشيف'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
