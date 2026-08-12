"use client"

import Link from "next/link"
import { ArrowLeft, Settings } from "lucide-react"
import { workspaceRoutes } from "@/lib/routes/workspace-tools"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { SubjectWithRelations } from "@/types/progressapp/domain"
import { SubjectSettingsSheet } from "./settings/subject-settings-sheet"

export function SubjectHeader({
  workspaceSlug,
  examId,
  subject,
  settingsPresentation = "sheet",
}: {
  workspaceSlug: string
  examId: string
  subject: SubjectWithRelations
  settingsPresentation?: "sheet" | "link" | "none"
}) {
  const chaptersCount = subject.chapterCount ?? subject.chapters?.length ?? 0
  const topicsCount =
    subject.topicCount ??
    subject.chapters?.reduce(
      (acc, chap) => acc + (chap.topicCount ?? chap.topics?.length ?? 0),
      0
    ) ??
    0

  return (
    <div className="flex items-center gap-1.5 md:gap-4">
      <Button
        render={
          <Link href={workspaceRoutes.examPrep.exam(workspaceSlug, examId)} />
        }
        variant="ghost"
        size="icon"
        className="size-10 shrink-0 self-center md:size-9"
        aria-label="Back to exam"
      >
        <ArrowLeft aria-hidden="true" />
      </Button>

      <div className="w-full min-w-0 space-y-1">
        <div className="flex items-center justify-between gap-3">
          <h1 className="min-w-0 flex-1 truncate text-lg font-bold md:text-2xl">
            {subject.name}
          </h1>

          {settingsPresentation === "sheet" ? (
            <SubjectSettingsSheet
              workspaceSlug={workspaceSlug}
              examId={examId}
              subject={subject}
            />
          ) : null}
          {settingsPresentation === "link" ? (
            <Button
              render={
                <Link
                  href={workspaceRoutes.examPrep.subjectSettings(
                    workspaceSlug,
                    subject.id,
                    examId
                  )}
                />
              }
              variant="secondary"
              className="h-9 shrink-0 gap-1.5 rounded-full px-3"
              aria-label="Subject settings"
            >
              <Settings data-icon="inline-start" aria-hidden="true" />
              <span className="hidden sm:inline">Settings</span>
            </Button>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground md:text-sm">
          <Badge
            variant="secondary"
            className="px-2 py-0.5 text-xs font-normal md:text-sm"
          >
            {subject.weightage}% weightage
          </Badge>
          <span aria-hidden>&bull;</span>
          <span>
            {chaptersCount} chapters &bull; {topicsCount} topics
          </span>
        </div>
      </div>
    </div>
  )
}
