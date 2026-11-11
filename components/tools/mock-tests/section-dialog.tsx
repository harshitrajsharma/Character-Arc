"use client"

import { useId, useState } from "react"
import { LayersIcon, SparklesIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { SectionDefinition } from "@/lib/tools/definitions/mock-tests/repository"

export interface SectionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  section?: SectionDefinition | null
  existingKeys: string[]
  onSave: (section: SectionDefinition) => void
}

function slugifyKey(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
}

export function SectionDialog(props: SectionDialogProps) {
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-lg">
        <SectionForm key={props.section?.key ?? "new"} {...props} />
      </DialogContent>
    </Dialog>
  )
}

function SectionForm({
  onOpenChange,
  section,
  existingKeys,
  onSave,
}: SectionDialogProps) {
  const isEditing = Boolean(section)
  const titleId = useId()
  const keyId = useId()
  const descriptionId = useId()

  const [title, setTitle] = useState(section?.title ?? "")
  const [key, setKey] = useState(section?.key ?? "")
  const [description, setDescription] = useState(section?.description ?? "")
  const [isKeyCustomized, setIsKeyCustomized] = useState(Boolean(section))
  const [errors, setErrors] = useState<{
    title?: string
    key?: string
    description?: string
  }>({})

  function handleTitleChange(value: string) {
    setTitle(value)
    if (errors.title) {
      setErrors((prev) => ({ ...prev, title: undefined }))
    }
    if (!isEditing && !isKeyCustomized) {
      const generated = slugifyKey(value)
      setKey(generated)
      if (errors.key) {
        setErrors((prev) => ({ ...prev, key: undefined }))
      }
    }
  }

  function handleKeyChange(value: string) {
    setIsKeyCustomized(true)
    setKey(value)
    if (errors.key) {
      setErrors((prev) => ({ ...prev, key: undefined }))
    }
  }

  function handleAutoRegenerateKey() {
    const generated = slugifyKey(title)
    setKey(generated)
    setIsKeyCustomized(false)
    if (errors.key) {
      setErrors((prev) => ({ ...prev, key: undefined }))
    }
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const trimmedTitle = title.trim()
    const trimmedKey = key.trim()
    const trimmedDescription = description.trim()

    const newErrors: {
      title?: string
      key?: string
      description?: string
    } = {}

    if (!trimmedTitle) {
      newErrors.title = "Section title is required."
    } else if (trimmedTitle.length > 120) {
      newErrors.title = "Section title must be 120 characters or fewer."
    }

    if (!trimmedKey) {
      newErrors.key = "Section key is required."
    } else if (trimmedKey.length > 40) {
      newErrors.key = "Section key must be 40 characters or fewer."
    } else if (!/^[a-zA-Z0-9_-]+$/.test(trimmedKey)) {
      newErrors.key =
        "Section key may only contain letters, numbers, hyphens, and underscores."
    } else {
      const isTaken = existingKeys.some(
        (existing) =>
          (!isEditing ||
            existing.toLowerCase() !== section?.key.toLowerCase()) &&
          existing.toLowerCase() === trimmedKey.toLowerCase()
      )
      if (isTaken) {
        newErrors.key = `A section with key "${trimmedKey}" already exists.`
      }
    }

    if (trimmedDescription.length > 1000) {
      newErrors.description = "Instructions must be 1000 characters or fewer."
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      requestAnimationFrame(() =>
        document
          .getElementById(
            newErrors.title ? titleId : newErrors.key ? keyId : descriptionId
          )
          ?.focus()
      )
      return
    }

    onSave({
      key: trimmedKey,
      title: trimmedTitle,
      description: trimmedDescription || null,
    })
    onOpenChange(false)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <DialogHeader>
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-lg border border-brand-violet-line bg-brand-violet-soft text-brand-violet-ink">
            <LayersIcon className="size-4" aria-hidden="true" />
          </div>
          <DialogTitle>
            {isEditing ? "Edit Section" : "Add Exam Section"}
          </DialogTitle>
        </div>
        <DialogDescription>
          {isEditing
            ? "Update the title, identifier, or section-specific instructions."
            : "Define a section to group questions, such as Aptitude or Core Subject."}
        </DialogDescription>
      </DialogHeader>

      <div className="grid gap-4 py-1">
        <div className="grid gap-1.5">
          <Label htmlFor={titleId} className="text-xs font-semibold">
            Title <span className="text-destructive">*</span>
          </Label>
          <Input
            id={titleId}
            aria-invalid={!!errors.title}
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            placeholder="e.g., Section A: General Aptitude"
            maxLength={120}
            className="h-11 text-sm"
            autoFocus
          />
          {errors.title ? (
            <p className="text-xs text-destructive">{errors.title}</p>
          ) : (
            <p className="text-[11px] text-muted-foreground">
              Descriptive title shown in paper headers and student scorecards
              (max 120 chars).
            </p>
          )}
        </div>

        <details
          open={errors.key ? true : undefined}
          className="rounded-lg border border-border p-3"
        >
          <summary className="flex min-h-11 cursor-pointer items-center text-sm font-medium focus-visible:outline-2 focus-visible:outline-ring">
            Advanced section identifier
          </summary>
          <div className="grid gap-1.5 pt-2">
            <div className="flex items-center justify-between">
              <Label htmlFor={keyId} className="text-xs font-semibold">
                Section Key / Identifier{" "}
                <span className="text-destructive">*</span>
              </Label>
              {isKeyCustomized && title.trim() ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  onClick={handleAutoRegenerateKey}
                  className="h-11 gap-1 px-2 text-sm text-muted-foreground hover:text-foreground"
                >
                  <SparklesIcon className="size-3" aria-hidden="true" />
                  Auto-slug
                </Button>
              ) : null}
            </div>
            <Input
              id={keyId}
              aria-invalid={!!errors.key}
              value={key}
              onChange={(e) => handleKeyChange(e.target.value)}
              placeholder="e.g., general-aptitude or GA"
              maxLength={40}
              className="h-11 font-mono text-sm"
            />
            {errors.key ? (
              <p className="text-xs text-destructive">{errors.key}</p>
            ) : (
              <p className="text-[11px] text-muted-foreground">
                Unique identifier (max 40 chars, letters, numbers, dashes,
                underscores).
              </p>
            )}
          </div>
        </details>

        <div className="grid gap-1.5">
          <Label htmlFor={descriptionId} className="text-xs font-semibold">
            Description / Instructions{" "}
            <span className="text-xs font-normal text-muted-foreground">
              (optional)
            </span>
          </Label>
          <Textarea
            id={descriptionId}
            aria-invalid={!!errors.description}
            rows={3}
            value={description}
            onChange={(e) => {
              setDescription(e.target.value)
              if (errors.description) {
                setErrors((prev) => ({ ...prev, description: undefined }))
              }
            }}
            placeholder="e.g., Questions 1 to 5 carry 1 mark each; questions 6 to 10 carry 2 marks each."
            maxLength={1000}
            className="min-h-20 text-sm"
          />
          {errors.description ? (
            <p className="text-xs text-destructive">{errors.description}</p>
          ) : (
            <p className="text-[11px] text-muted-foreground">
              Specific directions or marking schemes shown at the top of this
              section (max 1000 chars).
            </p>
          )}
        </div>
      </div>

      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          className="h-11"
          onClick={() => onOpenChange(false)}
        >
          Cancel
        </Button>
        <Button type="submit" className="h-11">
          {isEditing ? "Save changes" : "Add section"}
        </Button>
      </DialogFooter>
    </form>
  )
}
