import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { Session } from '@supabase/supabase-js';
import { Loader2 } from 'lucide-react';
import { PersonDossier } from './types/dossier';
import { INITIAL_DOSSIERS } from './data/seedData';
import { LoginScreen } from './components/LoginScreen';
import { DeskView } from './components/DeskView';
import { FolderView } from './components/FolderView';
import { supabase } from './lib/supabase';
import { deleteDossierPhoto } from './lib/photos';

const LEGACY_STORAGE_KEY = 'the_files_dossiers_v1';
const SAVE_DEBOUNCE_MS = 800;

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

  const userId = session?.user.id;

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
  const handleLogout = async () => {
    await flushSave();
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
  if (session === undefined) {
    return <Splash text="جاري التحقق من الجلسة..." />;
  }
  if (!session) {
    return <LoginScreen />;
  }
  if (loadState === 'loading' || loadState === 'idle') {
    return <Splash text="جاري فتح الأرشيف..." />;
  }
  if (loadState === 'error') {
    return (
      <Splash
        text={`تعذّر تحميل الملفات: ${loadError}`}
        action={{ label: 'إعادة المحاولة', onClick: loadDossiers }}
        secondary={{ label: 'تسجيل الخروج', onClick: handleLogout }}
        isError
      />
    );
  }

  const currentDossier = dossiers.find((d) => d.id === selectedDossierId);

  const statusBar = <SaveIndicator status={saveStatus} error={saveError} onRetry={flushSave} />;

  if (currentDossier) {
    return (
      <>
        <FolderView
          dossier={currentDossier}
          onClose={handleCloseDossier}
          onUpdateDossier={handleUpdateDossier}
          onDeleteDossier={handleDeleteDossier}
        />
        {statusBar}
      </>
    );
  }

  return (
    <>
      <DeskView
        dossiers={dossiers}
        onOpenDossier={handleOpenDossier}
        onAddDossier={handleAddDossier}
        onExportData={handleExportData}
        onImportData={handleImportData}
        onLogout={handleLogout}
        onLoadSamples={handleLoadSamples}
        legacyCount={legacyCount}
        onImportFromBrowser={handleImportFromBrowser}
      />
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
  <div className="min-h-screen bg-desk-wood flex flex-col items-center justify-center gap-4 p-6 text-center font-arabic-body">
    {!isError && <Loader2 className="w-8 h-8 text-[#d9be8c] animate-spin" />}
    <p className={`text-sm ${isError ? 'text-rose-300' : 'text-[#d9be8c]'}`}>{text}</p>
    <div className="flex gap-2">
      {action && (
        <button
          onClick={action.onClick}
          className="px-4 py-2 bg-[#8c1d18] text-[#fbf7ee] text-xs font-bold rounded-lg border border-[#c43d36]"
        >
          {action.label}
        </button>
      )}
      {secondary && (
        <button
          onClick={secondary.onClick}
          className="px-4 py-2 bg-[#2a1d14] text-[#d9be8c] text-xs font-bold rounded-lg border border-[#5c4028]"
        >
          {secondary.label}
        </button>
      )}
    </div>
  </div>
);

const SaveIndicator: React.FC<{ status: SaveStatus; error: string; onRetry: () => void }> = ({
  status,
  error,
  onRetry,
}) => {
  if (status === 'idle') return null;
  const styles: Record<Exclude<SaveStatus, 'idle'>, string> = {
    saving: 'bg-[#2a1d14] text-[#d9be8c] border-[#5c4028]',
    saved: 'bg-emerald-950 text-emerald-300 border-emerald-800',
    error: 'bg-rose-950 text-rose-200 border-rose-700',
  };
  return (
    <div
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
    </div>
  );
};
