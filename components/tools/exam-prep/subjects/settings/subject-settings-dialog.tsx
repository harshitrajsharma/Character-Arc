"use client"

import * as React from "react"
import { SlidersHorizontalIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
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

      <DialogContent
        showCloseButton
        className="flex h-[min(680px,calc(100dvh-2rem))] w-[calc(100vw-1.5rem)] max-w-4xl flex-col gap-0 overflow-hidden rounded-4xl bg-popover/60 p-0 shadow-2xl ring-1 ring-foreground/5 backdrop-blur-2xl sm:max-w-4xl dark:ring-foreground/10"
      >
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-border/60 bg-muted/20 px-5 sm:px-6">
          <div className="flex min-w-0 items-center gap-3 pr-8">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-brand-violet-soft text-brand-violet-ink shadow-xs">
              <SlidersHorizontalIcon className="size-4" aria-hidden="true" />
            </span>
            <div className="flex min-w-0 items-center gap-2">
              <DialogTitle className="truncate font-heading text-sm font-semibold text-foreground sm:text-base">
                Study Targets & Rules
              </DialogTitle>
              <span className="hidden text-muted-foreground/40 sm:inline">
                /
              </span>
              <span className="hidden max-w-[200px] truncate text-xs font-medium text-muted-foreground sm:inline">
                {subject.name}
              </span>
            </div>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <SubjectSettingsForm
            workspaceSlug={workspaceSlug}
            subject={subject}
            presentation="sheet"
            onCancel={() => onOpenChange(false)}
            onSaved={() => onOpenChange(false)}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
