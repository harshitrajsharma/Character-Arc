"use client"

import type { LucideIcon } from "lucide-react"
import { CheckIcon, PencilLineIcon } from "lucide-react"

import { MarkdownBlockEditor } from "@/components/editor/markdown-block-editor.dynamic"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Field, FieldError, FieldTitle } from "@/components/ui/field"
import { toFieldErrorItems } from "@/lib/forms/field-errors"
import { markdownToPlainText } from "@/lib/wiki/markdown"
import { cn } from "@/lib/utils"

type MarkdownFieldEditorProps = {
  id: string
  name: string
  label: string
  description: string
  value: string
  onChange: (markdown: string) => void
  placeholder: string
  emptyPreview: string
  icon: LucideIcon
  maxLength: number
  errors?: string[]
  iconClassName?: string
  className?: string
}

export function MarkdownFieldEditor({
  id,
  name,
  label,
  description,
  value,
  onChange,
  placeholder,
  emptyPreview,
  icon: Icon,
  maxLength,
  errors,
  iconClassName,
  className,
}: MarkdownFieldEditorProps) {
  const labelId = `${id}-label`
  const descriptionId = `${id}-description`
  const editorLabelId = `${id}-editor-label`
  const preview = markdownToPlainText(value)
  const invalid = Boolean(errors?.length)

  return (
    <Field data-invalid={invalid} className={className}>
      <input type="hidden" name={name} value={value} />

      <Dialog>
        <DialogTrigger
          type="button"
          aria-labelledby={labelId}
          aria-describedby={descriptionId}
          aria-invalid={invalid || undefined}
          className="group/editor flex min-h-24 w-full items-start gap-3 rounded-lg border border-foreground/10 bg-foreground/[0.045] px-4 py-3 text-left transition-colors outline-none hover:bg-foreground/[0.065] focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 aria-invalid:border-destructive sm:px-5"
        >
          <span
            className={cn(
              "flex size-8 shrink-0 items-center justify-center rounded-md bg-brand-neon-soft text-brand-neon-ink",
              iconClassName
            )}
          >
            <Icon aria-hidden="true" />
          </span>

          <span className="min-w-0 flex-1">
            <span className="flex items-center justify-between gap-3">
              <FieldTitle id={labelId}>{label}</FieldTitle>
              <span className="shrink-0 font-mono text-xs text-muted-foreground tabular-nums">
                {value.length}/{maxLength}
              </span>
            </span>
            <span
              className={cn(
                "mt-1 line-clamp-2 block text-sm leading-5 text-muted-foreground",
                !preview && "opacity-65"
              )}
            >
              {preview || emptyPreview}
            </span>
            <span id={descriptionId} className="sr-only">
              {description}
            </span>
          </span>

          <PencilLineIcon
            className="mt-1 size-4 shrink-0 text-muted-foreground transition-colors group-hover/editor:text-foreground"
            aria-hidden="true"
          />
        </DialogTrigger>

        <DialogContent className="h-dvh max-h-dvh w-screen max-w-none min-w-0 grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden rounded-none p-0 sm:h-[min(52rem,calc(100dvh-2rem))] sm:max-h-[calc(100dvh-2rem)] sm:w-full sm:max-w-5xl sm:rounded-lg">
          <DialogHeader className="min-w-0 border-b border-border px-4 py-3.5 pr-14 sm:px-5">
            <div className="flex items-center gap-3">
              <span
                className={cn(
                  "flex size-9 shrink-0 items-center justify-center rounded-md bg-brand-neon-soft text-brand-neon-ink",
                  iconClassName
                )}
              >
                <Icon aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <DialogTitle id={editorLabelId}>{label}</DialogTitle>
                <DialogDescription className="mt-1">
                  {description}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="min-h-0 min-w-0 overflow-hidden bg-foreground/[0.018] p-3 sm:p-4">
            <MarkdownBlockEditor
              id={`${id}-editor`}
              value={value}
              onChange={onChange}
              placeholder={placeholder}
              ariaLabelledBy={editorLabelId}
              ariaInvalid={invalid}
              className="h-full min-h-0 w-full min-w-0 overflow-y-auto rounded-lg border border-foreground/8 bg-foreground/[0.035]"
            />
          </div>

          <DialogFooter className="min-w-0 flex-col items-stretch gap-2 border-t border-border bg-popover px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:flex-row sm:items-center sm:justify-between sm:px-5 sm:py-3">
            <span className="text-xs text-muted-foreground sm:mr-auto">
              <span className="font-mono tabular-nums">{value.length}</span>/
              {maxLength}
              <span className="hidden sm:inline">
                {" "}
                characters - Saved in Markdown
              </span>
              <span className="sm:hidden"> - Markdown</span>
            </span>
            <DialogClose
              render={
                <Button
                  type="button"
                  size="sm"
                  className="h-11 w-full sm:h-8 sm:w-auto"
                />
              }
            >
              <CheckIcon data-icon="inline-start" aria-hidden="true" />
              Done
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <FieldError errors={toFieldErrorItems(errors)} />
    </Field>
  )
}
