"use client"

import { useCallback, useState } from "react"
import { Settings2Icon, ExternalLinkIcon } from "lucide-react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
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
        className="h-9 shrink-0 gap-1.5 rounded-full px-3"
        onClick={() => setOpen(true)}
        aria-label="Subject settings"
      >
        <Settings2Icon aria-hidden="true" />
        <span className="hidden sm:inline">Settings</span>
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          className="flex flex-col p-0 sm:max-w-none! data-[side=right]:sm:w-[clamp(28rem,42vw,42.5rem)]!"
          showCloseButton={true}
        >
          <SheetHeader className="shrink-0 border-b border-border/60 px-5 pt-4 pb-3">
            {/* pr-10 keeps the link clear of the sheet's close button (top-4 right-4) */}
            <div className="flex items-center justify-between gap-3 pr-10">
              <div className="flex items-center gap-1.5 text-xs font-semibold tracking-wider text-brand-neon-ink">
                <Settings2Icon className="size-3.5" aria-hidden="true" />
                Subject settings
              </div>
              <Button
                render={<Link href={fullPageHref} />}
                variant="ghost"
                size="sm"
                className="h-8 gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
              >
                <span className="hidden sm:inline">Open full page</span>
                <ExternalLinkIcon className="size-3.5" aria-hidden="true" />
              </Button>
            </div>
            <SheetTitle className="mt-1 text-lg leading-tight font-semibold">
              {subject.name}
            </SheetTitle>
            <SheetDescription className="mt-0.5 text-xs text-muted-foreground">
              Applies to every exam that uses this subject.
            </SheetDescription>
          </SheetHeader>

          <SubjectSettingsForm
            workspaceSlug={workspaceSlug}
            subject={subject}
            presentation="sheet"
            onCancel={closeSheet}
            onSaved={closeSheet}
          />
        </SheetContent>
      </Sheet>
    </>
  )
}
