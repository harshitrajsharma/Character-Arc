"use client"

import { Badge } from "@/components/ui/badge"
import type { SubjectWithRelations } from "@/types/progressapp/domain"
import { SubjectSettingsDialog } from "./settings/subject-settings-dialog"

export function SubjectHeader({
  workspaceSlug,
  examId,
  subject,
  settingsPresentation = "dialog",
}: {
  workspaceSlug: string
  examId: string
  subject: SubjectWithRelations
  settingsPresentation?: "dialog" | "none"
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
    <div className="w-full min-w-0 space-y-1.5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="min-w-0 flex-1 truncate text-xl font-bold tracking-tight md:text-2xl">
          {subject.name}
        </h1>

        {settingsPresentation !== "none" ? (
          <SubjectSettingsDialog
            workspaceSlug={workspaceSlug}
            examId={examId}
            subject={subject}
          />
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-muted-foreground md:text-sm">
        <Badge variant="secondary" className="px-2 py-0.5 text-xs font-medium">
          {subject.weightage}% weightage
        </Badge>
        <span aria-hidden className="text-muted-foreground/40">
          /
        </span>
        <span>
          {chaptersCount} chapters <span className="text-muted-foreground/40">/</span> {topicsCount} topics
        </span>
      </div>
    </div>
  )
}
