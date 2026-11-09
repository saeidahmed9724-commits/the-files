import {
  ChangeNote,
  ComfortItem,
  EnergyImpact,
  LexiconItem,
  LexiconKind,
  ObservationSource,
  ObservationType,
  PersonDossier,
  TimelineEntry,
  TriggerItem,
} from '../types/dossier';

/** What the user approved in the Quick Capture review card. */
export interface CaptureSelection {
  entries: {
    text: string;
    type: ObservationType;
    source: ObservationSource;
    energy?: EnergyImpact | null;
    tags?: string[];
  }[];
  changes: string[];
  triggers: { text: string; severity: 'mild' | 'moderate' | 'high' }[];
  comforts: { text: string; impact: 'soothing' | 'uplifting' | 'essential' }[];
  lexicon: { phrase: string; kind: LexiconKind; meaning?: string }[];
}

export interface CaptureCounts {
  entries: number;
  changes: number;
  triggers: number;
  comforts: number;
  lexicon: number;
  skippedDuplicates: number;
}

/** Lowercase, drop Arabic diacritics/tatweel and punctuation so near-identical texts match. */
export function normalizeText(s: string): string {
  return s
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Turns an approved selection into a patch for the dossier.
 * New timeline entries go first (newest first, as Page4 does). Triggers, comforts and
 * lexicon items that already exist (by normalized text) are skipped, never duplicated.
 * Only the fields that actually receive something are present in the patch.
 */
export function applyCapture(
  dossier: PersonDossier,
  sel: CaptureSelection,
  date: string,
  nowMs: number = Date.now()
): { patch: Partial<PersonDossier>; counts: CaptureCounts } {
  const patch: Partial<PersonDossier> = {};
  const counts: CaptureCounts = { entries: 0, changes: 0, triggers: 0, comforts: 0, lexicon: 0, skippedDuplicates: 0 };
  const id = (prefix: string, i: number) => `${prefix}-${nowMs}-${i}`;

  const entries: TimelineEntry[] = sel.entries
    .filter((e) => e.text.trim())
    .map((e, i) => ({
      id: id('note', i),
      date,
      text: e.text.trim(),
      type: e.type,
      source: e.source,
      tags: e.tags && e.tags.length ? e.tags : undefined,
      energy: e.energy || undefined,
      fromVoice: true,
    }));
  if (entries.length) {
    patch.timeline = [...entries, ...(dossier.timeline || [])];
    counts.entries = entries.length;
  }

  const changes: ChangeNote[] = sel.changes
    .filter((c) => c.trim())
    .map((c, i) => ({ id: id('chg', i), date, text: c.trim() }));
  if (changes.length) {
    patch.changesOverTime = {
      ...(dossier.changesOverTime || { analysisText: '' }),
      analysisText: dossier.changesOverTime?.analysisText || '',
      changeLog: [...changes, ...(dossier.changesOverTime?.changeLog || [])],
    };
    counts.changes = changes.length;
  }

  const seen = (items: string[]) => new Set(items.map(normalizeText));

  const knownTriggers = seen((dossier.triggers || []).map((t) => t.text));
  const triggers: TriggerItem[] = [];
  sel.triggers.forEach((t, i) => {
    const n = normalizeText(t.text);
    if (!n) return;
    if (knownTriggers.has(n)) return void counts.skippedDuplicates++;
    knownTriggers.add(n);
    triggers.push({ id: id('trig', i), text: t.text.trim(), severity: t.severity });
  });
  if (triggers.length) {
    patch.triggers = [...triggers, ...(dossier.triggers || [])];
    counts.triggers = triggers.length;
  }

  const knownComforts = seen((dossier.comforts || []).map((c) => c.text));
  const comforts: ComfortItem[] = [];
  sel.comforts.forEach((c, i) => {
    const n = normalizeText(c.text);
    if (!n) return;
    if (knownComforts.has(n)) return void counts.skippedDuplicates++;
    knownComforts.add(n);
    comforts.push({ id: id('comf', i), text: c.text.trim(), impact: c.impact });
  });
  if (comforts.length) {
    patch.comforts = [...comforts, ...(dossier.comforts || [])];
    counts.comforts = comforts.length;
  }

  const knownLex = seen((dossier.lexicon || []).map((l) => l.phrase));
  const lexicon: LexiconItem[] = [];
  sel.lexicon.forEach((l, i) => {
    const n = normalizeText(l.phrase);
    if (!n) return;
    if (knownLex.has(n)) return void counts.skippedDuplicates++;
    knownLex.add(n);
    lexicon.push({ id: id('lex', i), phrase: l.phrase.trim(), kind: l.kind, meaning: l.meaning?.trim() || undefined });
  });
  if (lexicon.length) {
    patch.lexicon = [...lexicon, ...(dossier.lexicon || [])];
    counts.lexicon = lexicon.length;
  }

  return { patch, counts };
}
