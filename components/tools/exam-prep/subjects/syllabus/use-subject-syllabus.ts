"use client"

import { useState } from "react"
import {
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import { arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable"
import { toast } from "sonner"

import {
  deleteSyllabusItemAction,
  reorderChaptersAction,
  setTopicProgressAction,
  updateSyllabusItemAction,
  updateTopicStageAction,
} from "@/lib/tools/exam-prep/actions/syllabus-actions"
import { celebrateChapterCompletion, celebrateTopicCompletion } from "@/lib/ui/confetti"
import type { BaseTopic } from "@/types/progressapp/domain"

import {
  applyTopicProgress,
  applyTopicUpdate,
  type SyllabusItemUpdate,
  type SyllabusStage,
} from "./syllabus-model"
import { useSubjectProgress } from "../subject-progress-context"

export function useSubjectSyllabus(
  workspaceSlug: string,
  stage: SyllabusStage,
  onStageChange: (stage: SyllabusStage) => void
) {
  const { subject, updateChapters } = useSubjectProgress()
  const setStage = onStageChange
  const chapters = subject.chapters
  const [pendingTopicIds, setPendingTopicIds] = useState<Set<string>>(() => new Set())
  const chapterSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  function updateTopics(chapterId: string, topics: BaseTopic[]) {
    updateChapters((current) => current.map((chapter) => chapter.id === chapterId ? { ...chapter, topics } : chapter))
  }

  async function handleChapterDragEnd(event: DragEndEvent) {
    if (!event.over || event.active.id === event.over.id) return
    const oldIndex = chapters.findIndex((chapter) => chapter.id === event.active.id)
    const newIndex = chapters.findIndex((chapter) => chapter.id === event.over?.id)
    if (oldIndex < 0 || newIndex < 0) return

    const previousChapters = chapters
    const nextChapters = arrayMove(chapters, oldIndex, newIndex).map((chapter, position) => ({ ...chapter, position }))
    updateChapters(nextChapters)

    try {
      await reorderChaptersAction({ workspaceSlug, subjectId: subject.id, chapterIds: nextChapters.map((chapter) => chapter.id) })
    } catch (error) {
      updateChapters(previousChapters)
      toast.error(error instanceof Error ? error.message : "Could not save the chapter order.")
    }
  }

  async function handleChapterUpdate(chapterId: string, update: SyllabusItemUpdate) {
    const previousChapter = chapters.find((chapter) => chapter.id === chapterId)
    if (!previousChapter) return

    updateChapters((current) => current.map((chapter) => chapter.id === chapterId ? { ...chapter, ...update } : chapter))
    try {
      await updateSyllabusItemAction({ workspaceSlug, kind: "chapter", id: chapterId, name: update.name, important: update.important })
    } catch (error) {
      updateChapters((current) => current.map((chapter) => chapter.id === chapterId ? previousChapter : chapter))
      toast.error(error instanceof Error ? error.message : "Could not update the chapter.")
      throw error
    }
  }

  async function handleChapterDelete(chapterId: string) {
    const previousChapters = chapters
    updateChapters((current) => current.filter((chapter) => chapter.id !== chapterId))

    try {
      await deleteSyllabusItemAction({ workspaceSlug, kind: "chapter", id: chapterId })
    } catch (error) {
      updateChapters(previousChapters)
      toast.error(error instanceof Error ? error.message : "Could not delete the chapter.")
      throw error
    }
  }

  async function handleTopicUpdate(chapterId: string, topicId: string, update: SyllabusItemUpdate) {
    const chapter = chapters.find((candidate) => candidate.id === chapterId)
    const previousTopic = chapter?.topics.find((topic) => topic.id === topicId)
    if (!chapter || !previousTopic) return

    updateTopics(chapterId, chapter.topics.map((topic) => topic.id === topicId ? applyTopicUpdate(topic, update) : topic))
    try {
      await updateSyllabusItemAction({ workspaceSlug, kind: "topic", id: topicId, name: update.name, important: update.important })
    } catch (error) {
      updateChapters((current) => current.map((currentChapter) => currentChapter.id === chapterId
        ? { ...currentChapter, topics: currentChapter.topics.map((topic) => topic.id === topicId ? previousTopic : topic) }
        : currentChapter))
      toast.error(error instanceof Error ? error.message : "Could not update the topic.")
      throw error
    }
  }

  async function handleTopicDelete(chapterId: string, topicId: string) {
    const previousTopics = chapters.find((chapter) => chapter.id === chapterId)?.topics
    if (!previousTopics) return

    updateTopics(chapterId, previousTopics.filter((topic) => topic.id !== topicId))
    try {
      await deleteSyllabusItemAction({ workspaceSlug, kind: "topic", id: topicId })
    } catch (error) {
      updateTopics(chapterId, previousTopics)
      toast.error(error instanceof Error ? error.message : "Could not delete the topic.")
      throw error
    }
  }

  async function handleTopicProgress(chapterId: string, topic: BaseTopic, value: boolean | number) {
    if (pendingTopicIds.has(topic.id)) return
    const chapter = chapters.find((candidate) => candidate.id === chapterId)
    if (!chapter) return

    const nextTopics = chapter.topics.map((candidate) => candidate.id === topic.id
      ? applyTopicProgress(candidate, stage, value)
      : candidate)
    const learnedNow = stage === "learning" && value === true && !topic.learningStatus
    const chapterWasLearned = chapter.topics.length > 0 && chapter.topics.every((candidate) => candidate.learningStatus)
    const chapterIsLearned = nextTopics.length > 0 && nextTopics.every((candidate) => candidate.learningStatus)

    setPendingTopicIds((current) => new Set(current).add(topic.id))
    updateTopics(chapterId, nextTopics)

    try {
      if (stage === "learning") {
        await updateTopicStageAction({ workspaceSlug, topicId: topic.id, stage, learned: value === true })
      } else {
        await setTopicProgressAction({ workspaceSlug, topicId: topic.id, stage, count: Number(value) })
      }
      if (learnedNow) {
        if (!chapterWasLearned && chapterIsLearned) {
          celebrateChapterCompletion()
          toast.success(`${chapter.name} complete!`, {
            description: "Every topic in this chapter is learned.",
          })
        } else {
          celebrateTopicCompletion()
          toast.success(`${topic.name} learned`, {
            description: "Nice work. Keep the momentum going.",
          })
        }
      }
    } catch (error) {
      updateChapters((current) => current.map((currentChapter) => currentChapter.id === chapterId
        ? { ...currentChapter, topics: currentChapter.topics.map((candidate) => candidate.id === topic.id ? topic : candidate) }
        : currentChapter))
      toast.error(error instanceof Error ? error.message : "Could not update topic progress.")
    } finally {
      setPendingTopicIds((current) => {
        const next = new Set(current)
        next.delete(topic.id)
        return next
      })
    }
  }

  return {
    chapterSensors,
    chapters,
    stage,
    pendingTopicIds,
    setStage,
    updateTopics,
    handleChapterDragEnd,
    handleChapterUpdate,
    handleChapterDelete,
    handleTopicUpdate,
    handleTopicDelete,
    handleTopicProgress,
  }
}
