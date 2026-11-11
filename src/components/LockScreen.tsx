import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldAlert, KeyRound, FolderLock, Loader2 } from 'lucide-react';
import { supabase, supabaseConfigured } from '../lib/supabase';

const OWNER_EMAIL = import.meta.env.VITE_OWNER_EMAIL as string | undefined;

/** The Supabase password is derived from the passcode (min length 6 is required by Supabase). */
export const passcodeToPassword = (code: string) => `files-${code}`;

interface LockScreenProps {
  onUnlock: () => void;
}

/* ── Floating golden dust particles ──────────────────────────── */
const PARTICLES = Array.from({ length: 6 }, (_, i) => ({
  id: i,
  size: 2 + Math.random() * 3,
  left: `${10 + Math.random() * 80}%`,
  duration: 6 + Math.random() * 6,
  delay: Math.random() * 4,
  opacity: 0.15 + Math.random() * 0.25,
}));

/* ── Keypad layout ───────────────────────────────────────────── */
const DIGITS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

export const LockScreen: React.FC<LockScreenProps> = ({ onUnlock }) => {
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Stable key for error shake – increments each time a *new* error is set
  const [errorKey, setErrorKey] = useState(0);

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
      setErrorKey((k) => k + 1);
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
      setErrorKey((k) => k + 1);
      return;
    }
    onUnlock();
  };

  const isReady = passcode.length >= 4;

  /* Memoize the "SECURITY LEVEL" characters so the stagger is stable */
  const securityText = useMemo(() => 'SECURITY LEVEL: CLASSIFIED'.split(''), []);

  return (
    <div className="min-h-screen bg-desk-wood flex items-center justify-center p-4 relative overflow-hidden font-arabic-body">
      {/* Background Vignette and archive atmosphere */}
      <div className="absolute inset-0 bg-radial-gradient pointer-events-none opacity-80" />

      {/* ✦ 8 — Ambient floating golden dust particles */}
      {PARTICLES.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full pointer-events-none"
          style={{
            width: p.size,
            height: p.size,
            left: p.left,
            background: 'radial-gradient(circle, #d9be8c, #8a6843)',
          }}
          initial={{ y: '110vh', opacity: 0 }}
          animate={{
            y: '-10vh',
            opacity: [0, p.opacity, p.opacity, 0],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: 'linear',
          }}
        />
      ))}

      {/* ✦ 7 — "SECURITY LEVEL" text: slow typing / stagger fade-in */}
      <div className="absolute top-6 left-6 flex items-center gap-2 text-[#cbb184]/50 text-xs font-typewriter">
        <span className="inline-flex">
          {securityText.map((char, i) => (
            <motion.span
              key={i}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 + i * 0.04, duration: 0.05 }}
            >
              {char === ' ' ? '\u00A0' : char}
            </motion.span>
          ))}
        </span>
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 + securityText.length * 0.04 + 0.1 }}
        >
          •
        </motion.span>
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 + securityText.length * 0.04 + 0.2 }}
        >
          ARCHIVE-V1
        </motion.span>
      </div>

      {/* ✦ 1 — Container entrance: fade-in + scale spring */}
      <motion.div
        className="max-w-md w-full relative z-10"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 22, mass: 1 }}
      >
        {/* Vintage Archive Safe Container */}
        <div className="bg-[#1f1712] border-2 border-[#8a6843]/60 rounded-xl p-8 shadow-2xl relative folder-shadow text-center">
          {/* Metallic rivets decoration */}
          <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#8a6843]/40" />
          <div className="absolute top-2 left-2 w-2 h-2 rounded-full bg-[#8a6843]/40" />
          <div className="absolute bottom-2 right-2 w-2 h-2 rounded-full bg-[#8a6843]/40" />
          <div className="absolute bottom-2 left-2 w-2 h-2 rounded-full bg-[#8a6843]/40" />

          {/* ✦ 2 — Title text: stagger fade-in from below */}
          {/* Stamped badge */}
          <motion.div
            className="mb-4 inline-block"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.5 }}
          >
            <span className="stamp-red text-xs">أرشيف سري • سري للغاية</span>
          </motion.div>

          <motion.div
            className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#2a1f17] border border-[#a68253]/50 flex items-center justify-center text-[#d9be8c] shadow-inner"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.5 }}
          >
            <FolderLock className="w-8 h-8 text-[#d9be8c]" />
          </motion.div>

          <motion.h1
            className="text-2xl font-bold text-[#e6d3b3] font-typewriter tracking-wider mb-1"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.5 }}
          >
            THE FILES • الملفات
          </motion.h1>
          <motion.p
            className="text-[#a89279] text-sm mb-6 font-arabic-body"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45, duration: 0.5 }}
          >
            أرشيف دراسة وتحليل الشخصيات | أدخل رمز المرور السري
          </motion.p>

          {/* ✦ 3 — Passcode Dots: pop / spring scale when filled */}
          <div className="flex justify-center items-center gap-3 mb-6">
            {Array.from({ length: Math.max(4, passcode.length) }, (_, i) => i).map((idx) => {
              const isFilled = passcode.length > idx;
              return (
                <motion.div
                  key={idx}
                  className={`w-4 h-4 rounded-full border-2 ${
                    isFilled
                      ? 'bg-[#d9be8c] border-[#d9be8c] shadow-[0_0_8px_rgba(217,190,140,0.6)]'
                      : 'border-[#5a422d] bg-[#140e0a]'
                  }`}
                  initial={false}
                  animate={
                    isFilled
                      ? { scale: [0, 1.25, 1], opacity: 1 }
                      : { scale: 1, opacity: 1 }
                  }
                  transition={
                    isFilled
                      ? { type: 'spring', stiffness: 500, damping: 15 }
                      : { duration: 0.15 }
                  }
                />
              );
            })}
          </div>

          {/* ✦ 5 — Error message: shake animation */}
          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                key={errorKey}
                className="flex items-center justify-center gap-2 text-rose-400 text-sm mb-4"
                initial={{ opacity: 0, x: 0 }}
                animate={{
                  opacity: 1,
                  x: [0, -10, 10, -8, 8, -4, 4, 0],
                }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
              >
                <ShieldAlert className="w-4 h-4" />
                <span>{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ✦ 4 — Numeric Keypad: stagger entrance + whileTap scale */}
          <div className="grid grid-cols-3 gap-3 max-w-[280px] mx-auto mb-6">
            {DIGITS.map((digit, i) => (
              <motion.button
                key={digit}
                type="button"
                onClick={() => handleKeyPress(digit)}
                className="h-13 bg-[#2a1e16] hover:bg-[#38291d] text-[#e6d3b3] font-typewriter text-xl rounded-lg border border-[#5c442e]/60 transition-colors flex items-center justify-center shadow-md"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + i * 0.04, duration: 0.35 }}
                whileTap={{ scale: 0.9 }}
              >
                {digit}
              </motion.button>
            ))}
            <motion.button
              type="button"
              onClick={handleClear}
              className="h-13 bg-[#221710] hover:bg-[#2e2017] text-[#a89279] text-xs font-arabic-body rounded-lg border border-[#5c442e]/40 transition-colors flex items-center justify-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 + 9 * 0.04, duration: 0.35 }}
              whileTap={{ scale: 0.9 }}
            >
              مسح
            </motion.button>
            <motion.button
              type="button"
              onClick={() => handleKeyPress('0')}
              className="h-13 bg-[#2a1e16] hover:bg-[#38291d] text-[#e6d3b3] font-typewriter text-xl rounded-lg border border-[#5c442e]/60 transition-colors flex items-center justify-center shadow-md"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 + 10 * 0.04, duration: 0.35 }}
              whileTap={{ scale: 0.9 }}
            >
              0
            </motion.button>
            <motion.button
              type="button"
              onClick={handleDelete}
              className="h-13 bg-[#221710] hover:bg-[#2e2017] text-[#a89279] text-xs font-arabic-body rounded-lg border border-[#5c442e]/40 transition-colors flex items-center justify-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 + 11 * 0.04, duration: 0.35 }}
              whileTap={{ scale: 0.9 }}
            >
              حذف ⌫
            </motion.button>
          </div>

          {/* ✦ 6 — Submit button: pulse glow when ready (passcode >= 4) */}
          <motion.button
            type="button"
            onClick={() => handleSubmit()}
            className="w-full py-3 bg-[#8a6843] hover:bg-[#9c764e] text-[#1c140d] font-bold rounded-lg border border-[#cbb184] transition-colors shadow-lg flex items-center justify-center gap-2 mb-3"
            animate={
              isReady
                ? {
                    boxShadow: [
                      '0 0 0px rgba(203,177,132,0.3)',
                      '0 0 18px rgba(203,177,132,0.6)',
                      '0 0 0px rgba(203,177,132,0.3)',
                    ],
                  }
                : { boxShadow: '0 0 0px rgba(203,177,132,0)' }
            }
            transition={
              isReady
                ? { duration: 1.6, repeat: Infinity, ease: 'easeInOut' }
                : { duration: 0.3 }
            }
            whileTap={{ scale: 0.97 }}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
            <span>{loading ? 'جاري الفتح...' : 'فتح الأرشيف'}</span>
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
};
