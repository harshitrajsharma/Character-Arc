export const PROGRESS_MODES = ["learning", "revision", "practice", "test"] as const;

export type ProgressMode = (typeof PROGRESS_MODES)[number];
export type FoundationLevel = "Beginner" | "Moderate" | "Advanced";

export interface ProgressStats {
  totalTopics: number;
  completedTopics: number;
  percentage: number;
}

export interface TopicProgress {
  learning: number;
  revision: number;
  practice: number;
  test: number;
}

export interface ChapterProgress extends TopicProgress {
  overall: number;
  stats: Record<ProgressMode, ProgressStats>;
}

export interface SubjectProgress extends TopicProgress {
  overall: number;
  foundationLevel: FoundationLevel;
  expectedMarks: number;
  stats: Record<ProgressMode, ProgressStats>;
}

export type ProgressRollup = TopicProgress & {
  overall: number;
};

export type ProgressField =
  | "overallProgress"
  | "learningProgress"
  | "revisionProgress"
  | "practiceProgress"
  | "testProgress";
