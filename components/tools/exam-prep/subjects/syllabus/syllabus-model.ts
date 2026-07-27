import { getRequiredRevisions, getRequiredPractices } from "@/lib/tools/exam-prep/progress/rules"
import type { BaseTopic, ChapterWithRelations } from "@/types/progressapp/domain"
import type { SubjectProgressPolicy } from "@/lib/tools/exam-prep/progress/policy"

export type SyllabusStage = "learning" | "revision" | "practice" | "test"

export type SyllabusItemUpdate = {
  name: string
  important: boolean
}

export function getTopicStageCount(topic: BaseTopic, stage: SyllabusStage) {
  if (stage === "learning") return topic.learningStatus ? 1 : 0
  if (stage === "revision") return topic.revisionCount
  if (stage === "practice") return topic.practiceCount
  return topic.testCount
}

export function getChapterStageProgress(chapter: ChapterWithRelations, stage: SyllabusStage, policy?: SubjectProgressPolicy) {
  if (stage === "test") return chapter.testProgress
  if (chapter.topics.length === 0) return 0

  const total = chapter.topics.reduce((progress, topic) => {
    if (stage === "learning") return progress + (topic.learningStatus ? 1 : 0)
    
    let required = 1;
    if (stage === "revision") required = getRequiredRevisions(topic, policy);
    if (stage === "practice") required = getRequiredPractices(topic, policy);
    return progress + Math.min(getTopicStageCount(topic, stage), required) / required
  }, 0)

  return Math.round((total / chapter.topics.length) * 100)
}

export function applyTopicProgress(
  topic: BaseTopic,
  stage: SyllabusStage,
  value: boolean | number,
  recordedAt: Date = new Date()
): BaseTopic {
  if (stage === "learning") {
    const learned = value === true
    return {
      ...topic,
      learningStatus: learned,
      learningCompletedAt: learned
        ? topic.learningStatus && topic.learningCompletedAt
          ? topic.learningCompletedAt
          : recordedAt
        : null,
    }
  }
  
  // We allow infinite increment up to a max cap of 100 so the app doesn't break
  const numValue = Math.min(Math.max(Number(value), 0), 100)
  
  if (stage === "revision") {
    return {
      ...topic,
      revisionCount: numValue,
      lastRevised: numValue > topic.revisionCount ? recordedAt : topic.lastRevised,
    }
  }
  if (stage === "practice") {
    return {
      ...topic,
      practiceCount: numValue,
      lastPracticed: numValue > topic.practiceCount ? recordedAt : topic.lastPracticed,
    }
  }
  return { ...topic, testCount: numValue }
}

export function applyTopicUpdate(topic: BaseTopic, update: SyllabusItemUpdate): BaseTopic {
  return {
    ...topic,
    ...update,
    // We no longer reduce the count when making it not-important. Users can keep their progress.
  }
}
