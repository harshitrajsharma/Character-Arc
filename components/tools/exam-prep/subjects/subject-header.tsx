"use client"

import Link from "next/link"
import { ArrowLeft, Settings } from "lucide-react"
import { workspaceRoutes } from "@/lib/routes/workspace-tools"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { SubjectWithRelations } from "@/types/progressapp/domain"
import { SubjectSettingsSheet } from "./subject-settings-sheet"

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
  const topicsCount = subject.topicCount ?? subject.chapters?.reduce((acc, chap) => acc + (chap.topicCount ?? chap.topics?.length ?? 0), 0) ?? 0

  return (
    <div className="flex items-center gap-1.5 md:gap-4">
      <Button
        render={<Link href={workspaceRoutes.examPrep.exam(workspaceSlug, examId)} />}
        variant="ghost"
        size="icon"
        className="h-10 w-10 shrink-0 rounded-full"
        aria-label="Back to exam"
      >
          <ArrowLeft className="h-4 w-4 md:h-5 md:w-5" />
      </Button>

      <div className="w-full min-w-0 space-y-0.5 md:space-y-1">
        <div className="flex w-full flex-wrap items-center justify-between gap-1.5 md:gap-2">
          <h1 className="line-clamp-1 text-lg font-bold md:text-2xl">{subject.name}</h1>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="px-1.5 py-0 text-[10px] font-normal md:px-2.5 md:py-0.5 md:text-sm">
              {subject.weightage} marks
            </Badge>
            {settingsPresentation === "sheet" ? <SubjectSettingsSheet workspaceSlug={workspaceSlug} examId={examId} subject={subject} /> : null}
            {settingsPresentation === "link" ? (
              <Button
                render={<Link href={workspaceRoutes.examPrep.subjectSettings(workspaceSlug, examId, subject.id)} />}
                variant="outline"
                size="sm"
                className="h-10 gap-1.5 rounded-full px-3"
              >
                <Settings className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="hidden sm:inline">Settings</span>
              </Button>
            ) : null}
          </div>
        </div>
        <p className="text-xs text-muted-foreground md:text-base">
          {chaptersCount} chapters &bull; {topicsCount} topics
        </p>
      </div>
    </div>
  )
}
