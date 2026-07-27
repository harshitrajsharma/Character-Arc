"use client"

import { useCallback, useState } from "react"
import { Settings2Icon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { DetailSheet } from "@/components/ui/detail-sheet"
import { workspaceRoutes } from "@/lib/routes/workspace-tools"
import type { SubjectWithRelations } from "@/types/progressapp/domain"

import { SubjectSettingsForm } from "./subject-settings-form"

type SubjectSettingsSheetProps = {
  workspaceSlug: string
  examId: string
  subject: SubjectWithRelations
}

export function SubjectSettingsSheet({
  workspaceSlug,
  examId,
  subject,
}: SubjectSettingsSheetProps) {
  const [open, setOpen] = useState(false)
  const closeSheet = useCallback(() => setOpen(false), [])
  const fullPageHref = workspaceRoutes.examPrep.subjectSettings(
    workspaceSlug,
    subject.id,
    examId
  )

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-10 gap-1.5 rounded-full px-3"
        onClick={() => setOpen(true)}
      >
        <Settings2Icon aria-hidden="true" />
        <span>Settings</span>
      </Button>
      <DetailSheet
        open={open}
        onOpenChange={setOpen}
        eyebrow={
          <span className="truncate font-medium text-brand-neon-ink">
            {subject.name}
          </span>
        }
        title="Subject settings"
        description="These targets belong to this subject and apply in every exam that uses it."
        icon={
          <Settings2Icon
            className="text-brand-neon-ink"
            aria-hidden="true"
          />
        }
        metadata={
          <span>
            Shared subject rules ·{" "}
            {subject.chapterCount ?? subject.chapters.length} chapters
          </span>
        }
        fullPageHref={fullPageHref}
        contentClassName="space-y-8"
        floating
        headerDensity="compact"
      >
        <SubjectSettingsForm
          workspaceSlug={workspaceSlug}
          subject={subject}
          presentation="sheet"
          onCancel={closeSheet}
          onSaved={closeSheet}
        />
      </DetailSheet>
    </>
  )
}
