import {
  BookOpenIcon,
  ClipboardCheckIcon,
  FlaskConicalIcon,
  RefreshCwIcon,
  TargetIcon,
  ShieldCheckIcon,
  SparklesIcon,
  RouteIcon,
  ClockIcon,
  AlertTriangleIcon,
  LockIcon,
} from "lucide-react"

import type { SubjectProgressPolicy } from "@/lib/tools/exam-prep/progress/policy"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

const stages = [
  {
    label: "Learn",
    weight: "25%",
    icon: BookOpenIcon,
    detail: "Complete syllabus theory & core concepts.",
    color: "text-brand-cyan-ink",
    bg: "bg-brand-cyan-soft border-brand-cyan-line/40",
  },
  {
    label: "Revise",
    weight: "30%",
    icon: RefreshCwIcon,
    detail: "Active recall passes against revision target.",
    color: "text-brand-neon-ink",
    bg: "bg-brand-neon-soft border-brand-neon-line/40",
  },
  {
    label: "Practice",
    weight: "30%",
    icon: FlaskConicalIcon,
    detail: "Problem sets and exercise sessions.",
    color: "text-brand-amber-ink",
    bg: "bg-brand-amber-soft border-brand-amber-line/40",
  },
  {
    label: "Test",
    weight: "15%",
    icon: ClipboardCheckIcon,
    detail: "Chapter and full-subject test records.",
    color: "text-brand-violet-ink",
    bg: "bg-brand-violet-soft border-brand-violet-line/40",
  },
]

const algorithmRules = [
  {
    priority: "P1",
    title: "Overdue Spaced Revisions",
    icon: ClockIcon,
    color: "text-destructive",
    bg: "bg-destructive/10 border-destructive/30",
    desc: "Topics whose spaced-repetition revision date has passed are prioritized above starting new topics.",
  },
  {
    priority: "P2",
    title: "High-Yield Topics First",
    icon: SparklesIcon,
    color: "text-brand-amber-ink",
    bg: "bg-brand-amber-soft border-brand-amber-line/40",
    desc: "Crucial, high-weightage topics get elevated target quotas and priority in the study queue.",
  },
  {
    priority: "P3",
    title: "Weak Test Score Remediation",
    icon: AlertTriangleIcon,
    color: "text-brand-violet-ink",
    bg: "bg-brand-violet-soft border-brand-violet-line/40",
    desc: "Test attempts below 50% automatically inject focused review steps ahead of new chapter progression.",
  },
  {
    priority: "P4",
    title: "Sequential Prerequisite Unlocking",
    icon: LockIcon,
    color: "text-brand-cyan-ink",
    bg: "bg-brand-cyan-soft border-brand-cyan-line/40",
    desc: "Follows a strict Learn -> Revise -> Practice -> Test sequence to prevent cognitive overload.",
  },
]

export function ProgressCalculatorExplainer({
  policy,
}: {
  policy: SubjectProgressPolicy
  compact?: boolean
}) {
  return (
    <div className="space-y-8">
      {/* 1. Study Path Recommendation Engine Section */}
      <section
        aria-labelledby="algorithm-explainer-title"
        className="space-y-4"
      >
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold tracking-wider text-brand-violet-ink uppercase">
            <RouteIcon className="size-4" aria-hidden="true" />
            <span>Study Path Recommendation Engine</span>
          </div>
          <h3
            id="algorithm-explainer-title"
            className="mt-1 font-heading text-lg font-semibold text-foreground"
          >
            How Up Next & Study Paths are Generated
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            A deterministic algorithm schedules and ranks your next steps based
            on urgency and retention science.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {algorithmRules.map((rule) => {
            const Icon = rule.icon
            return (
              <div
                key={rule.priority}
                className="space-y-2 rounded-2xl border border-border/60 bg-muted/20 p-4"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "flex size-6 items-center justify-center rounded-lg border text-xs",
                        rule.bg,
                        rule.color
                      )}
                    >
                      <Icon className="size-3.5" />
                    </span>
                    <span className="text-xs font-semibold text-foreground">
                      {rule.title}
                    </span>
                  </div>
                  <Badge
                    variant="outline"
                    className="rounded-md px-1.5 py-0 font-mono text-[10px]"
                  >
                    {rule.priority}
                  </Badge>
                </div>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {rule.desc}
                </p>
              </div>
            )
          })}
        </div>
      </section>

      {/* 2. 4-Stage Progress Breakdown Section */}
      <section
        aria-labelledby="progress-explainer-title"
        className="space-y-4 border-t border-border/60 pt-6"
      >
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold tracking-wider text-brand-neon-ink uppercase">
            <TargetIcon className="size-4" aria-hidden="true" />
            <span>Weighted Progress Calculation</span>
          </div>
          <h3
            id="progress-explainer-title"
            className="mt-1 font-heading text-lg font-semibold text-foreground"
          >
            How Overall Percentage is Calculated
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Each stage contributes a balanced weight to your subject progress
            percentage.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {stages.map(({ label, weight, icon: Icon, detail, color, bg }) => (
            <div
              key={label}
              className="space-y-1.5 rounded-2xl border border-border/60 bg-muted/20 p-4"
            >
              <div className="flex items-center justify-between">
                <span
                  className={cn(
                    "flex size-6 items-center justify-center rounded-lg border text-xs",
                    bg,
                    color
                  )}
                >
                  <Icon className="size-3.5" />
                </span>
                <span className="font-heading text-lg font-bold text-foreground">
                  {weight}
                </span>
              </div>
              <p className="text-xs font-semibold text-foreground">{label}</p>
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                {detail}
              </p>
            </div>
          ))}
        </div>

        <div className="grid gap-3 rounded-2xl border border-border/60 bg-muted/20 p-4 text-xs sm:grid-cols-2">
          <div>
            <p className="font-semibold text-foreground">Standard Targets:</p>
            <p className="mt-0.5 text-muted-foreground">
              {policy.revisionTarget} revisions · {policy.practiceTarget}{" "}
              practice sessions per topic
            </p>
          </div>
          <div>
            <p className="font-semibold text-brand-amber-ink">
              High-Yield Targets:
            </p>
            <p className="mt-0.5 text-muted-foreground">
              {policy.highYieldRevisionTarget} revisions ·{" "}
              {policy.highYieldPracticeTarget} practice sessions
            </p>
          </div>
          <div>
            <p className="font-semibold text-foreground">Chapter Mock Tests:</p>
            <p className="mt-0.5 text-muted-foreground">
              {policy.chapterTestTarget} test attempt
              {policy.chapterTestTarget !== 1 ? "s" : ""} per chapter
            </p>
          </div>
          <div>
            <p className="font-semibold text-brand-violet-ink">
              Subject Tests:
            </p>
            <p className="mt-0.5 text-muted-foreground">
              {policy.subjectTestTarget} full-subject mock test
              {policy.subjectTestTarget !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
      </section>

      {/* 3. Foundation Readiness Levels */}
      <section
        aria-labelledby="foundation-explainer-title"
        className="space-y-4 border-t border-border/60 pt-6"
      >
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold tracking-wider text-brand-cyan-ink uppercase">
            <ShieldCheckIcon className="size-4" aria-hidden="true" />
            <span>Subject Foundation Readiness</span>
          </div>
          <h3
            id="foundation-explainer-title"
            className="mt-1 font-heading text-lg font-semibold text-foreground"
          >
            Readiness Tiers
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Foundation status dynamically reflects your current mastery level.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-2 rounded-2xl border border-border/60 bg-muted/20 p-4">
            <Badge
              variant="outline"
              className="rounded-full border-border bg-muted text-muted-foreground"
            >
              Beginner
            </Badge>
            <p className="text-xs text-muted-foreground">
              &lt; 50% weighted progress across syllabus requirements.
            </p>
          </div>

          <div className="space-y-2 rounded-2xl border border-border/60 bg-muted/20 p-4">
            <Badge
              variant="outline"
              className="rounded-full border-brand-amber-line bg-brand-amber-soft text-brand-amber-ink"
            >
              Moderate
            </Badge>
            <p className="text-xs text-muted-foreground">
              50% &ndash; 79% weighted progress. Strong topic coverage in
              progress.
            </p>
          </div>

          <div className="space-y-2 rounded-2xl border border-border/60 bg-muted/20 p-4">
            <Badge
              variant="outline"
              className="rounded-full border-success-line bg-success-soft text-success-ink"
            >
              Advanced
            </Badge>
            <p className="text-xs text-muted-foreground">
              &ge; 80% weighted progress with verified test evidence.
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
