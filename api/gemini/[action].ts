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

const SYSTEM_PROMPT = `إنت صاحب مقرّب وفاهم في طبائع الناس، بتساعد المستخدم يفهم الناس اللي حواليه من ملفه السري ("The Files - الملفات").
اتكلم بالعامية المصرية الطبيعية، زي ما بتكلم صاحبك في الشات. ممنوع الفصحى والكلام الرسمي وأسلوب التقارير.

القواعد:
1. اللي في الملف ده ملاحظات المستخدم هو، مش حقايق. متألفش تفاصيل مش موجودة، ولو الداتا قليلة قول كده بصراحة.
2. اعتمد على اللي مسجل بس (المواقف، اللي بيضايقه، اللي بيريحه)، وقول "غالبًا" أو "على الأرجح" بدل ما تجزم.
3. واضح ومفيد ومش مطوّل. جمل قصيرة، من غير مقدمات ولا ختام ولا تكرار ولا نصايح عامة، بس ماتختصرش لدرجة إن الكلام يبقى ناقص أو مش مفهوم.
6. لو في "أنماط اتأكدت" (توقعات سابقة طلعت صح)، اعتبرها أقوى دليل عندك وابني عليها.
4. متستخدمش عناوين ولا رموز تنسيق زي # أو ** أو ---. اكتب سطور عادية، وممكن ترقيم بسيط (1، 2، 3) لو محتاج.
5. متعملش تحليل نفسي عميق ولا تشخيصات. قول إيه المتوقع يحصل وليه وتعمل إيه، وبس.`;

function confirmedBlock(d: any): string {
  const items = (d.predictions || [])
    .filter((p: any) => p.verdict === 'correct')
    .slice(0, 8)
    .map((p: any) => `- لما: ${p.scenario} → اللي حصل: ${p.actualOutcome || 'زي ما اتوقع'}${p.learnedInsight ? ` | النمط: ${p.learnedInsight}` : ''}`);
  return items.length ? `\nأنماط اتأكدت (توقعات سابقة طلعت صح):\n${items.join('\n')}\n` : '';
}

function buildSummaryPrompt(d: any): string {
  return `ده ملف شخص:
- الاسم: ${d.name}
- العلاقة: ${d.relationship || 'غير محدد'}
- الشغل: ${d.occupation || 'غير محدد'}
- العمر: ${d.age || 'غير محدد'}
- الاتزان النفسي (تقدير المستخدم): ${d.emotionalStability || 3} من 5
- طريقة تفكيره: ${d.mind?.howTheyThink || 'غير محدد'}
- بياخد قراراته إزاي: ${d.mind?.decisionMaking || 'غير محدد'}
- تحت الضغط: ${d.mind?.handlingPressure || 'غير محدد'}
- اللي بيضايقه: ${d.triggers?.map((t: any) => t.text).join('، ') || 'لا يوجد'}
- اللي بيريحه: ${d.comforts?.map((c: any) => c.text).join('، ') || 'لا يوجد'}
- آخر الملاحظات: ${d.timeline?.slice(-8).map((n: any) => `[${n.date} - ${n.type}]: ${n.text}`).join('\n') || 'لا توجد ملاحظات كافية'}
${confirmedBlock(d)}
المطلوب:
لخّص شخصيته في 3 لـ 4 جمل (حوالي 80 كلمة): هو إيه نوعه، إيه اللي بيحركه، إيه اللي بيضايقه وبيريحه، وأحسن طريقة تتعامل بيها معاه.`;
}

function buildChangesPrompt(d: any): string {
  const notes = (d.timeline || [])
    .map((n: any, i: number) => `${i + 1}. [${n.date}] (${n.type} | مصدر: ${n.source}): ${n.text}`)
    .join('\n');

  return `دي ملاحظات المستخدم عن (${d.name}) مرتبة بالتاريخ:
${notes || 'لا توجد ملاحظات مسجلة كافية'}

العلاقة: ${d.relationship}
الشغل: ${d.occupation}
${confirmedBlock(d)}
المطلوب:
قارن القديم بالجديد وقول إيه اللي اتغير فيه. اكتب 4 لـ 6 سطور قصيرة (حوالي 150 كلمة):
- إيه اللي اتغير (اذكر التاريخ لو واضح)
- إيه اللي ثابت ما اتغيرش
- إيه المتوقع بعد كده وتتعامل معاه إزاي
لو الملاحظات قليلة أو كلها في نفس الفترة، قول إن لسه مفيش تغيير يتقاس، ومتألفش.`;
}

function buildPredictPrompt(d: any, scenario: string): string {
  return `ملف الشخص:
- الاسم: ${d.name} (${d.relationship})
- طريقة تفكيره: ${d.mind?.howTheyThink || 'غير مسجل'}
- بياخد قراراته إزاي: ${d.mind?.decisionMaking || 'غير مسجل'}
- تحت الضغط: ${d.mind?.handlingPressure || 'غير مسجل'}
- اللي بيضايقه: ${d.triggers?.map((t: any) => t.text).join('، ') || 'غير مسجل'}
- اللي بيريحه: ${d.comforts?.map((c: any) => c.text).join('، ') || 'غير مسجل'}
- مواقف سابقة: ${d.timeline?.slice(-10).map((n: any) => `[${n.date}]: ${n.text}`).join(' | ') || 'لا توجد'}
${confirmedBlock(d)}
الموقف أو الرسالة اللي المستخدم ناوي يقولها:
"${scenario}"

المطلوب:
توقع رد فعله في 5 سطور (حوالي 150 كلمة)، كل سطر جملتين تلاتة بالكتير، وابدأ كل سطر بالعنوان ده بالظبط من غير رموز:
رد فعله الأول: ...
هيفكر ويعمل إيه بعدين: ...
ليه كده: ... (اربطه بموقف أو نمط مسجل)
خلي بالك من: ...
أحسن طريقة تقولها: ...
وبنّي كلامك على المواقف المسجلة بس، ولو مفيش داتا كفاية قول ده بصراحة.`;
}

function buildLearnPrompt(d: any, scenario: string, predicted: string, actual: string): string {
  return `المستخدم توقع رد فعل (${d.name}) في موقف، والتوقع طلع صح.
الموقف: "${scenario}"
التوقع: "${predicted}"
اللي حصل فعلًا: "${actual || 'زي ما اتوقع بالظبط'}"

المطلوب:
استخرج جملة واحدة بس (أقصى حد 25 كلمة) بالعامية المصرية، تلخّص النمط اللي اتأكد عن شخصيته أو رد فعله، بصيغة عامة تنفع تتستخدم في مواقف تانية. ابدأ بـ "غالبًا" أو "ملاحظ إنه". من غير تحليل نفسي ومن غير تفاصيل مش موجودة فوق. اكتب الجملة بس.`;
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
  const { dossier, scenario, predictedReaction, actualOutcome } = req.body || {};

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
  } else if (action === 'learn') {
    if (!scenario || !predictedReaction) {
      return res.status(400).json({ error: 'بيانات التوقع غير كاملة' });
    }
    prompt = buildLearnPrompt(dossier, scenario, predictedReaction, actualOutcome || '');
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
