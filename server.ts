import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// Initialize GoogleGenAI if API key exists
const apiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;
if (apiKey) {
  ai = new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// System prompt framing for psychological dossier analysis
const SYSTEM_PROMPT = `أنت محلل نفسي وسلوكي خبير يساعد مستخدماً في تحليل وفهم الشخصيات المحيطة به ضمن ملف شخصي سري وأرشيف تحليلي ("The Files - الملفات").
قواعد التحليل الهامة:
1. تعامل مع جميع المدخلات كملاحظات وتجارب شخصية من وجهة نظر المستخدم وليست حقائق علمية أو قطعية.
2. أشر دوماً إلى درجات الاحتمال وعدم اليقين (مثل: "يبدو أن...", "الملاحظات ترجح...", "استناداً إلى الوقائع المسجلة...").
3. ابنِ كل استنتاج أو توقع على الأدلة المسجلة في السجل الزمني ونقاط الحساسية والراحة.
4. استخدم لغة عربية رصينة، تحليلية، تشبه تقارير المحققين والمحللين النفسيين بلمسة كلاسيكية أنيقة.`;

// API: Generate Personality Summary
app.post('/api/gemini/summary', async (req, res) => {
  try {
    const { dossier } = req.body;
    if (!dossier) {
      return res.status(400).json({ error: 'بيانات الملف غير متوفرة' });
    }

    const prompt = `إليك ملف الشخصية التالي:
- الاسم: ${dossier.name}
- صلة القرابة/العلاقة: ${dossier.relationship || 'غير محدد'}
- المهنة: ${dossier.occupation || 'غير محدد'}
- العمر: ${dossier.age || 'غير محدد'}
- الاستقرار الانفعالي المقدر: ${dossier.emotionalStability || 3} من 5
- أسلوب التفكير: ${dossier.mind?.howTheyThink || 'غير محدد'}
- اتخاذ القرار: ${dossier.mind?.decisionMaking || 'غير محدد'}
- التعامل تحت الضغط: ${dossier.mind?.handlingPressure || 'غير محدد'}
- ما يزعجه: ${dossier.triggers?.map((t: any) => t.text).join('، ') || 'لا يوجد'}
- ما يريحه: ${dossier.comforts?.map((c: any) => c.text).join('، ') || 'لا يوجد'}
- الملاحظات المسجلة: ${dossier.timeline?.slice(-5).map((n: any) => `[${n.date} - ${n.type}]: ${n.text}`).join('\n') || 'لا توجد ملاحظات كافية'}

المطلوب:
اكتب خلاصة شخصية مركزة (في حدود فقرة أو فقرتين، 60-90 كلمة) بأسلوب أرشيفي تحليلي مكثف يصف جوهر شخصيته، نمط دوافعه، وأفضل مفتاح للتفاهم معه.`;

    if (ai) {
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          systemInstruction: SYSTEM_PROMPT,
        },
      });
      return res.json({ result: response.text });
    }

    // Fallback if no API key
    const fallback = `شخصية ${dossier.name} تتسم بنمط تفكير ${dossier.mind?.howTheyThink ? 'يميل إلى ' + dossier.mind.howTheyThink.slice(0, 40) : 'مركب يجمع بين الحذر والمراقبة'}. تشير الملاحظات المسجلة إلى أنه يقدر الوضوح ويكره الغموض أو المباغتة، ويميل في المواقف الضاغطة إلى حماية استقراره الداخلي. مفتاح التواصل الفعال معه يكمن في احترامه مساحته الشخصية والحديث المباشر المبني على وقائع ملموسة.`;
    return res.json({ result: fallback, isFallback: true });
  } catch (error: any) {
    console.error('Error generating summary:', error);
    res.status(500).json({ error: error?.message || 'حدث خطأ أثناء معالجة الطلب' });
  }
});

// API: Generate Changes Over Time
app.post('/api/gemini/changes', async (req, res) => {
  try {
    const { dossier } = req.body;
    if (!dossier) {
      return res.status(400).json({ error: 'بيانات الملف غير متوفرة' });
    }

    const timelineNotes = dossier.timeline || [];
    const notesSummary = timelineNotes
      .map((n: any, idx: number) => `${idx + 1}. [${n.date}] (${n.type} | مصدر: ${n.source}): ${n.text}`)
      .join('\n');

    const prompt = `إليك السجل الزمني للملاحظات المسجلة عن (${dossier.name}):
${notesSummary || 'لا توجد ملاحظات مسجلة كافية'}

صلة القرابة: ${dossier.relationship}
المهنة: ${dossier.occupation}

المطلوب:
قارن بين الملاحظات القديمة والملاحظات الأحدث، وقدم تقريراً تحليلياً بعنوان "مسار التحول والتغير عبر الزمن" يشمل:
1. التحولات الملموسة في السلوك أو المزاج أو التواصل (مع الإشارة إلى التواريخ).
2. أنماط سلوكية جديدة ظهرت مؤخراً.
3. الثوابت التي لم تتغير في شخصيته.
4. قراءة استشرافية: إلى أين يتجه هذا التغير وكيفية التعامل معه الآن.
(صغ الإجابة بنقاط واضحة وتنسيق أنيق ولغة تحليلية رصينة).`;

    if (ai) {
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          systemInstruction: SYSTEM_PROMPT,
        },
      });
      return res.json({ result: response.text });
    }

    // Fallback
    const fallback = `### تقرير مسار التغير والتحول عبر الزمن: ${dossier.name}

1. **التحولات الملموسة في السلوك**:
بمقارنة الملاحظات المبكرة مع الملاحظات الحديثة، يُلحظ تحول تدريجي نحو مزيد من الحذر والتركيز على الدوائر الآمنة، مع انخفاض ملحوظ في الاندفاع اللحظي.

2. **أنماط مستجدة**:
ظهر مؤخراً ميل أكبر للتفكير الاستراتيجي قبل الرد، وتقليل المبادرات الاجتماعية العفوية لصالح العلاقات الوثيقة الموثوقة.

3. **الثوابت الأساسية**:
الحرص الشديد على الالتزام بالمواعيد والصدق المتبادل لا يزال ركيزة ثابتة لم تشهد أي تراجع.

4. **توصية المحلل للتعامل الحالي**:
يُفضل الاعتماد على قنوات التواصل المباشرة وتجنب إحراجه في مواقف غير متوقعة، والبناء على الثقة المتبادمة المتراكمة.`;
    return res.json({ result: fallback, isFallback: true });
  } catch (error: any) {
    console.error('Error generating changes analysis:', error);
    res.status(500).json({ error: error?.message || 'حدث خطأ أثناء تحليل التغيرات' });
  }
});

// API: Predict Reaction
app.post('/api/gemini/predict', async (req, res) => {
  try {
    const { dossier, scenario } = req.body;
    if (!dossier || !scenario) {
      return res.status(400).json({ error: 'بيانات الملف أو الموقف غير متوفرة' });
    }

    const prompt = `ملف الشخصية قيد الدراسة:
- الاسم: ${dossier.name} (${dossier.relationship})
- أسلوب التفكير: ${dossier.mind?.howTheyThink || 'غير مسجل'}
- اتخاذ القرار: ${dossier.mind?.decisionMaking || 'غير مسجل'}
- التعامل مع الضغط: ${dossier.mind?.handlingPressure || 'غير مسجل'}
- ما يزعجه ومثيرات التوتر: ${dossier.triggers?.map((t: any) => t.text).join('، ') || 'غير مسجل'}
- ما يريحه ومفاتيح الهدوء: ${dossier.comforts?.map((c: any) => c.text).join('، ') || 'غير مسجل'}
- عينة من السجل السلوكي: ${dossier.timeline?.slice(-6).map((n: any) => `[${n.date}]: ${n.text}`).join(' | ') || 'لا توجد'}

الموقف أو الرسالة المزمع طرحها:
"${scenario}"

المطلوب:
بناءً على الأرشيف السلوكي المتاح، قدم توقّعاً استشرافياً لرد فعله يشمل:
1. **رد الفعل الأولي المتوقع (الاستجابة الفورية)**: المشاعر، نبرة الصوت أو لغة الجسد المحتملة.
2. **رد الفعل العميق (بعد التفكير)**: كيف سيفسر الموقف وما الخطوة التي من المرجح أن يتخذها.
3. **نقاط الخطر التي يجب تجنبها**: ما الذي قد يشعل حساسيته في هذا الموقف تحديداً.
4. **الصياغة أو التوقيت الأمثل**: نصيحة تكتيكية لتقليل المقاومة وضمان أفضل استجابة ممكنة.
(اكتب التوقع بأسلوب احتمالي يراعي هامش عدم اليقين).`;

    if (ai) {
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          systemInstruction: SYSTEM_PROMPT,
        },
      });
      return res.json({ result: response.text });
    }

    // Fallback
    const fallback = `### التوقع الاستشرافي لرد فعل (${dossier.name}):

1. **الاستجابة الفورية المحتملة**:
من المرجح أن يبدي صمتاً استكشافياً أو تحفظاً هادئاً لجمع المعلومات بدلاً من التفاعل الانفعالي السريع، متأثراً بحرصه المعتاد.

2. **رد الفعل بعد التفكير**:
سيبدأ في تفكيك الموقف إلى عناصر منطقية. إذا شعر أن الأمر لا يمس استقلاليته ولا يفرضه طرف خارجي بشكل قسري، فسيتعامل بإيجابية وعملية.

3. **نقاط الخطر المحتملة**:
تجنب مفاجأته بقرارات منتهية دون منحه فرصة لإبداء الرأي، ولا تستخدم لهجة آمرة.

4. **التكتيك المقترح**:
اطرح الفكرة في صيغة استشارة أو خيار مطروح للنقاش ("أود معرفة رأيك في أمر...").`;
    return res.json({ result: fallback, isFallback: true });
  } catch (error: any) {
    console.error('Error predicting reaction:', error);
    res.status(500).json({ error: error?.message || 'حدث خطأ أثناء توليد التوقع' });
  }
});

// Dev server / Static setup
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`The Files server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
