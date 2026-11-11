import {
  ConfidenceLevel,
  EnergyImpact,
  MindThinking,
  ObservationSource,
  ObservationType,
  PersonDossier,
  TimelineEntry,
} from '../types/dossier';
import { applyCapture, CaptureCounts, CaptureSelection } from './captureApply';

export type MindKey =
  | 'howTheyThink'
  | 'decisionMaking'
  | 'handlingPressure'
  | 'emotionalStabilityDesc'
  | 'coreValues'
  | 'communicationStyle';

export const MIND_KEYS: MindKey[] = [
  'howTheyThink',
  'decisionMaking',
  'handlingPressure',
  'emotionalStabilityDesc',
  'coreValues',
  'communicationStyle',
];

export const MIND_LABEL: Record<MindKey, string> = {
  howTheyThink: 'طريقة التفكير',
  decisionMaking: 'اتخاذ القرارات',
  handlingPressure: 'تحت الضغط',
  emotionalStabilityDesc: 'الثبات الانفعالي',
  coreValues: 'القيم والمبادئ',
  communicationStyle: 'أسلوب التواصل',
};

export type ProfileKey = 'age' | 'occupation' | 'relationship' | 'knownSince' | 'emotionalStability' | 'personalitySummary';

export const PROFILE_LABEL: Record<ProfileKey, string> = {
  age: 'السن',
  occupation: 'الشغل',
  relationship: 'العلاقة بيك',
  knownSince: 'تعرفه من',
  emotionalStability: 'الثبات الانفعالي (نجوم)',
  personalitySummary: 'الخلاصة',
};

/** What the server returns for the `import` action (already sanitized there). */
export interface ImportResult {
  truncated?: boolean;
  profile: {
    age: string | null;
    occupation: string | null;
    relationship: string | null;
    knownSince: string | null;
    emotionalStability: number | null;
    personalitySummary: string | null;
  };
  mind: Record<MindKey, { text: string; confidence: ConfidenceLevel }>;
  entries: { text: string; type: ObservationType; source: ObservationSource; tags?: string[] }[];
  changes: string[];
  triggers: CaptureSelection['triggers'];
  comforts: CaptureSelection['comforts'];
  lexicon: CaptureSelection['lexicon'];
  life: NonNullable<CaptureSelection['life']>;
  knowledge: NonNullable<CaptureSelection['knowledge']>;
  circle: NonNullable<CaptureSelection['circle']>;
}

/** What the user approved in the review screen. */
export interface ImportSelection extends Omit<ImportResult, 'truncated' | 'profile' | 'mind' | 'entries'> {
  profile: Partial<{
    age: string;
    occupation: string;
    relationship: string;
    knownSince: string;
    emotionalStability: number;
    personalitySummary: string;
  }>;
  mind: Partial<Record<MindKey, { text: string; confidence: ConfidenceLevel }>>;
  entries: ImportResult['entries'];
}

export interface ImportCounts extends CaptureCounts {
  profileFields: number;
  mindFields: number;
}

const PLACEHOLDERS = ['غير محدد', 'حديثاً', 'حديثا', '—', '-'];

/** Empty or a placeholder the "new file" form fills in, so an import may overwrite it. */
export function isBlankValue(v: unknown): boolean {
  const t = String(v ?? '').trim();
  return t === '' || PLACEHOLDERS.includes(t);
}

/**
 * Turns an approved import into a patch for the dossier. Nothing the user already wrote is lost:
 * - scalar fields are only written when the user ticked them,
 * - a mind field that already has text gets the new text appended under it (confidence kept),
 * - lists reuse applyCapture, so duplicates are skipped.
 */
export function applyImport(
  dossier: PersonDossier,
  sel: ImportSelection,
  date: string,
  nowMs: number = Date.now(),
  linkable: { id: string; name: string }[] = []
): { patch: Partial<PersonDossier>; counts: ImportCounts } {
  const patch: Partial<PersonDossier> = {};
  let profileFields = 0;
  let mindFields = 0;

  const p = sel.profile;
  if (p.age?.trim()) (patch.age = p.age.trim()), profileFields++;
  if (p.occupation?.trim()) (patch.occupation = p.occupation.trim()), profileFields++;
  if (p.relationship?.trim()) (patch.relationship = p.relationship.trim()), profileFields++;
  if (p.knownSince?.trim()) (patch.knownSince = p.knownSince.trim()), profileFields++;
  if (typeof p.emotionalStability === 'number' && p.emotionalStability >= 1 && p.emotionalStability <= 5) {
    patch.emotionalStability = Math.round(p.emotionalStability);
    profileFields++;
  }
  if (p.personalitySummary?.trim()) (patch.personalitySummary = p.personalitySummary.trim()), profileFields++;

  const mind: MindThinking = { ...dossier.mind };
  for (const key of MIND_KEYS) {
    const incoming = sel.mind[key];
    if (!incoming || !incoming.text.trim()) continue;
    const confKey = `${key}Confidence` as keyof MindThinking;
    const existing = String(mind[key] || '').trim();
    if (existing) {
      if (!existing.includes(incoming.text.trim())) {
        (mind[key] as string) = `${existing}\n${incoming.text.trim()}`;
        mindFields++;
      }
    } else {
      (mind[key] as string) = incoming.text.trim();
      (mind[confKey] as ConfidenceLevel) = incoming.confidence;
      mindFields++;
    }
  }
  if (mindFields) patch.mind = mind;

  // Lists (entries are handled below because imported notes are not voice captures).
  const { patch: listPatch, counts } = applyCapture(
    dossier,
    {
      entries: [],
      changes: sel.changes,
      triggers: sel.triggers,
      comforts: sel.comforts,
      lexicon: sel.lexicon,
      life: sel.life,
      knowledge: sel.knowledge,
      circle: sel.circle,
    },
    date,
    nowMs,
    linkable
  );
  Object.assign(patch, listPatch);

  const entries: TimelineEntry[] = sel.entries
    .filter((e) => e.text.trim())
    .map((e, i) => ({
      id: `note-imp-${nowMs}-${i}`,
      date,
      text: e.text.trim(),
      type: e.type,
      source: e.source,
      tags: Array.from(new Set(['مستورد', ...(e.tags || [])])),
      energy: undefined as EnergyImpact | undefined,
    }));
  if (entries.length) {
    patch.timeline = [...entries, ...(dossier.timeline || [])];
    counts.entries = entries.length;
  }

  return { patch, counts: { ...counts, profileFields, mindFields } };
}

/** Total number of things written, for the "done" message. */
export function totalImported(c: ImportCounts): number {
  return (
    c.profileFields + c.mindFields + c.entries + c.changes + c.triggers + c.comforts + c.lexicon + c.life + c.knowledge + c.circle
  );
}
