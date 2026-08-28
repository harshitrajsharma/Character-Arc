import {
  BookOpenIcon,
  ClipboardCheckIcon,
  FlaskConicalIcon,
  RefreshCwIcon,
  TargetIcon,
  ShieldCheckIcon,
} from "lucide-react"

import type { SubjectProgressPolicy } from "@/lib/tools/exam-prep/progress/policy"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

const stages = [
  {
    label: "Learn",
    weight: "25%",
    icon: BookOpenIcon,
    detail: "Mark a topic learned.",
  },
  {
    label: "Revise",
    weight: "30%",
    icon: RefreshCwIcon,
    detail: "Revision count against its target.",
  },
  {
    label: "Practice",
    weight: "30%",
    icon: FlaskConicalIcon,
    detail: "Practice count against its target.",
  },
  {
    label: "Test",
    weight: "15%",
    icon: ClipboardCheckIcon,
    detail: "Test Records against their target.",
  },
]

export function ProgressCalculatorExplainer({
  policy,
  compact = false,
}: {
  policy: SubjectProgressPolicy
  compact?: boolean
}) {
  return (
    <div className={cn("space-y-12", compact && "space-y-6")}>
      <section
        aria-labelledby="progress-explainer-title"
        className={cn("space-y-6", compact && "space-y-4")}
      >
        <header className="border-b border-border/60 pb-4">
          <div className="flex items-center gap-2 text-sm font-medium text-brand-neon-ink">
            <TargetIcon className="size-4" aria-hidden="true" />
            <h2 id="progress-explainer-title" className="font-heading text-xl font-semibold text-foreground">
              How overall progress works
            </h2>
          </div>
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
            Understand how targets convert to percentage
          </p>
        </header>

        <div className={cn("space-y-6", compact && "space-y-4")}>
          <div
            className={cn(
              "grid gap-4",
              compact ? "grid-cols-2" : "grid-cols-2 lg:grid-cols-4"
            )}
          >
            {stages.map(({ label, weight, icon: Icon, detail }) => (
              <div
                key={label}
                className={cn(
                  "rounded-xl border border-border/60 bg-card",
                  compact ? "p-4" : "p-5"
                )}
              >
                <div className="flex items-center gap-2 text-brand-neon-ink">
                  <Icon className="size-4" aria-hidden="true" />
                  <span className="text-sm font-medium">{label}</span>
                </div>
                <p
                  className={cn(
                    "font-heading font-semibold",
                    compact ? "mt-2 text-xl" : "mt-3 text-2xl"
                  )}
                >
                  {weight}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {detail}
                </p>
              </div>
            ))}
          </div>

          <div className="grid gap-x-8 gap-y-4 rounded-xl border border-border/60 bg-muted/10 p-5 text-sm sm:grid-cols-2">
            <p>
              <span className="font-medium text-foreground">Standard:</span>{" "}
              <span className="text-muted-foreground">
                {policy.revisionTarget} revisions and {policy.practiceTarget}{" "}
                practice sessions.
              </span>
            </p>
            <p>
              <span className="font-medium text-brand-amber-ink">
                High-yield:
              </span>{" "}
              <span className="text-muted-foreground">
                {policy.highYieldRevisionTarget} revisions and{" "}
                {policy.highYieldPracticeTarget} practice sessions.
              </span>
            </p>
            <p>
              <span className="font-medium text-foreground">Chapter tests:</span>{" "}
              <span className="text-muted-foreground">
                {policy.chapterTestTarget} Test Record
                {policy.chapterTestTarget === 1 ? "" : "s"} per chapter.
              </span>
            </p>
            <p>
              <span className="font-medium text-foreground">Subject tests:</span>{" "}
              <span className="text-muted-foreground">
                {policy.subjectTestTarget} full-subject Test Record
                {policy.subjectTestTarget === 1 ? "" : "s"}.
              </span>
            </p>
          </div>
        </div>
      </section>

      <section
        aria-labelledby="foundation-explainer-title"
        className={cn("space-y-6", compact && "space-y-4")}
      >
        <header className="border-b border-border/60 pb-4">
          <div className="flex items-center gap-2 text-sm font-medium text-brand-cyan-ink">
            <ShieldCheckIcon className="size-4" aria-hidden="true" />
            <h2 id="foundation-explainer-title" className="font-heading text-xl font-semibold text-foreground">
              Foundation level calculation
            </h2>
          </div>
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
            Beginner, Moderate, or Advanced
          </p>
        </header>

        <div className={cn("space-y-6", compact && "space-y-4")}>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Your Foundation Level is based directly on your overall weighted
            progress. It categorizes your readiness into three clear tiers,
            helping you assess at a glance whether you have a solid grasp of
            the subject material.
          </p>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className={cn("rounded-xl border border-border/60 bg-card", compact ? "p-4" : "p-5")}>
              <Badge
                variant="outline"
                className="border-border bg-muted text-muted-foreground hover:bg-muted"
              >
                Beginner
              </Badge>
              <div className="mt-3 text-xs font-medium text-muted-foreground">
                &lt; 50% weighted progress
              </div>
            </div>
            <div className={cn("rounded-xl border border-border/60 bg-card", compact ? "p-4" : "p-5")}>
              <Badge
                variant="outline"
                className="border-brand-amber-line bg-brand-amber-soft text-brand-amber-ink hover:bg-brand-amber-soft"
              >
                Moderate
              </Badge>
              <div className="mt-3 text-xs font-medium text-muted-foreground">
                50% &ndash; 79% weighted progress
              </div>
            </div>
            <div className={cn("rounded-xl border border-border/60 bg-card", compact ? "p-4" : "p-5")}>
              <Badge
                variant="outline"
                className="border-success-line bg-success-soft text-success-ink hover:bg-success-soft"
              >
                Advanced
              </Badge>
              <div className="mt-3 text-xs font-medium text-muted-foreground">
                &ge; 80% weighted progress
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
