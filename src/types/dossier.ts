export type ConfidenceLevel = 'low' | 'medium' | 'high';

export type ObservationType = 'incident' | 'conversation' | 'impression';
export type ObservationSource = 'seen' | 'inferred';

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
}

export interface ChangesReport {
  analysisText: string;
  lastGenerated?: string;
}

export interface PredictionEntry {
  id: string;
  date: string;
  scenario: string;
  predictedReaction: string;
  actualOutcome?: string;
  verdict: PredictionVerdict;
  evaluatedAt?: string;
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
  changesOverTime: ChangesReport;
  predictions: PredictionEntry[];
}
