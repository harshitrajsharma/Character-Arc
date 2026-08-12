"use client"

import { useActionState, useState } from "react"

import {
  createArcAction,
  type CreateArcActionState,
} from "@/lib/tools/goals-paths/actions"
import { ArcCoverPreview } from "@/components/tools/create-arc/arc-cover-preview"
import { ArcDirectionEditor } from "@/components/tools/create-arc/arc-direction-editor"
import { ArcFormActions } from "@/components/tools/create-arc/arc-form-actions"
import { ArcFormSuccess } from "@/components/tools/create-arc/arc-form-success"
import { ArcFormToolbar } from "@/components/tools/create-arc/arc-form-toolbar"
import {
  EMPTY_ARC_DRAFT,
  type ArcDraft,
} from "@/components/tools/create-arc/arc-form-types"
import { ArcOptionalContext } from "@/components/tools/create-arc/arc-optional-context"
import { ArcThemePicker } from "@/components/tools/create-arc/arc-theme-picker"
import {
  getArcTheme,
  type ArcThemeKey,
} from "@/components/tools/create-arc/arc-themes"
import { cn } from "@/lib/utils"

const initialState: CreateArcActionState = { status: "idle", message: "" }

type CreateArcFormProps = {
  workspaceId: string
  installationId: string
  workspaceSlug: string
  idempotencyKey: string
}

export function CreateArcForm({
  workspaceId,
  installationId,
  workspaceSlug,
  idempotencyKey,
}: CreateArcFormProps) {
  const [state, formAction, pending] = useActionState(
    createArcAction.bind(null, workspaceSlug),
    initialState
  )
  const [draft, setDraft] = useState<ArcDraft>(EMPTY_ARC_DRAFT)
  const [themeKey, setThemeKey] = useState<ArcThemeKey>("signal")
  const [optionalOpen, setOptionalOpen] = useState(false)
  const theme = getArcTheme(themeKey)
  const optionalHasErrors = Boolean(
    state.fieldErrors?.why ||
    state.fieldErrors?.targetDate ||
    state.fieldErrors?.constraints
  )

  function updateDraft<Key extends keyof ArcDraft>(
    key: Key,
    value: ArcDraft[Key]
  ) {
    setDraft((current) => ({ ...current, [key]: value }))
  }

  if (state.status === "success") {
    return (
      <ArcFormSuccess
        message={state.message}
        rootBlockId={state.rootBlockId}
        workspaceSlug={workspaceSlug}
      />
    )
  }

  return (
    <form
      action={formAction}
      className={cn(
        "min-h-svh transition-colors duration-300",
        theme.canvasClass
      )}
    >
      <input type="hidden" name="workspaceId" value={workspaceId} />
      <input type="hidden" name="installationId" value={installationId} />
      <input type="hidden" name="idempotencyKey" value={idempotencyKey} />

      <ArcFormToolbar workspaceSlug={workspaceSlug} />

      <div className="mx-auto grid w-full max-w-6xl items-start gap-10 px-4 pb-12 sm:px-6 lg:grid-cols-[22rem_minmax(0,1fr)] lg:gap-14 lg:px-8 lg:pb-16 xl:grid-cols-[24rem_minmax(0,1fr)] xl:gap-16 xl:px-10">
        <aside className="flex min-w-0 flex-col gap-5 lg:sticky lg:top-20">
          <ArcCoverPreview
            theme={theme}
            title={draft.title}
            objective={draft.objective}
            currentReality={draft.currentReality}
            targetDate={draft.targetDate}
          />
          <ArcThemePicker value={themeKey} onChange={setThemeKey} />
        </aside>

        <div className="min-w-0 pt-1">
          <ArcDirectionEditor
            draft={draft}
            errors={state.fieldErrors}
            onChange={updateDraft}
          />
          <ArcOptionalContext
            draft={draft}
            errors={state.fieldErrors}
            open={optionalOpen || optionalHasErrors}
            onOpenChange={setOptionalOpen}
            onChange={updateDraft}
          />
          <ArcFormActions
            pending={pending}
            errorMessage={state.status === "error" ? state.message : undefined}
          />
        </div>
      </div>
    </form>
  )
}
