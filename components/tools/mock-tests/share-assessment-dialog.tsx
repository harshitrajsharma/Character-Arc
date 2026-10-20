"use client"

import { useEffect, useState, useTransition } from "react"
import {
  CheckIcon,
  CopyIcon,
  GlobeIcon,
  LayersIcon,
  LinkIcon,
  LockIcon,
  Share2Icon,
  TagIcon,
} from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
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
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"
import { updateAssessmentSharingAction } from "@/lib/tools/mock-tests/actions/assessment-actions"
import type {
  AssessmentTaxonomy,
  AssessmentVisibility,
} from "@/lib/tools/definitions/mock-tests/repository"

export interface ShareAssessmentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  workspaceSlug: string
  assessment: {
    id: string
    title: string
    revision?: number
    visibility?: AssessmentVisibility
    allowCloning?: boolean
    taxonomy?: AssessmentTaxonomy
  }
  onUpdated?: () => void
}

const PAPER_TYPE_LABELS: Record<string, { label: string; className: string }> = {
  full_length: {
    label: "Full-Length Mock",
    className: "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  },
  subject_wise: {
    label: "Subject Test",
    className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  },
  topic_wise: {
    label: "Topic Drill",
    className: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  },
  pyq: {
    label: "Previous Year (PYQ)",
    className: "border-cyan-500/30 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300",
  },
}

export function ShareAssessmentDialog({
  open,
  onOpenChange,
  workspaceSlug,
  assessment,
  onUpdated,
}: ShareAssessmentDialogProps) {
  const [isPending, startTransition] = useTransition()
  const [copied, setCopied] = useState(false)

  // Local state for distribution & access
  const [visibility, setVisibility] = useState<AssessmentVisibility>(
    assessment.visibility ?? "private"
  )
  const [allowCloning, setAllowCloning] = useState(
    assessment.allowCloning !== false
  )

  useEffect(() => {
    if (open) {
      setVisibility(assessment.visibility ?? "private")
      setAllowCloning(assessment.allowCloning !== false)
      setCopied(false)
    }
  }, [open, assessment])

  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/assessments/share/${assessment.id}`
      : `/assessments/share/${assessment.id}`

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      toast.success("Share link copied to clipboard")
      setTimeout(() => setCopied(false), 2500)
    } catch {
      toast.error("Failed to copy link")
    }
  }

  const handleSave = () => {
    startTransition(async () => {
      try {
        await updateAssessmentSharingAction({
          workspaceSlug,
          assessmentId: assessment.id,
          expectedRevision: assessment.revision,
          visibility,
          allowCloning,
        })

        toast.success(
          visibility === "public"
            ? "Mock test published to Community Hub!"
            : visibility === "unlisted"
            ? "Share link updated (Cohort unlisted)"
            : "Sharing set to private workspace"
        )
        onUpdated?.()
        onOpenChange(false)
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to update sharing settings"
        )
      }
    })
  }

  const currentPaperType = assessment.taxonomy?.paperType ?? "full_length"
  const paperTypeMeta = PAPER_TYPE_LABELS[currentPaperType] ?? PAPER_TYPE_LABELS.full_length

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[740px] max-w-[calc(100%-2rem)] sm:w-[740px] sm:max-w-[740px] h-[640px] max-h-[92vh] flex flex-col justify-between p-6 sm:p-7 gap-0">
        <DialogHeader className="shrink-0 space-y-1 pb-3 border-b border-border/40">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-foreground/5 text-foreground border border-border/50">
              <Share2Icon className="size-4" />
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold tracking-tight text-foreground">
                Publish &amp; Share Mock Test
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Manage paper visibility, distribution tier, and student cohort access.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 py-4 space-y-4 overflow-y-auto pr-0.5">
          {/* Target Assessment & Classification Summary Banner */}
          <div className="rounded-xl border border-border/70 bg-card p-4 space-y-2.5 shadow-2xs">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-0.5 min-w-0">
                <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground block">
                  Test Assessment
                </span>
                <span className="text-sm font-bold text-foreground truncate block">
                  {assessment.title}
                </span>
              </div>
              <Badge
                variant="outline"
                className={cn("text-[10px] font-semibold rounded-full px-2.5 py-0.5 shrink-0", paperTypeMeta.className)}
              >
                {paperTypeMeta.label}
              </Badge>
            </div>

            {/* Read-only taxonomy preview */}
            <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-border/40 text-[11px] text-muted-foreground">
              {assessment.taxonomy?.examTag ? (
                <span className="inline-flex items-center gap-1 font-bold uppercase tracking-wider text-foreground bg-muted/60 px-2 py-0.5 rounded-md border border-border/50">
                  <TagIcon className="size-2.5 text-muted-foreground" />
                  {assessment.taxonomy.examTag}
                </span>
              ) : null}

              {assessment.taxonomy?.subjects && assessment.taxonomy.subjects.length > 0 ? (
                <span className="truncate">
                  Subjects: <strong className="font-semibold text-foreground">{assessment.taxonomy.subjects.join(", ")}</strong>
                </span>
              ) : null}

              <span className="text-[10px] text-muted-foreground/80 italic ml-auto">
                Classification edited in builder
              </span>
            </div>
          </div>

          {/* Visibility Options Cards */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-foreground uppercase tracking-wider">
              1. Audience &amp; Visibility
            </Label>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
              {/* Private */}
              <button
                type="button"
                onClick={() => setVisibility("private")}
                className={cn(
                  "relative flex flex-col items-start p-3.5 rounded-xl border text-left transition-all cursor-pointer",
                  visibility === "private"
                    ? "border-foreground bg-foreground/[0.03] shadow-sm ring-1 ring-foreground"
                    : "border-border/70 hover:border-border hover:bg-muted/40"
                )}
              >
                <div className="flex items-center justify-between w-full mb-1.5">
                  <div className="flex size-7 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    <LockIcon className="size-3.5" />
                  </div>
                  {visibility === "private" && (
                    <div className="size-2 rounded-full bg-foreground" />
                  )}
                </div>
                <span className="text-xs font-semibold text-foreground">Private</span>
                <span className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                  Only accessible inside your workspace.
                </span>
              </button>

              {/* Unlisted (Cohort Link) */}
              <button
                type="button"
                onClick={() => setVisibility("unlisted")}
                className={cn(
                  "relative flex flex-col items-start p-3.5 rounded-xl border text-left transition-all cursor-pointer",
                  visibility === "unlisted"
                    ? "border-foreground bg-foreground/[0.03] shadow-sm ring-1 ring-foreground"
                    : "border-border/70 hover:border-border hover:bg-muted/40"
                )}
              >
                <div className="flex items-center justify-between w-full mb-1.5">
                  <div className="flex size-7 items-center justify-center rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400">
                    <LinkIcon className="size-3.5" />
                  </div>
                  {visibility === "unlisted" && (
                    <div className="size-2 rounded-full bg-foreground" />
                  )}
                </div>
                <span className="text-xs font-semibold text-foreground">Shared via Link</span>
                <span className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                  Anyone with direct link can attempt &amp; join leaderboard.
                </span>
              </button>

              {/* Public (Community) */}
              <button
                type="button"
                onClick={() => setVisibility("public")}
                className={cn(
                  "relative flex flex-col items-start p-3.5 rounded-xl border text-left transition-all cursor-pointer",
                  visibility === "public"
                    ? "border-foreground bg-foreground/[0.03] shadow-sm ring-1 ring-foreground"
                    : "border-border/70 hover:border-border hover:bg-muted/40"
                )}
              >
                <div className="flex items-center justify-between w-full mb-1.5">
                  <div className="flex size-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <GlobeIcon className="size-3.5" />
                  </div>
                  {visibility === "public" && (
                    <div className="size-2 rounded-full bg-foreground" />
                  )}
                </div>
                <span className="text-xs font-semibold text-foreground">Community Hub</span>
                <span className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                  Listed publicly on Community Hub for all learners.
                </span>
              </button>
            </div>
          </div>

          {/* Cloning Permission Switch */}
          <div className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/20 p-3.5">
            <div className="space-y-0.5 pr-4">
              <div className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <LayersIcon className="size-3.5 text-muted-foreground" />
                Allow Community &amp; Cohort to Clone
              </div>
              <p className="text-[11px] text-muted-foreground leading-snug">
                Let learners clone this paper and question set into their workspace to modify questions or run private mock attempts.
              </p>
            </div>
            <Switch
              checked={allowCloning}
              onCheckedChange={setAllowCloning}
            />
          </div>

          {/* Direct Cohort Share Link Slot (Stable height across all visibility modes) */}
          <div className="rounded-xl border border-border/80 bg-background/50 p-3.5 space-y-1.5 shadow-2xs">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                {visibility === "private" ? (
                  <LockIcon className="size-3 text-muted-foreground" />
                ) : (
                  <LinkIcon className="size-3 text-sky-600 dark:text-sky-400" />
                )}
                Direct Cohort Share Link
              </Label>
              {visibility === "private" && (
                <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                  Inactive in Private
                </span>
              )}
            </div>

            {visibility !== "private" ? (
              <div className="flex items-center gap-2 pt-0.5">
                <Input
                  readOnly
                  value={shareUrl}
                  className="text-xs h-9 font-mono bg-muted/30 select-all"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCopy}
                  className="h-9 px-3 gap-1.5 shrink-0 cursor-pointer"
                >
                  {copied ? (
                    <>
                      <CheckIcon className="size-3.5 text-emerald-600" />
                      Copied
                    </>
                  ) : (
                    <>
                      <CopyIcon className="size-3.5" />
                      Copy Link
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-2 pt-0.5 text-xs text-muted-foreground bg-muted/20 rounded-lg px-3 py-2 border border-dashed border-border/60">
                <span className="text-[11px] leading-snug">
                  Direct share link is disabled while set to Private workspace. Switch to <strong className="font-semibold text-foreground">Shared via Link</strong> or <strong className="font-semibold text-foreground">Community Hub</strong> to enable cohort access.
                </span>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="shrink-0 pt-3 border-t border-border/40 gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
            className="text-xs h-9 cursor-pointer"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={isPending}
            className="text-xs h-9 bg-foreground text-background font-semibold hover:opacity-90 transition-opacity cursor-pointer"
          >
            {isPending ? "Saving..." : "Save Settings"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
