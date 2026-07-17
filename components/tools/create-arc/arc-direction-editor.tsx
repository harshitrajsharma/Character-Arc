"use client"

import { MapPinIcon, TargetIcon } from "lucide-react"

import { MarkdownFieldEditor } from "@/components/editor/markdown-field-editor"
import type {
  ArcDraft,
  ArcFieldErrors,
  UpdateArcDraft,
} from "@/components/tools/create-arc/arc-form-types"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { toFieldErrorItems } from "@/lib/forms/field-errors"

type ArcDirectionEditorProps = {
  draft: ArcDraft
  errors?: ArcFieldErrors
  onChange: UpdateArcDraft
  mode?: "create" | "edit"
}

export function ArcDirectionEditor({
  draft,
  errors,
  onChange,
  mode = "create",
}: ArcDirectionEditorProps) {
  const editing = mode === "edit"

  return (
    <>
      <header className="mb-2 flex items-center justify-between gap-4">
        <p className="text-sm font-medium text-brand-neon-ink">
          {editing ? "Edit Arc" : "Create new Arc"}
        </p>
        <span className="text-xs text-muted-foreground">
          {editing ? "Keep the direction honest" : "Start with one direction"}
        </span>
      </header>
      <h1 className="sr-only">{editing ? "Edit arc" : "Create a new arc"}</h1>

      <Field className="gap-1" data-invalid={Boolean(errors?.title)}>
        <FieldLabel htmlFor="title" className="sr-only">
          Arc name
        </FieldLabel>
        <Input
          id="title"
          name="title"
          value={draft.title}
          onChange={(event) => onChange("title", event.target.value)}
          maxLength={120}
          className="h-auto rounded-none border-0 bg-transparent px-0 py-2 font-heading text-3xl leading-tight font-semibold shadow-none placeholder:text-foreground/28 focus-visible:border-transparent focus-visible:ring-0 md:text-4xl dark:bg-transparent"
          placeholder="Give this arc a name."
          required
          autoFocus={!editing}
          aria-invalid={Boolean(errors?.title)}
        />
        <FieldDescription className="flex justify-between gap-4">
          <span>Short enough to recognize at a glance.</span>
          <span className="shrink-0 font-mono text-xs tabular-nums">
            {draft.title.length}/120
          </span>
        </FieldDescription>
        <FieldError errors={toFieldErrorItems(errors?.title)} />
      </Field>

      <div className="mt-6 flex flex-col gap-3">
        <MarkdownFieldEditor
          id="objective"
          name="objective"
          label="Goal: What are you moving toward?"
          description="Describe the outcome you want to make true."
          value={draft.objective}
          onChange={(markdown) => onChange("objective", markdown)}
          placeholder="Describe the outcome you want to make true. Type / for blocks."
          emptyPreview="Add the outcome that defines the direction."
          icon={TargetIcon}
          maxLength={4000}
          errors={errors?.objective}
        />

        <MarkdownFieldEditor
          id="currentReality"
          name="currentReality"
          label="Current Reality: Where are you now?"
          description="Describe the honest starting point for future planning."
          value={draft.currentReality}
          onChange={(markdown) => onChange("currentReality", markdown)}
          placeholder="Describe the honest starting point. Type / for blocks."
          emptyPreview="Add the facts that your plan needs to start from."
          icon={MapPinIcon}
          maxLength={8000}
          errors={errors?.currentReality}
        />
      </div>
    </>
  )
}
