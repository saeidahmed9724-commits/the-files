import { GoalItem, JournalEntry, PersonDossier } from '../types/dossier';
import { calculateSocialBattery, SocialBattery } from './dossierLogic';

const DAY_MS = 86_400_000;

export const MOOD_LABEL = ['', 'وحش', 'مش ولا بد', 'عادي', 'كويس', 'ممتاز'];
export const ENERGY_LABEL = ['', 'فاضي', 'تعبان', 'متوسط', 'نشيط', 'مليان'];
export const MOOD_EMOJI = ['', '😞', '😕', '😐', '🙂', '😄'];

export function todayStr(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** The file that represents the user. There is at most one. */
export function findSelf(list: PersonDossier[]): PersonDossier | undefined {
  return list.find((d) => d.isSelf);
}

/** Own file first, then the rest in their existing order. */
export function pinSelfFirst<T extends { isSelf?: boolean }>(list: T[]): T[] {
  return [...list.filter((d) => d.isSelf), ...list.filter((d) => !d.isSelf)];
}

export function createSelfDossier(now: Date = new Date()): PersonDossier {
  const today = todayStr(now);
  return {
    id: `dos-self-${now.getTime()}`,
    isSelf: true,
    codeName: 'ملفي الشخصي',
    name: 'أنا',
    photoUrl: '',
    relationship: 'ملفي الشخصي',
    occupation: 'غير محدد',
    age: 'غير محدد',
    knownSince: 'من أول يوم',
    emotionalStability: 3,
    personalitySummary: '',
    createdAt: today,
    updatedAt: today,
    mind: {
      howTheyThink: '',
      howTheyThinkConfidence: 'medium',
      decisionMaking: '',
      decisionMakingConfidence: 'medium',
      handlingPressure: '',
      handlingPressureConfidence: 'medium',
      emotionalStabilityDesc: '',
      emotionalStabilityConfidence: 'medium',
      coreValues: '',
      coreValuesConfidence: 'medium',
      communicationStyle: '',
      communicationStyleConfidence: 'medium',
    },
    triggers: [],
    comforts: [],
    timeline: [],
    lexicon: [],
    life: [],
    knowledge: [],
    circle: [],
    changesOverTime: { analysisText: '' },
    predictions: [],
    journal: [],
    goals: [],
  };
}

// ---------------------------------------------------------------------------
// Journal statistics
// ---------------------------------------------------------------------------

const clamp15 = (n: number) => Math.min(5, Math.max(1, Math.round(Number(n) || 3)));

export function normalizeTags(raw: string): string[] {
  return Array.from(
    new Set(
      raw
        .split(/[,،\n#]+/)
        .map((t) => t.trim())
        .filter(Boolean)
        .map((t) => t.slice(0, 24))
    )
  ).slice(0, 6);
}

export function makeJournalEntry(
  input: { mood: number; energy: number; text: string; tags?: string[]; date?: string },
  nowMs: number = Date.now()
): JournalEntry {
  return {
    id: `jr-${nowMs}`,
    date: input.date || todayStr(new Date(nowMs)),
    mood: clamp15(input.mood),
    energy: clamp15(input.energy),
    text: input.text.trim(),
    tags: input.tags && input.tags.length ? input.tags : undefined,
  };
}

const avg = (xs: number[]): number | null => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const round1 = (n: number | null): number | null => (n === null ? null : Math.round(n * 10) / 10);

function dayNumber(date: string): number {
  const t = new Date(`${date}T00:00:00`).getTime();
  return Number.isNaN(t) ? NaN : Math.floor(t / DAY_MS);
}

export interface DayPoint {
  date: string;
  mood: number | null; // average of that day's entries
  energy: number | null;
}

/** One point per day for the last `days` days (oldest first); days without entries are null. */
export function dailySeries(journal: JournalEntry[] = [], days = 30, now: Date = new Date()): DayPoint[] {
  const byDay = new Map<string, JournalEntry[]>();
  for (const e of journal) {
    if (!byDay.has(e.date)) byDay.set(e.date, []);
    byDay.get(e.date)!.push(e);
  }
  const out: DayPoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = todayStr(new Date(now.getTime() - i * DAY_MS));
    const es = byDay.get(date) || [];
    out.push({ date, mood: round1(avg(es.map((e) => e.mood))), energy: round1(avg(es.map((e) => e.energy))) });
  }
  return out;
}

export interface JournalStats {
  total: number;
  /** Consecutive days with at least one entry, ending today (or yesterday, so an unfinished day does not reset it). */
  streak: number;
  last7Mood: number | null;
  last7Energy: number | null;
  prev7Mood: number | null;
  /** improving / worsening compare the last 7 days with the 7 before; null when there is not enough data. */
  moodTrend: 'improving' | 'worsening' | 'stable' | null;
}

export function journalStats(journal: JournalEntry[] = [], now: Date = new Date()): JournalStats {
  const today = dayNumber(todayStr(now));
  const days = new Set(journal.map((e) => dayNumber(e.date)).filter((n) => !Number.isNaN(n)));
  let cursor = days.has(today) ? today : today - 1;
  let streak = 0;
  while (days.has(cursor)) {
    streak++;
    cursor--;
  }

  const inRange = (from: number, to: number) =>
    journal.filter((e) => {
      const n = dayNumber(e.date);
      return !Number.isNaN(n) && n > today - from && n <= today - to;
    });
  const last7 = inRange(7, 0);
  const prev7 = inRange(14, 7);
  const m7 = avg(last7.map((e) => e.mood));
  const mPrev = avg(prev7.map((e) => e.mood));

  let moodTrend: JournalStats['moodTrend'] = null;
  if (m7 !== null && mPrev !== null && last7.length >= 2 && prev7.length >= 2) {
    const diff = m7 - mPrev;
    moodTrend = diff >= 0.4 ? 'improving' : diff <= -0.4 ? 'worsening' : 'stable';
  }

  return {
    total: journal.length,
    streak,
    last7Mood: round1(m7),
    last7Energy: round1(avg(last7.map((e) => e.energy))),
    prev7Mood: round1(mPrev),
    moodTrend,
  };
}

export interface TagImpact {
  tag: string;
  count: number;
  mood: number; // average mood on entries with this tag
  energy: number;
  /** mood + energy relative to the overall average (positive = charges me). */
  delta: number;
}

/** Which tags go with better or worse days. Only tags seen at least `minCount` times count. */
export function tagImpacts(journal: JournalEntry[] = [], minCount = 2): { charging: TagImpact[]; draining: TagImpact[] } {
  if (journal.length < 4) return { charging: [], draining: [] };
  const overallMood = avg(journal.map((e) => e.mood)) as number;
  const overallEnergy = avg(journal.map((e) => e.energy)) as number;

  const groups = new Map<string, JournalEntry[]>();
  for (const e of journal) for (const t of e.tags || []) {
    if (!groups.has(t)) groups.set(t, []);
    groups.get(t)!.push(e);
  }

  const all: TagImpact[] = [];
  for (const [tag, es] of groups) {
    if (es.length < minCount) continue;
    const mood = avg(es.map((e) => e.mood)) as number;
    const energy = avg(es.map((e) => e.energy)) as number;
    all.push({
      tag,
      count: es.length,
      mood: round1(mood) as number,
      energy: round1(energy) as number,
      delta: Math.round(((mood - overallMood) + (energy - overallEnergy)) * 10) / 10,
    });
  }
  all.sort((a, b) => b.delta - a.delta);
  return {
    charging: all.filter((t) => t.delta >= 0.4).slice(0, 3),
    draining: all.filter((t) => t.delta <= -0.4).reverse().slice(0, 3),
  };
}

// ---------------------------------------------------------------------------
// Goals
// ---------------------------------------------------------------------------

export function makeGoal(text: string, targetDate: string | undefined, nowMs: number = Date.now()): GoalItem {
  return {
    id: `goal-${nowMs}`,
    text: text.trim(),
    status: 'active',
    createdAt: todayStr(new Date(nowMs)),
    targetDate: targetDate || undefined,
  };
}

export function goalProgress(goals: GoalItem[] = []): { active: number; done: number; paused: number; percentDone: number | null } {
  const active = goals.filter((g) => g.status === 'active').length;
  const done = goals.filter((g) => g.status === 'done').length;
  const paused = goals.filter((g) => g.status === 'paused').length;
  const counted = active + done; // paused goals do not count against me
  return { active, done, paused, percentDone: counted ? Math.round((done / counted) * 100) : null };
}

export function daysUntil(date: string | undefined, now: Date = new Date()): number | null {
  if (!date) return null;
  const a = dayNumber(date);
  const b = dayNumber(todayStr(now));
  return Number.isNaN(a) ? null : a - b;
}

// ---------------------------------------------------------------------------
// How the other files relate to me
// ---------------------------------------------------------------------------

export interface PersonEnergy {
  id: string;
  name: string;
  battery: SocialBattery;
}

/** People ranked by what their files say about the energy I spend on them (rated entries only). */
export function energyByPerson(others: PersonDossier[], now: Date = new Date()): { charging: PersonEnergy[]; draining: PersonEnergy[]; unrated: number } {
  const rated: PersonEnergy[] = [];
  let unrated = 0;
  for (const d of others) {
    if (d.isSelf) continue;
    const battery = calculateSocialBattery(d.timeline || [], now);
    if (battery.level === 'unknown' || battery.lowData) {
      unrated++;
      continue;
    }
    rated.push({ id: d.id, name: d.name, battery });
  }
  rated.sort((a, b) => b.battery.percent - a.battery.percent);
  return {
    charging: rated.filter((p) => p.battery.percent >= 60),
    draining: rated.filter((p) => p.battery.percent < 45).reverse(),
    unrated,
  };
}

export interface KnowsAboutMe {
  id: string;
  name: string;
  items: { text: string; status: 'knows' | 'unsure' | 'unknown'; via?: string }[];
}

/** What each other file says that person knows (or does not know) about me. */
export function whatOthersKnow(others: PersonDossier[]): { people: KnowsAboutMe[]; counts: { knows: number; unsure: number; unknown: number } } {
  const counts = { knows: 0, unsure: 0, unknown: 0 };
  const people: KnowsAboutMe[] = [];
  for (const d of others) {
    if (d.isSelf) continue;
    const items = (d.knowledge || [])
      .filter((k) => k.text && k.text.trim())
      .map((k) => ({ text: k.text.trim(), status: k.status, via: k.via }));
    if (!items.length) continue;
    items.forEach((i) => counts[i.status]++);
    people.push({ id: d.id, name: d.name, items });
  }
  people.sort((a, b) => b.items.length - a.items.length);
  return { people, counts };
}
