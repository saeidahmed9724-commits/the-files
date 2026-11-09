import { EnergyImpact, LexiconKind, PersonDossier, PredictionEntry, TimelineEntry } from '../types/dossier';

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

// ---------------------------------------------------------------------------
// Social Battery & ROI
// ---------------------------------------------------------------------------

export const ENERGY_VALUE: Record<EnergyImpact, number> = {
  positive: 1,
  negative: -1,
  draining: -2, // draining costs twice as much as a plain bad moment
};

export const ENERGY_LABEL: Record<EnergyImpact, string> = {
  positive: 'إيجابي (بيشحنك)',
  negative: 'سلبي',
  draining: 'مستنزف',
};

export const LEXICON_KIND_LABEL: Record<LexiconKind, string> = {
  stress_word: 'كلمة بيكررها لما يتوتر',
  tic: 'لزمة في الكلام',
  body_language: 'لغة جسد',
  tell: 'علامة كدب / حماس',
};

/** An observation counts half as much every HALF_LIFE_DAYS days: the meter drifts on its own. */
export const BATTERY_HALF_LIFE_DAYS = 45;
export const BATTERY_MIN_RATED = 3;
/**
 * A small "neutral" weight in the denominator: with little or only old evidence the
 * meter relaxes back toward 50% instead of freezing on stale opinions.
 */
export const BATTERY_NEUTRAL_WEIGHT = 0.5;
export const BATTERY_STALE_DAYS = 60;
const DAY_MS = 86_400_000;

export type BatteryLevel = 'unknown' | 'charging' | 'balanced' | 'costly' | 'draining';
export type BatteryTrend = 'improving' | 'worsening' | 'stable' | 'unknown';

export interface SocialBattery {
  ratedCount: number;
  unratedCount: number;
  positive: number;
  negative: number;
  draining: number;
  /** 0 (fully draining) .. 100 (fully charging), 50 = neutral. Recent events weigh more. */
  percent: number;
  level: BatteryLevel;
  trend: BatteryTrend;
  /** Days since the newest rated observation (null when none). */
  daysSinceLast: number | null;
  /** true when there are fewer than BATTERY_MIN_RATED rated observations. */
  lowData: boolean;
  /** true when the newest rated observation is older than BATTERY_STALE_DAYS. */
  stale: boolean;
}

function parseDay(date: string): number {
  const t = new Date(date).getTime();
  return Number.isNaN(t) ? NaN : t;
}

/** Evidence-weighted energy score with the neutral prior (used for the headline number). */
function shrunkScore(items: { value: number; weight: number }[]): number | null {
  if (items.length === 0) return null;
  const sum = items.reduce((a, b) => a + b.value * b.weight, 0);
  const total = items.reduce((a, b) => a + b.weight, 0);
  return sum / (total + BATTERY_NEUTRAL_WEIGHT);
}

function weightedAverage(items: { value: number; weight: number }[]): number | null {
  const total = items.reduce((a, b) => a + b.weight, 0);
  if (items.length === 0 || total <= 0) return null;
  return items.reduce((a, b) => a + b.value * b.weight, 0) / total;
}

/** Maps a score in [-2, 1] onto 0..100 with neutral at 50. */
function scoreToPercent(score: number): number {
  const pct = score >= 0 ? 50 + 50 * score : 50 + (50 * score) / 2;
  return Math.max(0, Math.min(100, Math.round(pct)));
}

export function batteryLevelFor(percent: number, lowData: boolean): BatteryLevel {
  if (lowData) return 'unknown';
  if (percent >= 65) return 'charging';
  if (percent >= 40) return 'balanced';
  if (percent >= 20) return 'costly';
  return 'draining';
}

/**
 * Time-weighted energy balance of a relationship, from the rated timeline entries.
 * `now` is injectable so the "moves over time" behaviour is testable.
 */
export function calculateSocialBattery(timeline: TimelineEntry[] = [], now: Date = new Date()): SocialBattery {
  const nowMs = now.getTime();
  const rated = timeline.filter((e) => e.energy && ENERGY_VALUE[e.energy] !== undefined);
  const unratedCount = timeline.length - rated.length;

  let positive = 0;
  let negative = 0;
  let draining = 0;
  const points: { value: number; weight: number; ageDays: number }[] = [];

  for (const e of rated) {
    const energy = e.energy as EnergyImpact;
    if (energy === 'positive') positive++;
    else if (energy === 'negative') negative++;
    else draining++;

    const t = parseDay(e.date);
    // Unparseable date: treat as "now" rather than silently dropping the observation.
    const ageDays = Number.isNaN(t) ? 0 : Math.max(0, (nowMs - t) / DAY_MS);
    points.push({
      value: ENERGY_VALUE[energy],
      weight: Math.pow(0.5, ageDays / BATTERY_HALF_LIFE_DAYS),
      ageDays,
    });
  }

  const lowData = rated.length < BATTERY_MIN_RATED;
  const daysSinceLast = points.length ? Math.round(Math.min(...points.map((p) => p.ageDays))) : null;
  const score = shrunkScore(points);
  const percent = score === null ? 50 : scoreToPercent(score);

  // Trend: last 30 days vs the 60 days before that.
  const recent = weightedAverage(points.filter((p) => p.ageDays <= 30));
  const earlier = weightedAverage(points.filter((p) => p.ageDays > 30 && p.ageDays <= 90));
  const recentN = points.filter((p) => p.ageDays <= 30).length;
  const earlierN = points.filter((p) => p.ageDays > 30 && p.ageDays <= 90).length;
  let trend: BatteryTrend = 'unknown';
  if (recent !== null && earlier !== null && recentN >= 2 && earlierN >= 2) {
    const diff = recent - earlier;
    trend = diff > 0.25 ? 'improving' : diff < -0.25 ? 'worsening' : 'stable';
  }

  return {
    ratedCount: rated.length,
    unratedCount,
    positive,
    negative,
    draining,
    percent,
    level: batteryLevelFor(percent, lowData),
    trend,
    daysSinceLast,
    lowData,
    stale: daysSinceLast !== null && daysSinceLast > BATTERY_STALE_DAYS,
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
      const energyLabel = note.energy ? ` | أثره على طاقتي: ${ENERGY_LABEL[note.energy]}` : '';
      lines.push(`[${note.date}] (${typeLabel} | مصدر: ${sourceLabel}${energyLabel}): ${note.text}`);
    });
  } else {
    lines.push(`(لا توجد ملاحظات مسجلة)`);
  }
  lines.push(``);

  const battery = calculateSocialBattery(dossier.timeline);
  if (!battery.lowData) {
    const levelText: Record<BatteryLevel, string> = {
      unknown: 'غير كافٍ',
      charging: 'بيشحنني',
      balanced: 'متوازنة',
      costly: 'بتسحب من طاقتي',
      draining: 'مرهقة ومستنزفة',
    };
    lines.push(`--- ميزان الطاقة في العلاقة (Social Battery) ---`);
    lines.push(
      `الحالة: ${levelText[battery.level]} (${battery.percent}/100) | مواقف إيجابية: ${battery.positive} | سلبية: ${battery.negative} | مستنزفة: ${battery.draining} (المواقف الأحدث وزنها أكبر)`
    );
    lines.push(``);
  }

  if (dossier.lexicon && dossier.lexicon.length > 0) {
    lines.push(`--- قاموس الشخص: كلماته ولزماته ولغة جسده ---`);
    dossier.lexicon.forEach((l, i) => {
      lines.push(`${i + 1}. [${LEXICON_KIND_LABEL[l.kind]}] "${l.phrase}"${l.meaning ? ` ← غالبًا بتدل على: ${l.meaning}` : ''}`);
    });
    lines.push(``);
  }

  if (dossier.changesOverTime?.analysisText) {
    lines.push(`--- مسار التغير عبر الزمن المسجل ---`);
    lines.push(dossier.changesOverTime.analysisText);
    lines.push(``);
  }

  if (dossier.changesOverTime?.changeLog && dossier.changesOverTime.changeLog.length > 0) {
    lines.push(`--- تغيرات في شخصيته سجلتها بنفسي ---`);
    dossier.changesOverTime.changeLog.forEach((c) => lines.push(`[${c.date}] ${c.text}`));
    lines.push(``);
  }

  if (dossier.predictions && dossier.predictions.length > 0) {
    const stats = calculatePredictionAccuracy(dossier.predictions);
    lines.push(`--- سجل التوقعات السابق (نسبة الدقة الحالية: ${stats.accuracyRate}%) ---`);
    dossier.predictions.forEach((p, i) => {
      const verdictLabel = p.verdict === 'correct' ? 'صائب' : p.verdict === 'partially_correct' ? 'صائب جزئياً' : p.verdict === 'incorrect' ? 'خاطئ' : 'قيد المتابعة';
      lines.push(`توقع ${i + 1} [${p.date}]: السيناريو: "${p.scenario}" -> النتيجة الفعلية: "${p.actualOutcome || 'قيد المتابعة'}" [الحكم: ${verdictLabel}]${p.learnedInsight ? ` | نمط مؤكد: ${p.learnedInsight}` : ''}`);
    });
  }

  return lines.join('\n');
}
