import type { ProgressMode, ProgressRollup, ProgressStats, TopicProgress } from "@/types/progressapp/domain";
import type { SubjectProgressPolicy } from "./policy"
import { DEFAULT_SUBJECT_PROGRESS_POLICY } from "./policy"

export interface ProgressTopic {
  important: boolean;
  learningStatus: boolean;
  revisionCount: number;
  practiceCount: number;
  testCount: number;
  targetRevisions?: number;
  targetPractices?: number;
}

export const DEFAULT_PROGRESS_TARGET = 3;
export const IMPORTANT_PROGRESS_TARGET = 5;
export const IMPORTANT_TOPIC_PROGRESS_WEIGHT = 1.5;

export const PROGRESS_MODE_WEIGHTS: Record<ProgressMode, number> = {
  learning: 0.25,
  revision: 0.3,
  practice: 0.3,
  test: 0.15,
};

function roundProgress(value: number): number {
  return Math.round(value * 10) / 10;
}

export function getRequiredRevisions(topic: Pick<ProgressTopic, "important" | "targetRevisions">, policy: SubjectProgressPolicy = DEFAULT_SUBJECT_PROGRESS_POLICY): number {
  return topic.targetRevisions ?? (topic.important ? policy.highYieldRevisionTarget : policy.revisionTarget);
}

export function getRequiredPractices(topic: Pick<ProgressTopic, "important" | "targetPractices">, policy: SubjectProgressPolicy = DEFAULT_SUBJECT_PROGRESS_POLICY): number {
  return topic.targetPractices ?? (topic.important ? policy.highYieldPracticeTarget : policy.practiceTarget);
}

export function getRequiredTests(topic: Pick<ProgressTopic, "important">): number {
  return topic.important ? IMPORTANT_PROGRESS_TARGET : DEFAULT_PROGRESS_TARGET;
}

export function getTopicProgressWeight(topic: Pick<ProgressTopic, "important">): number {
  return topic.important ? IMPORTANT_TOPIC_PROGRESS_WEIGHT : 1;
}

export function getTopicModeCount(topic: ProgressTopic, mode: ProgressMode): number {
  switch (mode) {
    case "learning":
      return topic.learningStatus ? 1 : 0;
    case "revision":
      return topic.revisionCount;
    case "practice":
      return topic.practiceCount;
    case "test":
      return topic.testCount;
  }
}

export function isTopicModeCompleted(topic: ProgressTopic, mode: ProgressMode, policy: SubjectProgressPolicy = DEFAULT_SUBJECT_PROGRESS_POLICY): boolean {
  if (mode === "learning") return topic.learningStatus;
  const count = getTopicModeCount(topic, mode);
  if (mode === "revision") return count >= getRequiredRevisions(topic, policy);
  if (mode === "practice") return count >= getRequiredPractices(topic, policy);
  if (mode === "test") return count >= getRequiredTests(topic);
  return false;
}

export function calculateTopicProgress(topic: ProgressTopic, policy: SubjectProgressPolicy = DEFAULT_SUBJECT_PROGRESS_POLICY, testProgress = 0): TopicProgress {
  const reqRevisions = getRequiredRevisions(topic, policy);
  const reqPractices = getRequiredPractices(topic, policy);

  return {
    learning: topic.learningStatus ? 100 : 0,
    revision: Math.min(topic.revisionCount, reqRevisions) / reqRevisions * 100,
    practice: Math.min(topic.practiceCount, reqPractices) / reqPractices * 100,
    test: testProgress,
  };
}

export function calculateProgressStats(
  topics: ProgressTopic[],
  mode: ProgressMode,
  policy: SubjectProgressPolicy = DEFAULT_SUBJECT_PROGRESS_POLICY
): ProgressStats {
  if (topics.length === 0) {
    return { totalTopics: 0, completedTopics: 0, percentage: 0 };
  }

  let totalProgress = 0;
  let completedTopics = 0;

  for (const topic of topics) {
    const progress = calculateTopicProgress(topic, policy)[mode] / 100;
    totalProgress += progress;
    if (isTopicModeCompleted(topic, mode, policy)) completedTopics++;
  }

  return {
    totalTopics: topics.length,
    completedTopics,
    percentage: roundProgress((totalProgress / topics.length) * 100),
  };
}

export function calculateWeightedOverallProgress(progress: TopicProgress): number {
  return roundProgress(
    (progress.learning * PROGRESS_MODE_WEIGHTS.learning) +
    (progress.revision * PROGRESS_MODE_WEIGHTS.revision) +
    (progress.practice * PROGRESS_MODE_WEIGHTS.practice) +
    (progress.test * PROGRESS_MODE_WEIGHTS.test)
  );
}

function calculateWeightedTopicsOverall(topics: ProgressTopic[], policy: SubjectProgressPolicy, testProgress: number): number {
  if (topics.length === 0) return 0;

  let totalWeight = 0;
  let weightedProgress = 0;

  for (const topic of topics) {
    const topicWeight = getTopicProgressWeight(topic);
    totalWeight += topicWeight;
    weightedProgress += calculateWeightedOverallProgress(calculateTopicProgress(topic, policy, testProgress)) * topicWeight;
  }

  return totalWeight > 0 ? roundProgress(weightedProgress / totalWeight) : 0;
}

export function calculateProgressRollup(topics: ProgressTopic[], policy: SubjectProgressPolicy = DEFAULT_SUBJECT_PROGRESS_POLICY, testProgress = 0): ProgressRollup {
  const learning = calculateProgressStats(topics, "learning", policy).percentage;
  const revision = calculateProgressStats(topics, "revision", policy).percentage;
  const practice = calculateProgressStats(topics, "practice", policy).percentage;
  const test = testProgress;

  return {
    learning,
    revision,
    practice,
    test,
    overall: calculateWeightedTopicsOverall(topics, policy, testProgress),
  };
}

export function calculateSubjectProgressRollup(chapters: { topics: ProgressTopic[] }[]): ProgressRollup {
  const topics = chapters.flatMap((chapter) => chapter.topics);

  if (topics.length === 0) {
    return { learning: 0, revision: 0, practice: 0, test: 0, overall: 0 };
  }

  return calculateProgressRollup(topics);
}

export function getProgressField(mode: ProgressMode) {
  return `${mode}Progress` as const;
}

export function toProgressUpdateData(rollup: ProgressRollup) {
  return {
    learningProgress: rollup.learning,
    revisionProgress: rollup.revision,
    practiceProgress: rollup.practice,
    testProgress: rollup.test,
    overallProgress: rollup.overall,
  };
}
