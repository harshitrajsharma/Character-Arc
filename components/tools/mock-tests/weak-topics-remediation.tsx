"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import {
  ArrowRightIcon,
  CheckIcon,
  CheckCheckIcon,
  FlameIcon,
  PlusIcon,
  SparklesIcon,
  TargetIcon,
} from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { workspaceRoutes } from "@/lib/routes/workspace-tools"
import type { WeakTopicItem } from "@/lib/tools/definitions/mock-tests/calculations/analysis"

interface WeakTopicsRemediationProps {
  workspaceSlug: string
  weakTopics: WeakTopicItem[]
}

export function WeakTopicsRemediation({
  workspaceSlug,
  weakTopics,
}: WeakTopicsRemediationProps) {
  const [queuedTopics, setQueuedTopics] = useState<Record<string, boolean>>({})
  const [filterMode, setFilterMode] = useState<"ALL" | "HIGH_YIELD">("ALL")

  const highYieldCount = useMemo(() => {
    return (weakTopics ?? []).filter((t) => t.proficiency < 40).length
  }, [weakTopics])

  const displayedTopics = useMemo(() => {
    if (!weakTopics) return []
    if (filterMode === "HIGH_YIELD") {
      return weakTopics.filter((t) => t.proficiency < 40)
    }
    return weakTopics
  }, [weakTopics, filterMode])

  const allQueued = useMemo(() => {
    if (!weakTopics || weakTopics.length === 0) return false
    return weakTopics.every((t) => queuedTopics[t.blockId])
  }, [weakTopics, queuedTopics])

  const queuedCount = useMemo(() => {
    return Object.values(queuedTopics).filter(Boolean).length
  }, [queuedTopics])

  if (!weakTopics || weakTopics.length === 0) return null

  function handleAddToRevision(topic: WeakTopicItem) {
    setQueuedTopics((prev) => ({ ...prev, [topic.blockId]: true }))
    toast.success(`Added "${topic.title || "Topic"}" to Revision Queue`, {
      description: "Character Arc's Study Path algorithm has scheduled this for high-yield spaced repetition.",
    })
  }

  function handleAddAllToRevision() {
    const updated: Record<string, boolean> = { ...queuedTopics }
    for (const t of weakTopics) {
      updated[t.blockId] = true
    }
    setQueuedTopics(updated)
    toast.success(`Added all ${weakTopics.length} weak topics to Revision Queue`, {
      description: "Study Path algorithm has scheduled all deficit areas for targeted remediation.",
    })
  }

  return (
    <section aria-labelledby="weak-topics-title" className="mt-8 space-y-4">
      {/* Header with Title and Actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-3">
        <div>
          <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-brand-violet-ink">
            <SparklesIcon className="size-3.5" />
            AI-Driven Weak Topic Remediation Bridge
          </div>
          <h2 id="weak-topics-title" className="mt-0.5 font-heading text-xl font-bold text-foreground">
            Targeted Remediation &amp; Revision
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {!allQueued && weakTopics.length > 1 ? (
            <Button
              type="button"
              variant="outline"
              size="xs"
              onClick={handleAddAllToRevision}
              className="text-xs h-7 gap-1 font-semibold border-border hover:bg-muted text-foreground"
            >
              <CheckCheckIcon className="size-3.5 text-brand-violet-ink" />
              Add All to Revision ({weakTopics.length})
            </Button>
          ) : null}

          <Button
            variant="outline"
            size="xs"
            className="text-xs h-7 gap-1 font-semibold text-brand-violet-ink border-brand-violet-line hover:bg-brand-violet-soft"
            render={<Link href={workspaceRoutes.examPrep.home(workspaceSlug)} />}
          >
            Open Exam Prep Study Path
            <ArrowRightIcon className="size-3" />
          </Button>
        </div>
      </div>

      {/* Overview Notice & Priority Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-brand-violet-line bg-brand-violet-soft p-3 text-xs text-foreground">
        <div className="flex items-center gap-2.5">
          <FlameIcon className="size-4 shrink-0 text-brand-amber-ink" />
          <p className="leading-relaxed text-muted-foreground">
            Based on your errors in this mock test, the topics below have reduced proficiency scores. Re-practicing these concepts will recover lost marks in your next test attempt.
          </p>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setFilterMode("ALL")}
            className={cn(
              "rounded-full px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer",
              filterMode === "ALL"
                ? "bg-background text-foreground shadow-2xs font-bold border border-border"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            All ({weakTopics.length})
          </button>
          {highYieldCount > 0 ? (
            <button
              type="button"
              onClick={() => setFilterMode("HIGH_YIELD")}
              className={cn(
                "rounded-full px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer flex items-center gap-1",
                filterMode === "HIGH_YIELD"
                  ? "bg-destructive/15 text-destructive shadow-2xs font-bold border border-destructive/30"
                  : "text-muted-foreground hover:text-destructive"
              )}
            >
              High-Yield ({highYieldCount})
            </button>
          ) : null}
        </div>
      </div>

      {/* Structured Remediation Data Table */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-xs">
        <Table>
          <TableHeader className="bg-muted/40">
            <TableRow className="hover:bg-transparent border-b border-border">
              <TableHead className="w-[38%] min-w-[220px] font-semibold text-xs text-muted-foreground">
                Deficit Concept / Topic
              </TableHead>
              <TableHead className="font-semibold text-xs text-muted-foreground min-w-[130px]">
                Priority Level
              </TableHead>
              <TableHead className="font-semibold text-xs text-muted-foreground min-w-[150px]">
                Current Mastery
              </TableHead>
              <TableHead className="font-semibold text-xs text-muted-foreground min-w-[110px]">
                Evidence
              </TableHead>
              <TableHead className="text-right font-semibold text-xs text-muted-foreground min-w-[140px]">
                Action
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayedTopics.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-xs text-muted-foreground">
                  No high-yield deficit topics found under 40% mastery.
                </TableCell>
              </TableRow>
            ) : (
              displayedTopics.map((topic) => {
                const isQueued = queuedTopics[topic.blockId] ?? false
                const isHighDeficit = topic.proficiency < 40

              return (
                <TableRow
                  key={topic.blockId}
                  className="border-b border-border/80 hover:bg-muted/30 transition-colors"
                >
                  {/* Topic Title with Icon */}
                  <TableCell className="py-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={cn(
                        "size-7 rounded-lg flex items-center justify-center shrink-0 font-bold",
                        isHighDeficit ? "bg-destructive/10 text-destructive" : "bg-amber-500/10 text-amber-500"
                      )}>
                        <TargetIcon className="size-3.5" />
                      </div>
                      <div className="min-w-0">
                        <span className="font-semibold text-sm text-foreground block truncate">
                          {topic.title ?? "Untitled Topic"}
                        </span>
                        {topic.blockTypeKey ? (
                          <span className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider block">
                            {topic.blockTypeKey.replace(/_/g, " ")}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </TableCell>

                  {/* Deficit Badge */}
                  <TableCell className="py-3">
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px] font-bold whitespace-nowrap",
                        isHighDeficit
                          ? "border-destructive/30 bg-destructive/10 text-destructive"
                          : "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                      )}
                    >
                      {isHighDeficit ? "High Yield Deficit" : "Needs Revision"}
                    </Badge>
                  </TableCell>

                  {/* Mastery Progress Bar */}
                  <TableCell className="py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="h-1.5 w-20 sm:w-24 overflow-hidden rounded-full bg-muted shrink-0">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all",
                            isHighDeficit ? "bg-destructive" : "bg-amber-500"
                          )}
                          style={{ width: `${Math.min(100, Math.max(5, topic.proficiency))}%` }}
                        />
                      </div>
                      <span className="font-mono text-xs font-bold text-foreground tabular-nums">
                        {Math.round(topic.proficiency)}%
                      </span>
                    </div>
                  </TableCell>

                  {/* Attempts recorded */}
                  <TableCell className="py-3">
                    <span className="font-mono text-xs text-muted-foreground tabular-nums whitespace-nowrap">
                      {topic.evidenceCount} {topic.evidenceCount === 1 ? "attempt" : "attempts"}
                    </span>
                  </TableCell>

                  {/* Action Button */}
                  <TableCell className="text-right py-3">
                    <Button
                      type="button"
                      variant="outline"
                      size="xs"
                      onClick={() => handleAddToRevision(topic)}
                      disabled={isQueued}
                      className={cn(
                        "h-7 text-xs font-semibold gap-1 whitespace-nowrap",
                        isQueued
                          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          : "border-border hover:bg-muted text-foreground"
                      )}
                    >
                      {isQueued ? (
                        <>
                          <CheckIcon className="size-3" />
                          In Queue
                        </>
                      ) : (
                        <>
                          <PlusIcon className="size-3" />
                          Add to Queue
                        </>
                      )}
                    </Button>
                  </TableCell>
                </TableRow>
              )
            }))}
          </TableBody>
          <TableFooter className="bg-muted/20 border-t border-border">
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={5} className="py-2.5 text-xs text-muted-foreground">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span>
                    <strong>{weakTopics.length}</strong> weak topics identified across this mock test
                  </span>
                  <span className="font-medium text-foreground">
                    {queuedCount > 0 ? (
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                        ✓ {queuedCount} of {weakTopics.length} queued for revision
                      </span>
                    ) : (
                      "Ready for revision scheduling"
                    )}
                  </span>
                </div>
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </div>
    </section>
  )
}
