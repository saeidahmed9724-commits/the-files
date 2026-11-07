import { PersonDossier, PredictionEntry, TimelineEntry } from '../types/dossier';

export interface PredictionStats {
  total: number;
  evaluated: number;
  correct: number;
  partiallyCorrect: number;
  incorrect: number;
  pending: number;
  accuracyRate: number; // 0 to 100
}

/**
 * Calculates prediction accuracy rate and statistics
 * Fully correct = 1.0 weight, partially correct = 0.5 weight
 */
export function calculatePredictionAccuracy(predictions: PredictionEntry[] = []): PredictionStats {
  const total = predictions.length;
  let correct = 0;
  let partiallyCorrect = 0;
  let incorrect = 0;
  let pending = 0;

  for (const p of predictions) {
    if (p.verdict === 'correct') {
      correct++;
    } else if (p.verdict === 'partially_correct') {
      partiallyCorrect++;
    } else if (p.verdict === 'incorrect') {
      incorrect++;
    } else {
      pending++;
    }
  }

  const evaluated = correct + partiallyCorrect + incorrect;
  const weightedScore = correct * 1.0 + partiallyCorrect * 0.5;
  const accuracyRate = evaluated > 0 ? Math.round((weightedScore / evaluated) * 100) : 0;

  return {
    total,
    evaluated,
    correct,
    partiallyCorrect,
    incorrect,
    pending,
    accuracyRate,
  };
}

/**
 * Retrieves the latest observation for a dossier
 */
export function getLatestObservation(dossier: PersonDossier): TimelineEntry | null {
  if (!dossier.timeline || dossier.timeline.length === 0) {
    return null;
  }
  // Sort descending by date
  const sorted = [...dossier.timeline].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return sorted[0];
}

/**
 * Filters dossiers based on search query
 */
export function searchDossiers(dossiers: PersonDossier[], query: string): PersonDossier[] {
  if (!query || !query.trim()) {
    return dossiers;
  }
  const clean = query.trim().toLowerCase();
  return dossiers.filter((d) => {
    return (
      d.name.toLowerCase().includes(clean) ||
      (d.relationship && d.relationship.toLowerCase().includes(clean)) ||
      (d.occupation && d.occupation.toLowerCase().includes(clean)) ||
      (d.codeName && d.codeName.toLowerCase().includes(clean)) ||
      (d.personalitySummary && d.personalitySummary.toLowerCase().includes(clean))
    );
  });
}

/**
 * Formats the entire dossier into a structured, elegant Markdown prompt for AI models
 * (ChatGPT, Claude, Gemini, etc.)
 */
export function formatDossierForAI(dossier: PersonDossier): string {
  const confidenceLabels = {
    low: 'منخفضة (ملاحظات محدودة)',
    medium: 'متوسطة (ملاحظات متكررة)',
    high: 'عالية (ملاحظات مؤكدة بالتجربة)',
  };

  const lines: string[] = [];

  lines.push(`================================================================`);
  lines.push(`أرشيف التحليل السلوكي والشخصي | سري للاستخدام الشخصي فقط`);
  lines.push(`ملف دراسة الشخصية: ${dossier.name} (${dossier.codeName || 'ملف رقم ' + dossier.id.slice(0, 5)})`);
  lines.push(`================================================================`);
  lines.push(``);
  lines.push(`تعليمات أساسية للذكاء الاصطناعي (AI Prompt Framing):`);
  lines.push(`1. تعامل مع جميع ما يرد في هذا الملف كملاحظات وافتراضات شخصية دونها المدون وليست حقائق علمية أو قطعية.`);
  lines.push(`2. أظهر دوماً درجات عدم اليقين والاحتمالية عند تقديم أي تحليل أو نصيحة.`);
  lines.push(`3. ابنِ توصياتك وتوقعاتك حصراً على الأدلة والوقائع المسجلة بالسجل الزمني.`);
  lines.push(``);
  lines.push(`--- البيانات الأساسية ---`);
  lines.push(`- الاسم: ${dossier.name}`);
  lines.push(`- صلة العلاقة بي: ${dossier.relationship}`);
  lines.push(`- المهنة: ${dossier.occupation}`);
  lines.push(`- العمر: ${dossier.age}`);
  lines.push(`- أعرفه منذ: ${dossier.knownSince}`);
  lines.push(`- تقدير الاستقرار الانفعالي: ${dossier.emotionalStability} من 5 نجوم`);
  if (dossier.personalitySummary) {
    lines.push(`- خلاصة الشخصية الحالية: ${dossier.personalitySummary}`);
  }
  lines.push(``);

  lines.push(`--- خريطة العقل وطريقة التفكير ---`);
  lines.push(`1. طريقة التفكير ومعالجة المعلومات: ${dossier.mind.howTheyThink} [درجة الثقة: ${confidenceLabels[dossier.mind.howTheyThinkConfidence]}]`);
  lines.push(`2. أسلوب اتخاذ القرارات: ${dossier.mind.decisionMaking} [درجة الثقة: ${confidenceLabels[dossier.mind.decisionMakingConfidence]}]`);
  lines.push(`3. التعامل مع الضغط والتوتر: ${dossier.mind.handlingPressure} [درجة الثقة: ${confidenceLabels[dossier.mind.handlingPressureConfidence]}]`);
  lines.push(`4. الثبات الانفعالي والمزاج: ${dossier.mind.emotionalStabilityDesc} [درجة الثقة: ${confidenceLabels[dossier.mind.emotionalStabilityConfidence]}]`);
  lines.push(`5. القيم والمبادئ الحاكمة: ${dossier.mind.coreValues} [درجة الثقة: ${confidenceLabels[dossier.mind.coreValuesConfidence]}]`);
  lines.push(`6. أسلوب التواصل والتعبير: ${dossier.mind.communicationStyle} [درجة الثقة: ${confidenceLabels[dossier.mind.communicationStyleConfidence]}]`);
  lines.push(``);

  lines.push(`--- ما يزعجه ومثيرات التوتر (Triggers) ---`);
  if (dossier.triggers && dossier.triggers.length > 0) {
    dossier.triggers.forEach((t, i) => {
      lines.push(`${i + 1}. ${t.text}${t.severity ? ` (شدة التأثير: ${t.severity})` : ''}`);
    });
  } else {
    lines.push(`(لا توجد بنود مسجلة بعد)`);
  }
  lines.push(``);

  lines.push(`--- ما يريحه وما يحبه (Comforts & Keys) ---`);
  if (dossier.comforts && dossier.comforts.length > 0) {
    dossier.comforts.forEach((c, i) => {
      lines.push(`${i + 1}. ${c.text}${c.impact ? ` (النوع: ${c.impact})` : ''}`);
    });
  } else {
    lines.push(`(لا توجد بنود مسجلة بعد)`);
  }
  lines.push(``);

  lines.push(`--- السجل الزمني للملاحظات السلوكية (Timeline Log) ---`);
  if (dossier.timeline && dossier.timeline.length > 0) {
    dossier.timeline.forEach((note, i) => {
      const typeLabel = note.type === 'incident' ? 'واقعة/حدث' : note.type === 'conversation' ? 'محادثة' : 'انطباع';
      const sourceLabel = note.source === 'seen' ? 'عاينته بنفسي' : 'استنتجته';
      lines.push(`[${note.date}] (${typeLabel} | مصدر: ${sourceLabel}): ${note.text}`);
    });
  } else {
    lines.push(`(لا توجد ملاحظات مسجلة)`);
  }
  lines.push(``);

  if (dossier.changesOverTime?.analysisText) {
    lines.push(`--- مسار التغير عبر الزمن المسجل ---`);
    lines.push(dossier.changesOverTime.analysisText);
    lines.push(``);
  }

  if (dossier.predictions && dossier.predictions.length > 0) {
    const stats = calculatePredictionAccuracy(dossier.predictions);
    lines.push(`--- سجل التوقعات السابق (نسبة الدقة الحالية: ${stats.accuracyRate}%) ---`);
    dossier.predictions.forEach((p, i) => {
      lines.push(`توقع ${i + 1} [${p.date}]: السيناريو: "${p.scenario}" -> النتيجة الفعلية: "${p.actualOutcome || 'قيد المتابعة'}" [الحكم: ${p.verdict}]`);
    });
  }

  return lines.join('\n');
}
