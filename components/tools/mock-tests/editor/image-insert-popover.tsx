"use client"

import { useId, useState } from "react"
import { ImageIcon, Loader2Icon, UploadIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { uploadQuestionImageAction } from "@/lib/tools/mock-tests/actions/image-actions"

export function ImageInsertPopover({
  workspaceSlug,
  onInsert,
  onUploadStateChange,
  triggerClassName,
}: {
  workspaceSlug?: string
  onInsert: (image: { src: string; alt: string }) => void
  onUploadStateChange?: (busy: boolean) => void
  triggerClassName?: string
}) {
  const id = useId()
  const [open, setOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [url, setUrl] = useState("")
  const [alt, setAlt] = useState("")
  const [mode, setMode] = useState<"upload" | "url">(
    workspaceSlug ? "upload" : "url"
  )
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")

  async function insert() {
    setError("")
    if (!alt.trim()) {
      setError("Describe the image so students can understand its content.")
      return
    }
    if (mode === "url") {
      let parsed: URL
      try {
        parsed = new URL(url)
      } catch {
        setError("Enter a complete HTTPS image URL.")
        return
      }
      if (parsed.protocol !== "https:") {
        setError("Use an HTTPS image URL.")
        return
      }
      onInsert({ src: parsed.href, alt: alt.trim() })
      setOpen(false)
      setUrl("")
      setAlt("")
      return
    }
    if (!file || !workspaceSlug) return
    if (
      !["image/png", "image/jpeg", "image/webp"].includes(file.type) ||
      file.size > 5 * 1024 * 1024 ||
      file.size === 0
    ) {
      setError("Choose a PNG, JPEG or WebP image up to 5 MB.")
      return
    }
    setBusy(true)
    onUploadStateChange?.(true)
    try {
      const data = new FormData()
      data.set("file", file)
      const result = await uploadQuestionImageAction(workspaceSlug, data)
      if ("error" in result) {
        setError(result.error)
        return
      }
      onInsert({ src: result.src, alt: alt.trim() })
      setOpen(false)
      setFile(null)
      setAlt("")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed. Try again.")
    } finally {
      setBusy(false)
      onUploadStateChange?.(false)
    }
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        if (!busy) {
          setOpen(next)
          setError("")
        }
      }}
    >
      <PopoverTrigger
        className={triggerClassName}
        aria-label="Insert image"
        title="Insert image"
      >
        <ImageIcon className="size-4" aria-hidden="true" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 max-w-[calc(100vw-2rem)]">
        <div className="flex flex-col gap-4">
          <div>
            <p className="text-sm font-semibold">Insert image</p>
            <p className="text-xs text-muted-foreground">
              Add a diagram, graph or illustration.
            </p>
          </div>
          <FieldGroup>
            {mode === "upload" ? (
              <Field>
                <FieldLabel htmlFor={id + "-file"}>Image file</FieldLabel>
                <Input
                  id={id + "-file"}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  disabled={busy}
                  onChange={(e) => {
                    setFile(e.target.files?.[0] ?? null)
                    setError("")
                  }}
                  className="min-h-11 min-w-0"
                />
                <FieldDescription>
                  PNG, JPEG or WebP � up to 5 MB. Uploads stay in private
                  storage.
                </FieldDescription>
              </Field>
            ) : (
              <Field>
                <FieldLabel htmlFor={id + "-url"}>Image URL</FieldLabel>
                <Input
                  id={id + "-url"}
                  type="url"
                  value={url}
                  disabled={busy}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com/diagram.png"
                  className="h-11"
                />
                <FieldDescription>
                  Use a stable link you have permission to share.
                </FieldDescription>
              </Field>
            )}
            <Field>
              <FieldLabel htmlFor={id + "-alt"}>Image description</FieldLabel>
              <Input
                id={id + "-alt"}
                value={alt}
                disabled={busy}
                onChange={(e) => setAlt(e.target.value)}
                placeholder="e.g., A binary tree with seven nodes"
                maxLength={500}
                className="h-11"
              />
            </Field>
          </FieldGroup>
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
          <div className="flex flex-wrap items-center justify-between gap-2">
            {workspaceSlug ? (
              <Button
                type="button"
                variant="ghost"
                disabled={busy}
                className="min-h-11"
                onClick={() => {
                  setMode(mode === "upload" ? "url" : "upload")
                  setError("")
                }}
              >
                {mode === "upload" ? "Use image URL" : "Upload a file"}
              </Button>
            ) : null}
            <Button
              type="button"
              disabled={
                busy || !alt.trim() || (mode === "upload" ? !file : !url.trim())
              }
              onClick={() => void insert()}
              className="min-h-11"
            >
              {busy ? (
                <Loader2Icon className="animate-spin" aria-hidden="true" />
              ) : mode === "upload" ? (
                <UploadIcon aria-hidden="true" />
              ) : null}
              {busy
                ? "Uploading�"
                : mode === "upload"
                  ? "Upload & insert"
                  : "Insert image"}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
