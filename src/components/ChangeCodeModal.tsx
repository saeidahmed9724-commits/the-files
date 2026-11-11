import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { passcodeToPassword } from './LockScreen';

export const ChangeCodeModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const save = async () => {
    if (code.length < 4) return;
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: passcodeToPassword(code) });
    setLoading(false);
    if (error) setMsg({ ok: false, text: error.message });
    else {
      setMsg({ ok: true, text: 'تم تغيير الرمز. استخدمه في المرة القادمة.' });
      setCode('');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 z-50"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.88, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.88, y: 20 }}
        transition={{ type: 'spring', stiffness: 320, damping: 24 }}
        className="bg-[#241a12] border border-[#8a6843] rounded-xl p-6 max-w-sm w-full text-right"
      >
        <h3 className="text-lg font-bold text-[#e6d3b3] mb-2">تعيين رمز مرور جديد</h3>
        <p className="text-xs text-[#a89279] mb-4">من 4 إلى 6 أرقام. كلما زاد الطول زادت الحماية.</p>
        <input
          type="password"
          inputMode="numeric"
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
          className="w-full bg-[#18110b] border border-[#6b4f32] text-center text-xl font-typewriter text-[#e6d3b3] p-3 rounded-lg mb-3 focus-vintage"
        />
        {msg && <p className={`text-xs mb-3 ${msg.ok ? 'text-emerald-400' : 'text-rose-400'}`}>{msg.text}</p>}
        <div className="flex gap-2">
          <motion.button
            type="button"
            onClick={save}
            disabled={code.length < 4 || loading}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.96 }}
            className="flex-1 py-2 bg-[#8a6843] hover:bg-[#9c764e] disabled:opacity-50 text-[#1a120b] font-bold rounded-lg flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>حفظ الرمز</span>
          </motion.button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-[#a89279] hover:text-white border border-[#4a3623] rounded-lg"
          >
            إغلاق
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};
