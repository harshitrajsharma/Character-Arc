"use client"

import { useState } from "react"
import { DndContext, closestCenter } from "@dnd-kit/core"
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { BookOpenIcon, CalendarIcon } from "lucide-react"

import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Button } from "@/components/ui/button"
import { SubjectTestPlannerDialog } from "../tests/subject-test-planner-dialog"

import { AddChapterDialog } from "../dialogs/add-chapter-dialog"
import { SyllabusChapterCard } from "./syllabus-chapter-card"
import { SyllabusStageSelector } from "./syllabus-stage-selector"
import { useSubjectSyllabus } from "./use-subject-syllabus"
import { useSubjectProgress } from "../subject-progress-context"
import type { NavigationTarget } from "../recommendations"

import type { SyllabusStage } from "./syllabus-model"

type SubjectSyllabusProps = {
  workspaceSlug: string
  examId: string
  stage: SyllabusStage
  onStageChange: (stage: SyllabusStage) => void
  navigationTarget?: NavigationTarget | null
  onNavigationComplete?: () => void
  localDate?: string
}

export function SubjectSyllabus({
  workspaceSlug,
  examId,
  stage,
  onStageChange,
  navigationTarget,
  onNavigationComplete,
  localDate,
}: SubjectSyllabusProps) {
  const { subject, upsertScheduledTest } = useSubjectProgress()
  const syllabus = useSubjectSyllabus(workspaceSlug, stage, onStageChange)
  const [isSchedulePlannerOpen, setIsSchedulePlannerOpen] = useState(false)

  return (
    <section className="flex flex-col gap-4" aria-labelledby="syllabus-heading">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-brand-violet-ink">Syllabus</p>
          <h2
            id="syllabus-heading"
            className="font-heading text-2xl font-semibold"
          >
            Chapters and topics
          </h2>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            type="button"
            className="border-brand-violet-line bg-brand-violet-soft text-brand-violet-ink hover:bg-brand-violet hover:text-white"
            variant="outline"
            onClick={() => setIsSchedulePlannerOpen(true)}
          >
            <CalendarIcon data-icon="inline-start" />
            Schedule a test
          </Button>
          <AddChapterDialog
            workspaceSlug={workspaceSlug}
            examId={examId}
            subjectId={subject.id}
          />
        </div>
      </div>

      <SyllabusStageSelector
        value={syllabus.stage}
        onChange={syllabus.setStage}
      />

      {syllabus.chapters.length > 0 ? (
        <DndContext
          id="dnd-context-chapters"
          sensors={syllabus.chapterSensors}
          collisionDetection={closestCenter}
          onDragEnd={syllabus.handleChapterDragEnd}
        >
          <SortableContext
            items={syllabus.chapters.map((chapter) => chapter.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="flex flex-col gap-3">
              {syllabus.chapters.map((chapter) => (
                <SyllabusChapterCard
                  key={chapter.id}
                  workspaceSlug={workspaceSlug}
                  examId={examId}
                  subjectId={subject.id}
                  chapter={chapter}
                  progressPolicy={subject.progressPolicy}
                  stage={syllabus.stage}
                  pendingTopicIds={syllabus.pendingTopicIds}
                  navigationTarget={navigationTarget}
                  onNavigationComplete={onNavigationComplete}
                  onTopicsChange={syllabus.updateTopics}
                  onTopicProgress={syllabus.handleTopicProgress}
                  onChapterUpdate={syllabus.handleChapterUpdate}
                  onChapterDelete={syllabus.handleChapterDelete}
                  onTopicUpdate={syllabus.handleTopicUpdate}
                  onTopicDelete={syllabus.handleTopicDelete}
                  localDate={localDate}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      ) : (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <BookOpenIcon />
            </EmptyMedia>
            <EmptyTitle>Build this subject&apos;s syllabus</EmptyTitle>
            <EmptyDescription>
              Add chapters first, then break each chapter into trackable topics.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <AddChapterDialog
              workspaceSlug={workspaceSlug}
              examId={examId}
              subjectId={subject.id}
            />
          </EmptyContent>
        </Empty>
      )}

      {isSchedulePlannerOpen ? (
        <SubjectTestPlannerDialog
          open={isSchedulePlannerOpen}
          onOpenChange={setIsSchedulePlannerOpen}
          workspaceSlug={workspaceSlug}
          examId={examId}
          subjectId={subject.id}
          subjectName={subject.name}
          chapters={subject.chapters || []}
          onSuccess={upsertScheduledTest}
        />
      ) : null}
    </section>
  )
}
