import { PersonDossier } from '../types/dossier';

/**
 * Contextual Memory
 * Turns everything the user recorded about a person into a flat list of "memory items",
 * each with a short code (T3, P1, ...). The AI answers a question from these items and cites
 * the codes, so every claim in the answer can be traced back to a real note or situation.
 */

export type MemoryKind =
  | 'note'
  | 'prediction'
  | 'mind'
  | 'trigger'
  | 'comfort'
  | 'lexicon'
  | 'life'
  | 'knowledge'
  | 'circle'
  | 'change'
  | 'journal'
  | 'goal';

export interface MemoryItem {
  tag: string; // code the AI cites, e.g. "T3"
  kind: MemoryKind;
  date?: string;
  meta?: string; // short qualifier shown next to the text (type, source, verdict...)
  text: string;
}

export const KIND_LABEL: Record<MemoryKind, string> = {
  note: 'ملاحظة',
  prediction: 'توقع',
  mind: 'عن عقله',
  trigger: 'بيضايقه',
  comfort: 'بيريحه',
  lexicon: 'قاموسه',
  life: 'حياته',
  knowledge: 'بيعرف عنك',
  circle: 'دايرته',
  change: 'تغيّر سجلته',
  journal: 'يومياتي',
  goal: 'هدف',
};

const PREFIX: Record<MemoryKind, string> = {
  note: 'T',
  prediction: 'P',
  mind: 'M',
  trigger: 'X',
  comfort: 'C',
  lexicon: 'L',
  life: 'B',
  knowledge: 'K',
  circle: 'R',
  change: 'G',
  journal: 'J',
  goal: 'H',
};

const NOTE_TYPE_AR: Record<string, string> = {
  incident: 'واقعة',
  conversation: 'محادثة',
  impression: 'انطباع',
};
const NOTE_SOURCE_AR: Record<string, string> = {
  seen: 'شفتها بنفسي',
  inferred: 'استنتاج',
};
const ENERGY_AR: Record<string, string> = {
  positive: 'شحنني',
  negative: 'سلبي',
  draining: 'استنزفني',
};
const VERDICT_AR: Record<string, string> = {
  correct: 'التوقع طلع صح',
  partially_correct: 'التوقع صح جزئيًا',
  incorrect: 'التوقع طلع غلط',
  pending: 'لسه معلّق',
};
const LEXICON_KIND_AR: Record<string, string> = {
  stress_word: 'كلمة بيكررها لما يتوتر',
  tic: 'لزمة في الكلام',
  body_language: 'لغة جسد',
  tell: 'علامة كدب أو حماس',
};
const LIFE_KIND_AR: Record<string, string> = {
  home: 'سكنه',
  work: 'شغله',
  routine: 'روتينه',
  place: 'مكان بيروحه',
  other: 'حاجة تانية',
};
const KNOWLEDGE_STATUS_AR: Record<string, string> = {
  knows: 'بيعرف',
  unsure: 'مش متأكد إنه يعرف',
  unknown: 'مش بيعرف',
};
const MIND_FIELDS: { key: string; confKey: string; label: string }[] = [
  { key: 'howTheyThink', confKey: 'howTheyThinkConfidence', label: 'طريقة تفكيره' },
  { key: 'decisionMaking', confKey: 'decisionMakingConfidence', label: 'قراراته' },
  { key: 'handlingPressure', confKey: 'handlingPressureConfidence', label: 'تحت الضغط' },
  { key: 'emotionalStabilityDesc', confKey: 'emotionalStabilityConfidence', label: 'اتزانه' },
  { key: 'coreValues', confKey: 'coreValuesConfidence', label: 'قيمه' },
  { key: 'communicationStyle', confKey: 'communicationStyleConfidence', label: 'أسلوب كلامه' },
];
const CONF_AR: Record<string, string> = { low: 'ثقة قليلة', medium: 'ثقة متوسطة', high: 'ثقة عالية' };

const clip = (s: unknown, n: number): string => String(s ?? '').trim().slice(0, n);

/** Flat list of everything recorded about the person. Tags are stable for a given dossier state. */
export function buildMemoryCorpus(d: PersonDossier): MemoryItem[] {
  const items: MemoryItem[] = [];
  const counters: Record<string, number> = {};
  const push = (kind: MemoryKind, item: Omit<MemoryItem, 'tag' | 'kind'>) => {
    const text = item.text.trim();
    if (!text) return;
    counters[kind] = (counters[kind] || 0) + 1;
    items.push({ tag: `${PREFIX[kind]}${counters[kind]}`, kind, ...item, text });
  };

  // Notes and situations, oldest first (so T1 is the oldest).
  const notes = (d.timeline || [])
    .map((n, i) => ({ n, i }))
    .sort((a, b) => (a.n.date || '').localeCompare(b.n.date || '') || a.i - b.i);
  for (const { n } of notes) {
    const meta = [NOTE_TYPE_AR[n.type], NOTE_SOURCE_AR[n.source], n.energy ? `أثره عليا: ${ENERGY_AR[n.energy]}` : '']
      .filter(Boolean)
      .join('، ');
    push('note', { date: n.date, meta, text: clip(n.text, 600) });
  }

  // Predictions with what actually happened.
  const preds = (d.predictions || [])
    .map((p, i) => ({ p, i }))
    .sort((a, b) => (a.p.date || '').localeCompare(b.p.date || '') || a.i - b.i);
  for (const { p } of preds) {
    const parts = [
      `الموقف: ${clip(p.scenario, 250)}`,
      `توقعت: ${clip(p.predictedReaction, 300)}`,
      `اللي حصل: ${p.actualOutcome ? clip(p.actualOutcome, 300) : 'لسه ماتسجلش'}`,
    ];
    if (p.learnedInsight) parts.push(`النمط: ${clip(p.learnedInsight, 200)}`);
    push('prediction', { date: p.date, meta: VERDICT_AR[p.verdict] || '', text: parts.join(' | ') });
  }

  // Profile pages.
  const mind: any = d.mind || {};
  for (const f of MIND_FIELDS) {
    if (mind[f.key]) push('mind', { meta: CONF_AR[mind[f.confKey]] || '', text: `${f.label}: ${clip(mind[f.key], 400)}` });
  }
  for (const t of d.triggers || []) push('trigger', { meta: t.severity ? `شدة: ${t.severity}` : '', text: clip(t.text, 300) });
  for (const c of d.comforts || []) push('comfort', { meta: c.impact ? `أثر: ${c.impact}` : '', text: clip(c.text, 300) });
  for (const l of d.lexicon || []) {
    push('lexicon', {
      meta: LEXICON_KIND_AR[l.kind] || '',
      text: `${clip(l.phrase, 120)}${l.meaning ? ` — معناها: ${clip(l.meaning, 200)}` : ''}`,
    });
  }
  for (const f of d.life || []) {
    push('life', {
      meta: LIFE_KIND_AR[f.kind] || '',
      text: `${clip(f.text, 250)}${f.detail ? ` (${clip(f.detail, 120)})` : ''}`,
    });
  }
  for (const k of d.knowledge || []) {
    push('knowledge', { meta: KNOWLEDGE_STATUS_AR[k.status] || '', text: clip(k.text, 250) });
  }
  for (const c of d.circle || []) {
    push('circle', {
      meta: c.influence ? `تأثيره عليه: ${c.influence}` : '',
      text: `${clip(c.name, 80)} (${clip(c.relation, 80)})${c.tieToMe ? ` — علاقته بيا: ${clip(c.tieToMe, 150)}` : ''}`,
    });
  }
  for (const g of d.changesOverTime?.changeLog || []) push('change', { date: g.date, text: clip(g.text, 400) });

  // The user's own file: diary entries (oldest first) and goals.
  const diary = (d.journal || [])
    .filter((j) => j && typeof j.date === 'string')
    .sort((a, b) => a.date.localeCompare(b.date));
  for (const j of diary) {
    const meta = `مزاج ${j.mood}/5، طاقة ${j.energy}/5${j.tags?.length ? `، ${j.tags.map((t) => '#' + t).join(' ')}` : ''}`;
    push('journal', { date: j.date, meta, text: clip(j.text || j.tags?.join(' ') || '', 500) });
  }
  const GOAL_AR: Record<string, string> = { active: 'شغّال', done: 'خلص', paused: 'موقوف' };
  for (const g of d.goals || []) {
    push('goal', { date: g.createdAt, meta: `${GOAL_AR[g.status] || ''}${g.targetDate ? `، الموعد ${g.targetDate}` : ''}`, text: clip(g.text, 250) });
  }

  return items;
}

// ---------------------------------------------------------------------------
// Retrieval: only used when a file is large. Small files are sent whole.
// ---------------------------------------------------------------------------

export function normalizeArabic(s: string): string {
  return String(s || '')
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const STOP = new Set(
  (
    'في من علي على عن ده دي دا هو هي هم هل ايه اي ازاي امتي امتا ليه مين فين كام لما لو ان انه انها كان كانت يكون ' +
    'بتاع بتاعه اللي الي مع او ثم قبل بعد كل بس ما مش لا يا ايه ده دول هو الشخص عليه عليها بيه بيها معاه ' +
    'the a of to and is'
  )
    .split(/\s+/)
    .map(normalizeArabic)
);

function stem(t: string): string {
  let s = t;
  if (s.startsWith('ال') && s.length > 4) s = s.slice(2);
  if (s.length >= 5 && 'وبلفك'.includes(s[0])) s = s.slice(1);
  return s;
}

export function tokenize(text: string): string[] {
  const out: string[] = [];
  for (const raw of normalizeArabic(text).split(' ')) {
    if (!raw || STOP.has(raw)) continue;
    const s = stem(raw);
    if (s.length >= 2 && !STOP.has(s)) out.push(s);
  }
  return Array.from(new Set(out));
}

function tokensMatch(q: string, t: string): boolean {
  if (q === t) return true;
  if (q.length >= 3 && t.startsWith(q)) return true;
  if (t.length >= 3 && q.startsWith(t)) return true;
  return false;
}

/**
 * Keeps the whole file when it is small enough to send. For big files it always keeps the profile
 * items (mind, triggers, ...) and fills the rest with the notes/predictions that best match the
 * question, plus a small boost for recent ones.
 */
export function selectRelevant(items: MemoryItem[], question: string, maxTotal = 120): MemoryItem[] {
  if (items.length <= maxTotal) return items;

  const isEvent = (it: MemoryItem) => it.kind === 'note' || it.kind === 'prediction';
  const profile = items.filter((it) => !isEvent(it));
  const events = items.filter(isEvent);

  const profileKept = profile.slice(0, Math.min(profile.length, Math.floor(maxTotal / 2)));
  const room = Math.max(10, maxTotal - profileKept.length);

  const qTokens = tokenize(question);
  const dates = events.map((e) => e.date || '').sort();
  const rank = (e: MemoryItem) => {
    const idx = dates.indexOf(e.date || '');
    return dates.length > 1 ? idx / (dates.length - 1) : 1; // 0 = oldest, 1 = newest
  };

  const scored = events.map((e) => {
    const tokens = tokenize(`${e.text} ${e.meta || ''}`);
    let hits = 0;
    for (const q of qTokens) if (tokens.some((t) => tokensMatch(q, t))) hits++;
    return { e, score: hits * 10 + rank(e) * 2 };
  });
  scored.sort((a, b) => b.score - a.score);
  const keep = new Set(scored.slice(0, room).map((s) => s.e.tag));

  return items.filter((it) => !isEvent(it) ? profileKept.includes(it) : keep.has(it.tag));
}

// ---------------------------------------------------------------------------
// Answer parsing: the AI cites sources as [T3] or [T3, P1]
// ---------------------------------------------------------------------------

export type AnswerPart = { type: 'text'; value: string } | { type: 'cite'; tags: string[] };

const GROUP_RE = /\[\s*([A-Z]\d{1,3}(?:\s*[,،]\s*[A-Z]\d{1,3})*)\s*\]/g;

/** Splits an answer into text and citation groups. Unknown codes (made up by the model) are dropped. */
export function splitAnswer(answer: string, validTags: Set<string>): AnswerPart[] {
  const parts: AnswerPart[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  const re = new RegExp(GROUP_RE.source, 'g');
  while ((m = re.exec(answer)) !== null) {
    if (m.index > last) parts.push({ type: 'text', value: answer.slice(last, m.index) });
    const tags = (m[1].match(/[A-Z]\d{1,3}/g) || []).filter((t) => validTags.has(t));
    if (tags.length) parts.push({ type: 'cite', tags });
    last = m.index + m[0].length;
  }
  if (last < answer.length) parts.push({ type: 'text', value: answer.slice(last) });
  return parts;
}

/** Unique cited tags in order of first appearance. */
export function citedTags(parts: AnswerPart[]): string[] {
  const seen: string[] = [];
  for (const p of parts) {
    if (p.type !== 'cite') continue;
    for (const t of p.tags) if (!seen.includes(t)) seen.push(t);
  }
  return seen;
}
