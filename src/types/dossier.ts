export type ConfidenceLevel = 'low' | 'medium' | 'high';

export type ObservationType = 'incident' | 'conversation' | 'impression';
export type ObservationSource = 'seen' | 'inferred';

// How a recorded situation affected the user's energy. Feeds the Social Battery meter.
export type EnergyImpact = 'positive' | 'negative' | 'draining';

export type LexiconKind = 'stress_word' | 'tic' | 'body_language' | 'tell';

// Life & circle page
export type LifeFactKind = 'home' | 'work' | 'routine' | 'place' | 'other';
export type FactSource = 'seen' | 'told_me' | 'heard'; // I saw it / he told me / heard it from someone
export type KnowledgeStatus = 'knows' | 'unsure' | 'unknown'; // does he know this about me?
export type KnowledgeSource = 'i_told' | 'heard_from_other' | 'inferred';
export type InfluenceLevel = 'low' | 'medium' | 'high';

export type PredictionVerdict = 'correct' | 'partially_correct' | 'incorrect' | 'pending';

export interface MindThinking {
  howTheyThink: string;
  howTheyThinkConfidence: ConfidenceLevel;
  decisionMaking: string;
  decisionMakingConfidence: ConfidenceLevel;
  handlingPressure: string;
  handlingPressureConfidence: ConfidenceLevel;
  emotionalStabilityDesc: string;
  emotionalStabilityConfidence: ConfidenceLevel;
  coreValues: string;
  coreValuesConfidence: ConfidenceLevel;
  communicationStyle: string;
  communicationStyleConfidence: ConfidenceLevel;
}

export interface TriggerItem {
  id: string;
  text: string;
  severity?: 'mild' | 'moderate' | 'high';
  category?: string;
}

export interface ComfortItem {
  id: string;
  text: string;
  impact?: 'soothing' | 'uplifting' | 'essential';
  category?: string;
}

export interface TimelineEntry {
  id: string;
  date: string;
  text: string;
  type: ObservationType;
  source: ObservationSource;
  tags?: string[];
  energy?: EnergyImpact; // unset = not rated yet (ignored by the battery)
  fromVoice?: boolean; // created through Quick Capture (voice or text)
}

/** One entry of the person's "dictionary": a word, habit or body-language tell. */
export interface LexiconItem {
  id: string;
  phrase: string; // the word / habit / gesture itself
  kind: LexiconKind;
  meaning?: string; // what it usually signals, in the user's own words
}

/** One fact about the person's daily life: where he lives (area only), work, routine, places he goes. */
export interface LifeFact {
  id: string;
  kind: LifeFactKind;
  text: string;
  detail?: string; // how often / when
  source?: FactSource;
}

/** One thing about the user, and whether this person knows it. */
export interface KnowledgeItem {
  id: string;
  text: string;
  status: KnowledgeStatus;
  source?: KnowledgeSource;
  via?: string; // who passed it on to him, if known
}

/** Someone in the person's life who matters to the user. */
export interface CircleMember {
  id: string;
  name: string;
  relation: string; // his relation to this person (brother, boss...)
  tieToMe?: string; // how that person relates to the user
  influence?: InfluenceLevel; // does he listen to them? unset = not rated
  linkedDossierId?: string; // another file in the archive
}

export interface ChangeNote {
  id: string;
  date: string;
  text: string;
}

export interface ChangesReport {
  analysisText: string;
  lastGenerated?: string;
  changeLog?: ChangeNote[]; // personality changes the user logged directly (e.g. via Quick Capture)
}

export interface PredictionEntry {
  id: string;
  date: string;
  scenario: string;
  predictedReaction: string;
  actualOutcome?: string;
  verdict: PredictionVerdict;
  evaluatedAt?: string;
  learnedInsight?: string; // pattern the AI extracted when the prediction was marked correct
  learnedNoteId?: string; // id of the auto-added timeline entry
}

/** One daily check-in in the user's own file ("my diary"). */
export interface JournalEntry {
  id: string;
  date: string; // YYYY-MM-DD
  mood: number; // 1 (bad) .. 5 (great)
  energy: number; // 1 (empty) .. 5 (full)
  text: string;
  tags?: string[]; // what the day was about: work, family, a person's name...
}

export type GoalStatus = 'active' | 'done' | 'paused';

export interface GoalItem {
  id: string;
  text: string;
  status: GoalStatus;
  createdAt: string;
  targetDate?: string;
  note?: string;
}

export interface PersonDossier {
  id: string;
  name: string;
  codeName?: string;
  photoUrl: string; // legacy / external URL fallback
  photoPath?: string; // path inside the private Supabase `photos` bucket
  photoRev?: number; // bumps when the photo is replaced (forces reload)
  relationship: string;
  occupation: string;
  age: string | number;
  knownSince: string;
  emotionalStability: number; // 1 to 5
  personalitySummary: string;
  latestObservationQuote?: string;
  createdAt: string;
  updatedAt: string;
  folderColor?: string;
  mind: MindThinking;
  triggers: TriggerItem[];
  comforts: ComfortItem[];
  timeline: TimelineEntry[];
  lexicon?: LexiconItem[];
  life?: LifeFact[];
  knowledge?: KnowledgeItem[];
  circle?: CircleMember[];
  /** true for the user's own file: pinned first, with the extra diary / goals / "how others see me" pages. */
  isSelf?: boolean;
  journal?: JournalEntry[];
  goals?: GoalItem[];
  changesOverTime: ChangesReport;
  predictions: PredictionEntry[];
}
