import React, { useState, useEffect } from 'react';
import { PersonDossier } from './types/dossier';
import { INITIAL_DOSSIERS } from './data/seedData';
import { LockScreen } from './components/LockScreen';
import { DeskView } from './components/DeskView';
import { FolderView } from './components/FolderView';

const STORAGE_KEY_DOSSIERS = 'the_files_dossiers_v1';
const STORAGE_KEY_PASSCODE = 'the_files_passcode_v1';
const STORAGE_KEY_SESSION_UNLOCKED = 'the_files_unlocked_session';

export default function App() {
  const [dossiers, setDossiers] = useState<PersonDossier[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_DOSSIERS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Failed to load dossiers from localStorage', e);
    }
    return INITIAL_DOSSIERS;
  });

  const [passcode, setPasscode] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEY_PASSCODE) || '0000';
  });

  const [isUnlocked, setIsUnlocked] = useState<boolean>(() => {
    // Check if query param ?autostart=1 or ?unlocked=1 is passed
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('autostart') === '1' || params.get('unlocked') === '1') {
        return true;
      }
      return sessionStorage.getItem(STORAGE_KEY_SESSION_UNLOCKED) === 'true';
    }
    return false;
  });

  const [selectedDossierId, setSelectedDossierId] = useState<string | null>(null);

  // Sync dossiers to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_DOSSIERS, JSON.stringify(dossiers));
    } catch (e) {
      console.error('Failed to save dossiers', e);
    }
  }, [dossiers]);

  const handleUnlock = () => {
    setIsUnlocked(true);
    sessionStorage.setItem(STORAGE_KEY_SESSION_UNLOCKED, 'true');
  };

  const handleLock = () => {
    setIsUnlocked(false);
    setSelectedDossierId(null);
    sessionStorage.removeItem(STORAGE_KEY_SESSION_UNLOCKED);
  };

  const handleUpdatePasscode = (newCode: string) => {
    setPasscode(newCode);
    localStorage.setItem(STORAGE_KEY_PASSCODE, newCode);
  };

  const handleOpenDossier = (dossier: PersonDossier) => {
    setSelectedDossierId(dossier.id);
  };

  const handleCloseDossier = () => {
    setSelectedDossierId(null);
  };

  const handleUpdateDossier = (updatedFields: Partial<PersonDossier>) => {
    if (!selectedDossierId) return;
    setDossiers((prev) =>
      prev.map((d) => {
        if (d.id === selectedDossierId) {
          return {
            ...d,
            ...updatedFields,
            updatedAt: new Date().toISOString().split('T')[0],
          };
        }
        return d;
      })
    );
  };

  const handleAddDossier = (newDossier: PersonDossier) => {
    setDossiers((prev) => [newDossier, ...prev]);
    setSelectedDossierId(newDossier.id);
  };

  const handleDeleteDossier = (id: string) => {
    setDossiers((prev) => prev.filter((d) => d.id !== id));
    if (selectedDossierId === id) {
      setSelectedDossierId(null);
    }
  };

  const handleExportData = () => {
    try {
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(dossiers, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `the-files-archive-backup-${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } catch (e) {
      console.error('Failed to export data', e);
    }
  };

  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setDossiers(parsed);
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
    // Reset file input
    e.target.value = '';
  };

  const handleResetData = () => {
    if (window.confirm('هل تريد استعادة الملفات النموذجية الأصلية وإلغاء التغييرات الحالية؟')) {
      setDossiers(INITIAL_DOSSIERS);
      setSelectedDossierId(null);
    }
  };

  // If locked, render LockScreen
  if (!isUnlocked) {
    return (
      <LockScreen
        onUnlock={handleUnlock}
        correctPasscode={passcode}
        onUpdatePasscode={handleUpdatePasscode}
      />
    );
  }

  // Active dossier when opened
  const currentDossier = dossiers.find((d) => d.id === selectedDossierId);

  // If a folder is open, render FolderView
  if (currentDossier) {
    return (
      <FolderView
        dossier={currentDossier}
        onClose={handleCloseDossier}
        onUpdateDossier={handleUpdateDossier}
        onDeleteDossier={handleDeleteDossier}
      />
    );
  }

  // Default: Screen 1: The Desk
  return (
    <DeskView
      dossiers={dossiers}
      onOpenDossier={handleOpenDossier}
      onAddDossier={handleAddDossier}
      onExportData={handleExportData}
      onImportData={handleImportData}
      onLock={handleLock}
      onResetData={handleResetData}
    />
  );
}
