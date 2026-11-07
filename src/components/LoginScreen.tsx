import React, { useState } from 'react';
import { ShieldAlert, FolderLock, Loader2, LogIn } from 'lucide-react';
import { supabase, supabaseConfigured } from '../lib/supabase';

export const LoginScreen: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setLoading(true);
    setError('');
    const { error: err } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (err) {
      setError(
        err.message.toLowerCase().includes('invalid')
          ? 'الإيميل أو كلمة المرور غير صحيحة'
          : `تعذّر تسجيل الدخول: ${err.message}`
      );
      setLoading(false);
    }
    // on success App's onAuthStateChange swaps this screen out
  };

  return (
    <div className="min-h-screen bg-desk-wood flex items-center justify-center p-4 relative overflow-hidden font-arabic-body">
      <div className="absolute inset-0 bg-radial-gradient pointer-events-none opacity-80" />
      <div className="absolute top-6 left-6 flex items-center gap-2 text-[#cbb184]/50 text-xs font-typewriter">
        <span>SECURITY LEVEL: CLASSIFIED</span>
        <span>•</span>
        <span>ARCHIVE-V2</span>
      </div>

      <div className="max-w-md w-full relative z-10">
        <form
          onSubmit={handleSubmit}
          className="bg-[#1f1712] border-2 border-[#8a6843]/60 rounded-xl p-8 shadow-2xl relative folder-shadow text-center"
        >
          <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#8a6843]/40" />
          <div className="absolute top-2 left-2 w-2 h-2 rounded-full bg-[#8a6843]/40" />
          <div className="absolute bottom-2 right-2 w-2 h-2 rounded-full bg-[#8a6843]/40" />
          <div className="absolute bottom-2 left-2 w-2 h-2 rounded-full bg-[#8a6843]/40" />

          <div className="mb-4 inline-block">
            <span className="stamp-red text-xs">أرشيف سري • سري للغاية</span>
          </div>

          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#2a1f17] border border-[#a68253]/50 flex items-center justify-center shadow-inner">
            <FolderLock className="w-8 h-8 text-[#d9be8c]" />
          </div>

          <h1 className="text-2xl font-bold text-[#e6d3b3] font-typewriter tracking-wider mb-1">
            THE FILES • الملفات
          </h1>
          <p className="text-[#a89279] text-sm mb-6">سجّل دخولك للوصول إلى الأرشيف</p>

          {!supabaseConfigured && (
            <div className="flex items-start gap-2 text-amber-300 text-xs mb-4 text-right bg-amber-950/40 border border-amber-700/40 rounded p-3">
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                متغيرات Supabase غير مضبوطة (VITE_SUPABASE_URL و VITE_SUPABASE_ANON_KEY). أضفها في
                Vercel ثم اعمل Redeploy.
              </span>
            </div>
          )}

          <div className="space-y-3 mb-4 text-right">
            <input
              type="email"
              dir="ltr"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              className="w-full bg-[#140e0a] border border-[#5c442e] text-[#f5ebd6] font-typewriter text-sm px-3 py-2.5 rounded-lg focus:outline-none focus:border-[#d9be8c]"
            />
            <input
              type="password"
              dir="ltr"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full bg-[#140e0a] border border-[#5c442e] text-[#f5ebd6] font-typewriter text-sm px-3 py-2.5 rounded-lg focus:outline-none focus:border-[#d9be8c]"
            />
          </div>

          {error && (
            <div className="flex items-center justify-center gap-2 text-rose-400 text-sm mb-4">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !supabaseConfigured}
            className="w-full py-2.5 bg-[#8c1d18] hover:bg-[#a3221c] disabled:opacity-50 text-[#fbf7ee] font-bold text-sm rounded-lg border border-[#c43d36] transition flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
            <span>{loading ? 'جاري الدخول...' : 'دخول'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};
