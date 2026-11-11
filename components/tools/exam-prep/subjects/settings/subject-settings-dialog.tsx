"use client"
import {
  SettingsDialogContent,
  SettingsHeader,
} from "@/components/settings/settings-layout"

import * as React from "react"
import { SlidersHorizontalIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogTrigger } from "@/components/ui/dialog"
import type { SubjectWithRelations } from "@/types/progressapp/domain"
import { SubjectSettingsForm } from "./subject-settings-form"

type SubjectSettingsDialogProps = {
  workspaceSlug: string
  examId: string
  subject: SubjectWithRelations
  trigger?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function SubjectSettingsDialog({
  workspaceSlug,
  examId: _examId,
  subject,
  trigger,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
}: SubjectSettingsDialogProps) {
  const [internalOpen, setInternalOpen] = React.useState(false)
  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : internalOpen
  const onOpenChange = isControlled ? setControlledOpen! : setInternalOpen

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger !== undefined ? (
        trigger ? (
          <DialogTrigger>{trigger}</DialogTrigger>
        ) : null
      ) : (
        <DialogTrigger
          render={
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="flex size-8 shrink-0 items-center justify-center rounded-full p-0 text-xs sm:h-8 sm:w-auto sm:gap-1.5 sm:px-3"
              aria-label="Subject targets and rules settings"
            />
          }
        >
          <SlidersHorizontalIcon className="size-3.5" aria-hidden="true" />
          <span className="hidden sm:inline">Targets & Rules</span>
        </DialogTrigger>
      )}

      <SettingsDialogContent showCloseButton>
        <SettingsHeader
          title="Study Targets & Rules"
          context={subject.name}
          icon={SlidersHorizontalIcon}
        />

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <SubjectSettingsForm
            workspaceSlug={workspaceSlug}
            subject={subject}
            presentation="sheet"
            onCancel={() => onOpenChange(false)}
            onSaved={() => onOpenChange(false)}
          />
        </div>
      </SettingsDialogContent>
    </Dialog>
  )
}
