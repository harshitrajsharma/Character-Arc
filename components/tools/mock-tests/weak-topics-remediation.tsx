"use client"

import { useState } from "react"
import Link from "next/link"
import {
  ArrowRightIcon,
  CheckIcon,
  FlameIcon,
  PlusIcon,
  SparklesIcon,
  TargetIcon,
} from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { formatNumber } from "@/lib/tools/mock-tests/kind-labels"
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

  if (!weakTopics || weakTopics.length === 0) return null

  function handleAddToRevision(topic: WeakTopicItem) {
    setQueuedTopics((prev) => ({ ...prev, [topic.blockId]: true }))
    toast.success(`Added "${topic.title || "Topic"}" to Revision Queue`, {
      description: "Character Arc's Study Path algorithm has scheduled this for high-yield spaced repetition.",
    })
  }

  return (
    <section aria-labelledby="weak-topics-title" className="mt-8 space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-3">
        <div>
          <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-brand-violet-ink">
            <SparklesIcon className="size-3.5" />
            AI-Driven Weak Topic Remediation Bridge
          </div>
          <h2 id="weak-topics-title" className="mt-0.5 font-heading text-xl font-bold text-foreground">
            Targeted Remediation &amp; Revision
          </h2>
        </div>

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

      {/* Overview Notice */}
      <div className="rounded-xl border border-brand-violet-line bg-brand-violet-soft p-3.5 text-xs text-foreground flex items-start gap-2.5">
        <FlameIcon className="size-4 shrink-0 text-brand-amber-ink mt-0.5" />
        <p className="leading-relaxed text-muted-foreground">
          Based on your errors in this mock test, the topics below have reduced proficiency scores. Re-practicing these concepts will recover lost marks in your next test attempt.
        </p>
      </div>

      {/* Grid of Weak Topic Cards */}
      <ul className="grid gap-3 sm:grid-cols-2">
        {weakTopics.map((topic) => {
          const isQueued = queuedTopics[topic.blockId] ?? false

          return (
            <li
              key={topic.blockId}
              className="flex flex-col justify-between gap-3 rounded-2xl border border-border bg-card p-4 shadow-xs hover:border-foreground/30 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5 min-w-0">
                  <div className="size-8 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center shrink-0 mt-0.5 font-bold">
                    <TargetIcon className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-xs font-bold text-foreground truncate">
                      {topic.title ?? "Untitled Topic"}
                    </h3>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Proficiency {formatNumber(topic.proficiency)}% • {topic.evidenceCount}{" "}
                      {topic.evidenceCount === 1 ? "attempt recorded" : "attempts recorded"}
                    </p>
                  </div>
                </div>

                <Badge
                  variant="outline"
                  className={cn(
                    "text-[10px] font-bold shrink-0",
                    topic.proficiency < 40
                      ? "border-destructive/30 bg-destructive/10 text-destructive"
                      : "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                  )}
                >
                  {topic.proficiency < 40 ? "High Yield Deficit" : "Needs Revision"}
                </Badge>
              </div>

              {/* Progress Bar & Actions */}
              <div className="space-y-2 pt-1 border-t border-border/60">
                <div className="flex justify-between text-[10px] font-mono text-muted-foreground">
                  <span>Current Mastery</span>
                  <span>{Math.round(topic.proficiency)}%</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      topic.proficiency < 40 ? "bg-destructive" : "bg-brand-amber"
                    )}
                    style={{ width: `${Math.min(100, Math.max(5, topic.proficiency))}%` }}
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="xs"
                    onClick={() => handleAddToRevision(topic)}
                    disabled={isQueued}
                    className={cn(
                      "h-7 text-xs font-semibold gap-1",
                      isQueued
                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        : "text-foreground"
                    )}
                  >
                    {isQueued ? (
                      <>
                        <CheckIcon className="size-3" />
                        In Revision Queue
                      </>
                    ) : (
                      <>
                        <PlusIcon className="size-3" />
                        Add to Revision Queue
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
