import { supabase } from './supabase';

const BUCKET = 'photos';
const SIGNED_URL_TTL = 3600; // 1 hour
const cache = new Map<string, { url: string; expires: number }>();

/** Resize client-side: max 800px on the longest side, JPEG ~0.8. */
export async function resizeImage(file: File, maxSize = 800, quality = 0.8): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('المتصفح لا يدعم معالجة الصور.');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close?.();
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('فشل تحويل الصورة.'))),
      'image/jpeg',
      quality
    );
  });
}

/** Uploads to `${user.id}/${dossierId}.jpg` (upsert) and returns the storage path. */
export async function uploadDossierPhoto(dossierId: string, file: File): Promise<string> {
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData.user) throw new Error('يجب تسجيل الدخول لرفع الصور.');

  const blob = await resizeImage(file);
  const path = `${userData.user.id}/${dossierId}.jpg`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, blob, { upsert: true, contentType: 'image/jpeg', cacheControl: '3600' });
  if (error) throw new Error(`فشل رفع الصورة: ${error.message}`);

  cache.delete(path);
  return path;
}

export async function deleteDossierPhoto(path?: string) {
  if (!path) return;
  cache.delete(path);
  await supabase.storage.from(BUCKET).remove([path]);
}

export async function getPhotoSignedUrl(path: string): Promise<string | null> {
  const hit = cache.get(path);
  if (hit && hit.expires > Date.now() + 60_000) return hit.url;

  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, SIGNED_URL_TTL);
  if (error || !data?.signedUrl) return null;
  cache.set(path, { url: data.signedUrl, expires: Date.now() + SIGNED_URL_TTL * 1000 });
  return data.signedUrl;
}
