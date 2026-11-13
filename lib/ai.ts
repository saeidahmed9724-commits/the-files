import { supabase } from './supabase';

export type AIAction = 'summary' | 'changes' | 'predict' | 'learn' | 'approach' | 'simulate' | 'debrief' | 'extract' | 'import' | 'ask' | 'selfreview';

/**
 * Calls the serverless Gemini function with the logged-in user's token.
 * Throws an Error with a readable message (shown to the user) on any failure.
 */
export async function callAI(action: AIAction, body: Record<string, unknown>): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('انتهت جلسة الدخول، سجّل الدخول من جديد.');

  let res: Response;
  try {
    res = await fetch(`/api/gemini/${action}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error('تعذّر الاتصال بالخادم. تأكد من الإنترنت وحاول مرة أخرى.');
  }

  let json: any = null;
  try {
    json = await res.json();
  } catch {
    /* non-JSON response */
  }

  if (!res.ok) {
    throw new Error(json?.error || `فشل الطلب (${res.status})`);
  }
  if (!json?.result) throw new Error('لم يصل أي رد من الذكاء الاصطناعي.');
  return json.result as string;
}
