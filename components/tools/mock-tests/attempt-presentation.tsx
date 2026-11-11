import Link from "next/link"
import { ArrowRightIcon, PlayIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { formatNumber } from "@/lib/tools/mock-tests/kind-labels"
import { cn } from "@/lib/utils"

export type AttemptStatus =
  "in_progress" | "submitted" | "evaluated" | "abandoned"
const labels: Record<AttemptStatus, string> = {
  in_progress: "In progress",
  submitted: "Submitted",
  evaluated: "Evaluated",
  abandoned: "Abandoned",
}

export function AttemptStatusBadge({ status }: { status: AttemptStatus }) {
  return (
    <Badge
      variant="secondary"
      className={cn(
        status === "evaluated" && "bg-success-soft text-success-ink"
      )}
    >
      {labels[status]}
    </Badge>
  )
}

export function AttemptScoreValue({
  score,
  maxScore,
}: {
  score: number | null
  maxScore: number | null
}) {
  return (
    <>
      {score === null ? "—" : formatNumber(score)}
      {maxScore !== null ? ` / ${formatNumber(maxScore)}` : ""}
    </>
  )
}

export function AttemptResultSummary({
  status,
  score,
  maxScore,
  percentage,
}: {
  status: AttemptStatus
  score: number | null
  maxScore: number | null
  percentage: number | null
}) {
  if (status !== "evaluated" || score === null)
    return (
      <span className="text-xs text-muted-foreground">
        {status === "submitted"
          ? "Awaiting evaluation"
          : status === "abandoned"
            ? "Not completed"
            : status === "in_progress"
              ? "In progress"
              : "Score unavailable"}
      </span>
    )
  return (
    <>
      <span className="text-base font-semibold">
        <AttemptScoreValue score={score} maxScore={maxScore} />
      </span>
      <span className="text-xs text-muted-foreground">
        {percentage !== null
          ? `${Math.round(percentage)}% score`
          : "Score recorded"}
      </span>
    </>
  )
}

/** Caller chooses the authorized destination; this view never creates an attempt. */
export function AttemptAction({
  href,
  action,
  label,
  accessibleLabel,
  className,
}: {
  href: string
  action: "resume" | "review"
  label?: string
  accessibleLabel: string
  className?: string
}) {
  return (
    <Link
      href={href}
      aria-label={accessibleLabel}
      className={cn(
        buttonVariants({
          variant: action === "resume" ? "default" : "outline",
          size: "sm",
        }),
        "h-11 shrink-0",
        className
      )}
    >
      {action === "resume" ? (
        <PlayIcon data-icon="inline-start" aria-hidden="true" />
      ) : null}
      {label ?? (action === "resume" ? "Resume" : "Review")}
      {action === "review" ? (
        <ArrowRightIcon data-icon="inline-end" aria-hidden="true" />
      ) : null}
    </Link>
  )
}
