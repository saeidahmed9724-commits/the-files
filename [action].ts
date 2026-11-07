import { GoogleGenAI } from '@google/genai';

// Vercel serverless function.
// Handles: POST /api/gemini/summary | /api/gemini/changes | /api/gemini/predict
// Same URLs the front end already calls, so no client changes are needed.
// Env vars (set in Vercel > Project > Settings > Environment Variables):
//   GEMINI_API_KEY  (required)
//   GEMINI_MODEL    (optional, defaults to gemini-3.8-flash)

const MODEL = process.env.GEMINI_MODEL || 'gemini-3.8-flash';

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

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: prompt,
      config: { systemInstruction: SYSTEM_PROMPT },
    });
    return res.status(200).json({ result: response.text });
  } catch (error: any) {
    console.error(`Gemini error (${action}):`, error);
    return res.status(500).json({ error: error?.message || 'حدث خطأ أثناء المعالجة' });
  }
}
