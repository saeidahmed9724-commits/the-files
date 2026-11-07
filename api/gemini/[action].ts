import { GoogleGenAI } from '@google/genai';

// Vercel serverless function.
// Handles: POST /api/gemini/summary | /api/gemini/changes | /api/gemini/predict
// Same URLs the front end already calls, so no client changes are needed.
// Requires a logged-in Supabase user (Authorization: Bearer <access_token>).
// Env vars (Vercel > Project > Settings > Environment Variables):
//   GEMINI_API_KEY            (required)
//   VITE_SUPABASE_URL         (already set; reused here to verify the token)
//   VITE_SUPABASE_ANON_KEY    (already set)
//   GEMINI_MODEL              (optional, tried first)
//   ALLOWED_EMAIL             (optional, extra lock: only this email may call the AI)

// Tried in order; if one fails (unknown model / quota), the next is used.
const MODELS = [process.env.GEMINI_MODEL, 'gemini-3.5-flash-lite', 'gemini-3.8-flash'].filter(
  (m, i, arr): m is string => Boolean(m) && arr.indexOf(m) === i
);

async function getUser(token: string): Promise<{ email?: string } | null> {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const anon = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !anon) return null;
  try {
    const r = await fetch(`${url}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${token}`, apikey: anon },
    });
    return r.ok ? await r.json() : null;
  } catch {
    return null;
  }
}

const SYSTEM_PROMPT = `أنت محلل نفسي وسلوكي خبير يساعد مستخدماً في تحليل وفهم الشخصيات المحيطة به ضمن ملف شخصي سري وأرشيف تحليلي ("The Files - الملفات").
قواعد التحليل الهامة:
1. تعامل مع جميع المدخلات كملاحظات وتجارب شخصية من وجهة نظر المستخدم وليست حقائق علمية أو قطعية.
2. أشر دوماً إلى درجات الاحتمال وعدم اليقين (مثل: "يبدو أن...", "الملاحظات ترجح...", "استناداً إلى الوقائع المسجلة...").
3. ابنِ كل استنتاج أو توقع على الأدلة المسجلة في السجل الزمني ونقاط الحساسية والراحة.
4. استخدم لغة عربية رصينة، تحليلية، تشبه تقارير المحققين والمحللين النفسيين بلمسة كلاسيكية أنيقة.`;

function buildSummaryPrompt(d: any): string {
  return `إليك ملف الشخصية التالي:
- الاسم: ${d.name}
- صلة القرابة/العلاقة: ${d.relationship || 'غير محدد'}
- المهنة: ${d.occupation || 'غير محدد'}
- العمر: ${d.age || 'غير محدد'}
- الاستقرار الانفعالي المقدر: ${d.emotionalStability || 3} من 5
- أسلوب التفكير: ${d.mind?.howTheyThink || 'غير محدد'}
- اتخاذ القرار: ${d.mind?.decisionMaking || 'غير محدد'}
- التعامل تحت الضغط: ${d.mind?.handlingPressure || 'غير محدد'}
- ما يزعجه: ${d.triggers?.map((t: any) => t.text).join('، ') || 'لا يوجد'}
- ما يريحه: ${d.comforts?.map((c: any) => c.text).join('، ') || 'لا يوجد'}
- الملاحظات المسجلة: ${d.timeline?.slice(-5).map((n: any) => `[${n.date} - ${n.type}]: ${n.text}`).join('\n') || 'لا توجد ملاحظات كافية'}

المطلوب:
اكتب خلاصة شخصية مركزة (في حدود فقرة أو فقرتين، 60-90 كلمة) بأسلوب أرشيفي تحليلي مكثف يصف جوهر شخصيته، نمط دوافعه، وأفضل مفتاح للتفاهم معه.`;
}

function buildChangesPrompt(d: any): string {
  const notes = (d.timeline || [])
    .map((n: any, i: number) => `${i + 1}. [${n.date}] (${n.type} | مصدر: ${n.source}): ${n.text}`)
    .join('\n');

  return `إليك السجل الزمني للملاحظات المسجلة عن (${d.name}):
${notes || 'لا توجد ملاحظات مسجلة كافية'}

صلة القرابة: ${d.relationship}
المهنة: ${d.occupation}

المطلوب:
قارن بين الملاحظات القديمة والملاحظات الأحدث، وقدم تقريراً تحليلياً بعنوان "مسار التحول والتغير عبر الزمن" يشمل:
1. التحولات الملموسة في السلوك أو المزاج أو التواصل (مع الإشارة إلى التواريخ).
2. أنماط سلوكية جديدة ظهرت مؤخراً.
3. الثوابت التي لم تتغير في شخصيته.
4. قراءة استشرافية: إلى أين يتجه هذا التغير وكيفية التعامل معه الآن.
(صغ الإجابة بنقاط واضحة وتنسيق أنيق ولغة تحليلية رصينة).`;
}

function buildPredictPrompt(d: any, scenario: string): string {
  return `ملف الشخصية قيد الدراسة:
- الاسم: ${d.name} (${d.relationship})
- أسلوب التفكير: ${d.mind?.howTheyThink || 'غير مسجل'}
- اتخاذ القرار: ${d.mind?.decisionMaking || 'غير مسجل'}
- التعامل مع الضغط: ${d.mind?.handlingPressure || 'غير مسجل'}
- ما يزعجه ومثيرات التوتر: ${d.triggers?.map((t: any) => t.text).join('، ') || 'غير مسجل'}
- ما يريحه ومفاتيح الهدوء: ${d.comforts?.map((c: any) => c.text).join('، ') || 'غير مسجل'}
- عينة من السجل السلوكي: ${d.timeline?.slice(-6).map((n: any) => `[${n.date}]: ${n.text}`).join(' | ') || 'لا توجد'}

الموقف أو الرسالة المزمع طرحها:
"${scenario}"

المطلوب:
بناءً على الأرشيف السلوكي المتاح، قدم توقّعاً استشرافياً لرد فعله يشمل:
1. **رد الفعل الأولي المتوقع (الاستجابة الفورية)**: المشاعر، نبرة الصوت أو لغة الجسد المحتملة.
2. **رد الفعل العميق (بعد التفكير)**: كيف سيفسر الموقف وما الخطوة التي من المرجح أن يتخذها.
3. **نقاط الخطر التي يجب تجنبها**: ما الذي قد يشعل حساسيته في هذا الموقف تحديداً.
4. **الصياغة أو التوقيت الأمثل**: نصيحة تكتيكية لتقليل المقاومة وضمان أفضل استجابة ممكنة.
(اكتب التوقع بأسلوب احتمالي يراعي هامش عدم اليقين).`;
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authHeader = String(req.headers?.authorization || '');
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  if (!token) return res.status(401).json({ error: 'يجب تسجيل الدخول لاستخدام الذكاء الاصطناعي' });
  const user = await getUser(token);
  if (!user) return res.status(401).json({ error: 'جلسة الدخول غير صالحة، سجّل الدخول من جديد' });
  const allowed = process.env.ALLOWED_EMAIL;
  if (allowed && user.email?.toLowerCase() !== allowed.toLowerCase()) {
    return res.status(403).json({ error: 'غير مصرّح لهذا الحساب' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    // No fake analysis: fail loudly so a missing key is obvious.
    return res.status(503).json({ error: 'GEMINI_API_KEY غير مضبوط في إعدادات Vercel' });
  }

  const action = String(req.query?.action || '');
  const { dossier, scenario } = req.body || {};

  if (!dossier) {
    return res.status(400).json({ error: 'بيانات الملف غير متوفرة' });
  }

  let prompt: string;
  if (action === 'summary') {
    prompt = buildSummaryPrompt(dossier);
  } else if (action === 'changes') {
    prompt = buildChangesPrompt(dossier);
  } else if (action === 'predict') {
    if (!scenario) {
      return res.status(400).json({ error: 'الموقف غير متوفر' });
    }
    prompt = buildPredictPrompt(dossier, scenario);
  } else {
    return res.status(404).json({ error: 'Unknown action' });
  }

  const ai = new GoogleGenAI({ apiKey });
  let lastError: any = null;
  for (const model of MODELS) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: { systemInstruction: SYSTEM_PROMPT },
      });
      if (response.text) return res.status(200).json({ result: response.text, model });
      lastError = new Error('رد فارغ من النموذج');
    } catch (error: any) {
      console.error(`Gemini error (${action}, ${model}):`, error);
      lastError = error;
    }
  }
  return res.status(500).json({ error: lastError?.message || 'حدث خطأ أثناء المعالجة' });
}
