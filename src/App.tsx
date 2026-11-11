import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import type { Session } from '@supabase/supabase-js';
import { Loader2 } from 'lucide-react';
import { PersonDossier } from './types/dossier';
import { INITIAL_DOSSIERS } from './data/seedData';
import { LockScreen } from './components/LockScreen';
import { DeskView } from './components/DeskView';
import { FolderView } from './components/FolderView';
import { supabase } from './lib/supabase';
import { deleteDossierPhoto } from './lib/photos';

const LEGACY_STORAGE_KEY = 'the_files_dossiers_v1';
const SAVE_DEBOUNCE_MS = 800;
const UNLOCK_FLAG = 'the_files_unlocked_session';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

function readLegacyDossiers(): PersonDossier[] {
  try {
    const saved = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!saved) return [];
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function sortDossiers(list: PersonDossier[]): PersonDossier[] {
  return [...list].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
}

export default function App() {
  const [session, setSession] = useState<Session | null | undefined>(undefined); // undefined = still checking
  const [dossiers, setDossiers] = useState<PersonDossier[]>([]);
  const [loadState, setLoadState] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [loadError, setLoadError] = useState('');
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [saveError, setSaveError] = useState('');
  const [selectedDossierId, setSelectedDossierId] = useState<string | null>(null);
  const [unlocked, setUnlocked] = useState<boolean>(
    () => sessionStorage.getItem(UNLOCK_FLAG) === 'true'
  );
  const [legacyCount, setLegacyCount] = useState(() => readLegacyDossiers().length);

  // JSON of each dossier as last confirmed in the DB, used to find what changed.
  const savedJson = useRef<Map<string, string>>(new Map());
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dossiersRef = useRef<PersonDossier[]>([]);
  dossiersRef.current = dossiers;

  // ---- Auth ----
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  // Data loads only after the passcode was entered in this browser session.
  const userId = unlocked ? session?.user.id : undefined;

  // ---- Load from Supabase after login ----
  const loadDossiers = useCallback(async () => {
    setLoadState('loading');
    setLoadError('');
    const { data, error } = await supabase.from('dossiers').select('id, data');
    if (error) {
      setLoadError(error.message);
      setLoadState('error');
      return;
    }
    const list = sortDossiers((data || []).map((r: any) => r.data as PersonDossier));
    savedJson.current = new Map(list.map((d) => [d.id, JSON.stringify(d)]));
    setDossiers(list);
    setLoadState('ready');
  }, []);

  useEffect(() => {
    if (userId) {
      loadDossiers();
    } else {
      setDossiers([]);
      setLoadState('idle');
      setSelectedDossierId(null);
      savedJson.current = new Map();
    }
  }, [userId, loadDossiers]);

  // ---- Debounced save of changed dossiers ----
  const flushSave = useCallback(async () => {
    const changed = dossiersRef.current.filter(
      (d) => savedJson.current.get(d.id) !== JSON.stringify(d)
    );
    if (changed.length === 0) return;

    setSaveStatus('saving');
    const rows = changed.map((d) => ({
      id: d.id,
      data: d,
      updated_at: new Date().toISOString(),
    }));
    const { error } = await supabase.from('dossiers').upsert(rows, { onConflict: 'id' });
    if (error) {
      console.error('Save failed', error);
      setSaveError(error.message);
      setSaveStatus('error');
      return;
    }
    changed.forEach((d) => savedJson.current.set(d.id, JSON.stringify(d)));
    setSaveError('');
    // If more edits arrived while saving, run again.
    const stillDirty = dossiersRef.current.some(
      (d) => savedJson.current.get(d.id) !== JSON.stringify(d)
    );
    if (stillDirty) {
      flushSave();
    } else {
      setSaveStatus('saved');
    }
  }, []);

  useEffect(() => {
    if (loadState !== 'ready') return;
    const dirty = dossiers.some((d) => savedJson.current.get(d.id) !== JSON.stringify(d));
    if (!dirty) return;
    setSaveStatus('saving');
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(flushSave, SAVE_DEBOUNCE_MS);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [dossiers, loadState, flushSave]);

  // Try not to lose edits when the tab is closed / hidden.
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === 'hidden') flushSave();
    };
    document.addEventListener('visibilitychange', onHide);
    return () => document.removeEventListener('visibilitychange', onHide);
  }, [flushSave]);

  // ---- Handlers ----
  /** Lock = sign out + forget the unlock flag. The passcode is needed again. */
  const handleLock = async () => {
    await flushSave();
    sessionStorage.removeItem(UNLOCK_FLAG);
    setUnlocked(false);
    setSelectedDossierId(null);
    await supabase.auth.signOut();
  };

  const handleOpenDossier = (dossier: PersonDossier) => setSelectedDossierId(dossier.id);
  const handleCloseDossier = () => setSelectedDossierId(null);

  const handleUpdateDossier = (updatedFields: Partial<PersonDossier>) => {
    if (!selectedDossierId) return;
    setDossiers((prev) =>
      prev.map((d) =>
        d.id === selectedDossierId
          ? { ...d, ...updatedFields, updatedAt: new Date().toISOString().split('T')[0] }
          : d
      )
    );
  };

  const handleAddDossier = (newDossier: PersonDossier) => {
    setDossiers((prev) => [newDossier, ...prev]);
    setSelectedDossierId(newDossier.id);
  };

  const handleDeleteDossier = async (id: string) => {
    const target = dossiers.find((d) => d.id === id);
    setDossiers((prev) => prev.filter((d) => d.id !== id));
    savedJson.current.delete(id);
    if (selectedDossierId === id) setSelectedDossierId(null);

    const { error } = await supabase.from('dossiers').delete().eq('id', id);
    if (error) {
      setSaveError(`فشل الحذف: ${error.message}`);
      setSaveStatus('error');
      return;
    }
    deleteDossierPhoto(target?.photoPath).catch(() => {});
  };

  const handleExportData = () => {
    try {
      const dataStr =
        'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(dossiers, null, 2));
      const a = document.createElement('a');
      a.setAttribute('href', dataStr);
      a.setAttribute(
        'download',
        `the-files-archive-backup-${new Date().toISOString().split('T')[0]}.json`
      );
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (e) {
      console.error('Failed to export data', e);
    }
  };

  /** Merge by id: imported files overwrite same-id files, nothing else is touched. */
  const mergeDossiers = (incoming: PersonDossier[]) => {
    setDossiers((prev) => {
      const map = new Map(prev.map((d) => [d.id, d]));
      incoming.forEach((d) => map.set(d.id, d));
      return sortDossiers([...map.values()]);
    });
  };

  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (Array.isArray(parsed) && parsed.length > 0 && parsed.every((d) => d && d.id && d.name)) {
          mergeDossiers(parsed);
          alert('تم استيراد بيانات الأرشيف بنجاح!');
        } else {
          alert('الملف المحدد لا يحتوي على صيغة بيانات صالحة.');
        }
      } catch (err) {
        console.error('Import error', err);
        alert('حدث خطأ أثناء قراءة ملف JSON.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleImportFromBrowser = () => {
    const legacy = readLegacyDossiers();
    if (legacy.length === 0) {
      setLegacyCount(0);
      return;
    }
    if (!window.confirm(`سيتم رفع ${legacy.length} ملف من هذا المتصفح إلى حسابك. متابعة؟`)) return;
    mergeDossiers(legacy);
    // Keep a backup copy of the old data instead of deleting it.
    try {
      localStorage.setItem(LEGACY_STORAGE_KEY + '_migrated_backup', JSON.stringify(legacy));
      localStorage.removeItem(LEGACY_STORAGE_KEY);
    } catch {
      /* ignore */
    }
    setLegacyCount(0);
  };

  const handleLoadSamples = () => {
    const existing = new Set(dossiers.map((d) => d.id));
    const fresh = INITIAL_DOSSIERS.filter((d) => !existing.has(d.id));
    if (fresh.length === 0) {
      alert('الملفات النموذجية موجودة بالفعل.');
      return;
    }
    mergeDossiers(fresh);
  };

  // ---- Render ----
  const currentDossier = dossiers.find((d) => d.id === selectedDossierId);

  if (session === undefined) {
    return <Splash text="جاري التحقق من الجلسة..." />;
  }
  if (!session || !unlocked) {
    return (
      <LockScreen
        onUnlock={() => {
          sessionStorage.setItem(UNLOCK_FLAG, 'true');
          setUnlocked(true);
        }}
      />
    );
  }
  if (loadState === 'loading' || loadState === 'idle') {
    return <Splash text="جاري فتح الأرشيف..." />;
  }
  if (loadState === 'error') {
    return (
      <Splash
        text={`تعذّر تحميل الملفات: ${loadError}`}
        action={{ label: 'إعادة المحاولة', onClick: loadDossiers }}
        secondary={{ label: 'تسجيل الخروج', onClick: handleLock }}
        isError
      />
    );
  }

  const statusBar = <SaveIndicator status={saveStatus} error={saveError} onRetry={flushSave} />;

  return (
    <>
      <AnimatePresence mode="wait">
        {currentDossier ? (
          <motion.div
            key={`folder-${currentDossier.id}`}
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
          >
            <FolderView
              key={currentDossier.id}
              dossier={currentDossier}
              onClose={handleCloseDossier}
              onUpdateDossier={handleUpdateDossier}
              onDeleteDossier={handleDeleteDossier}
              linkable={dossiers.filter((d) => d.id !== currentDossier.id).map((d) => ({ id: d.id, name: d.name }))}
              onOpenLinked={setSelectedDossierId}
            />
          </motion.div>
        ) : (
          <motion.div
            key="desk"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.25 }}
          >
            <DeskView
              dossiers={dossiers}
              onOpenDossier={handleOpenDossier}
              onAddDossier={handleAddDossier}
              onExportData={handleExportData}
              onImportData={handleImportData}
              onLock={handleLock}
              onLoadSamples={handleLoadSamples}
              legacyCount={legacyCount}
              onImportFromBrowser={handleImportFromBrowser}
            />
          </motion.div>
        )}
      </AnimatePresence>
      {statusBar}
    </>
  );
}

const Splash: React.FC<{
  text: string;
  isError?: boolean;
  action?: { label: string; onClick: () => void };
  secondary?: { label: string; onClick: () => void };
}> = ({ text, isError, action, secondary }) => (
  <motion.div
    className="min-h-screen bg-desk-wood flex flex-col items-center justify-center gap-4 p-6 text-center font-arabic-body"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ duration: 0.5 }}
  >
    {!isError && (
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
      >
        <Loader2 className="w-8 h-8 text-[#d9be8c]" />
      </motion.div>
    )}
    <motion.p
      className={`text-sm ${isError ? 'text-rose-300' : 'text-[#d9be8c]'}`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      {text}
    </motion.p>
    <div className="flex gap-2">
      {action && (
        <motion.button
          onClick={action.onClick}
          className="px-4 py-2 bg-[#8c1d18] text-[#fbf7ee] text-xs font-bold rounded-lg border border-[#c43d36]"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          {action.label}
        </motion.button>
      )}
      {secondary && (
        <motion.button
          onClick={secondary.onClick}
          className="px-4 py-2 bg-[#2a1d14] text-[#d9be8c] text-xs font-bold rounded-lg border border-[#5c4028]"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          {secondary.label}
        </motion.button>
      )}
    </div>
  </motion.div>
);

const SaveIndicator: React.FC<{ status: SaveStatus; error: string; onRetry: () => void }> = ({
  status,
  error,
  onRetry,
}) => {
  const styles: Record<Exclude<SaveStatus, 'idle'>, string> = {
    saving: 'bg-[#2a1d14] text-[#d9be8c] border-[#5c4028]',
    saved: 'bg-emerald-950 text-emerald-300 border-emerald-800',
    error: 'bg-rose-950 text-rose-200 border-rose-700',
  };
  return (
    <AnimatePresence>
      {status !== 'idle' && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.9 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className={`fixed bottom-3 left-3 z-50 px-3 py-1.5 rounded-lg border text-[11px] font-arabic-body shadow-lg flex items-center gap-2 max-w-[80vw] ${styles[status]}`}
        >
          {status === 'saving' && <span>جاري الحفظ...</span>}
          {status === 'saved' && <span>✓ تم الحفظ</span>}
          {status === 'error' && (
            <>
              <span className="truncate">فشل الحفظ{error ? `: ${error}` : ''}</span>
              <button onClick={onRetry} className="underline shrink-0">
                إعادة
              </button>
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};
