"use client"

import { useCallback, useState } from "react"
import { Settings2Icon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DetailSheet } from "@/components/ui/detail-sheet"
import type { SubjectWithRelations } from "@/types/progressapp/domain"

import { SubjectSettingsForm } from "./subject-settings-form"

import { workspaceRoutes } from "@/lib/routes/workspace-tools"

export function SubjectSettingsSheet({ workspaceSlug, examId, subject }: { workspaceSlug: string, examId: string; subject: SubjectWithRelations }) {
  const [open, setOpen] = useState(false)
  const closeSheet = useCallback(() => setOpen(false), [])
  const fullPageHref = workspaceRoutes.examPrep.subjectSettings(workspaceSlug, examId, subject.id)

  return (
    <>
      <Button type="button" variant="outline" size="sm" className="h-10 gap-1.5 rounded-full px-3" onClick={() => setOpen(true)}>
        <Settings2Icon aria-hidden="true" />
        <span className="hidden sm:inline">Settings</span>
      </Button>
      <DetailSheet
        open={open}
        onOpenChange={setOpen}
        eyebrow="Subject settings"
        title={subject.name}
        description="Choose the targets that turn preparation activity into meaningful progress."
        icon={<Settings2Icon aria-hidden="true" />}
        badges={<Badge variant="secondary">{subject.weightage} marks</Badge>}
        metadata={`${subject.chapterCount ?? subject.chapters.length} chapters`}
        fullPageHref={fullPageHref}
        contentClassName="space-y-8"
      >
        <SubjectSettingsForm
          workspaceSlug={workspaceSlug}
          examId={examId}
          subject={subject}
          presentation="sheet"
          onCancel={closeSheet}
          onSaved={closeSheet}
        />
      </DetailSheet>
    </>
  )
}
