import React, { useEffect, useState } from 'react';
import { PersonDossier } from '../types/dossier';
import { getPhotoSignedUrl } from '../lib/photos';

interface Props {
  dossier: Pick<PersonDossier, 'name' | 'photoUrl' | 'photoPath' | 'photoRev'>;
  className?: string;
}

/** Shows the private storage photo (signed URL) and falls back to the old photoUrl. */
export const DossierPhoto: React.FC<Props> = ({ dossier, className }) => {
  const { photoPath, photoRev, photoUrl, name } = dossier;
  const [src, setSrc] = useState<string>(photoPath ? '' : photoUrl);

  useEffect(() => {
    let cancelled = false;
    if (!photoPath) {
      setSrc(photoUrl);
      return;
    }
    getPhotoSignedUrl(photoPath).then((url) => {
      if (!cancelled) setSrc(url || photoUrl);
    });
    return () => {
      cancelled = true;
    };
  }, [photoPath, photoRev, photoUrl]);

  if (!src) return <div className={className} style={{ background: '#2b2118' }} />;
  return <img src={src} alt={name} className={className} />;
};
