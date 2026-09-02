import { CheckCircle2Icon, Clock3Icon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import type {
  ExamSubjectRecommendationLane,
  ExamSubjectRecommendationsOutput,
} from "@/lib/tools/exam-prep/recommendations"

import { RecommendationLane } from "./recommendation-lane"
import { RecommendationRail } from "./recommendation-rail"

export interface ExamSubjectRecommendationsProps {
  workspaceSlug: string
  examId: string
  output: ExamSubjectRecommendationsOutput & {
    asOf?: string | number | Date
    totalVisible?: number
  }
}

const asOfFormatter = new Intl.DateTimeFormat("en", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
})

function formatAsOf(value: string | number | Date) {
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime())
    ? "Latest progress"
    : `As of ${asOfFormatter.format(date)}`
}

function CompletedRecommendations() {
  return (
    <Card size="sm">
      <CardHeader>
        <div className="flex size-10 items-center justify-center rounded-md bg-success-soft text-success-ink">
          <CheckCircle2Icon className="size-5" aria-hidden="true" />
        </div>
        <CardTitle>All caught up</CardTitle>
        <CardDescription>
          Every subject is complete across learning, revision, practice, and
          testing.
        </CardDescription>
        <CardAction>
          <Badge variant="outline">Complete</Badge>
        </CardAction>
      </CardHeader>
      <CardContent>
        <p className="text-sm leading-6 text-muted-foreground">
          Keep your progress current by recording future revision and test
          attempts as you prepare for the exam.
        </p>
      </CardContent>
    </Card>
  )
}

export function ExamSubjectRecommendations({
  workspaceSlug,
  examId,
  output,
}: ExamSubjectRecommendationsProps) {
  const hasRecommendations =
    output.groups.revise.length > 0 ||
    output.groups["priority-focus"].length > 0 ||
    output.groups["start-next"].length > 0 ||
    output.groups["test-progress"].length > 0

  const visibleCount =
    output.totalVisible ??
    Object.values(output.groups).reduce(
      (total, recommendations) => total + recommendations.length,
      0
    )

  if (!output.isComplete && visibleCount === 0 && !hasRecommendations) {
    return null
  }

  const lanes: Array<{
    lane: ExamSubjectRecommendationLane
    items: ExamSubjectRecommendationsOutput["groups"][keyof ExamSubjectRecommendationsOutput["groups"]]
  }> = [
    { lane: "revise", items: output.groups.revise },
    {
      lane: "priority-focus",
      items: output.groups["priority-focus"],
    },
    { lane: "start-next", items: output.groups["start-next"] },
    { lane: "test-progress", items: output.groups["test-progress"] },
  ]

  return (
    <section
      aria-labelledby="exam-recommendations-heading"
      className="flex min-w-0 flex-col gap-3.5"
    >
      <div className="flex items-center justify-between gap-3">
        <h2
          id="exam-recommendations-heading"
          className="min-w-0 font-heading text-lg font-semibold text-foreground"
        >
          Recommended next
        </h2>
        {output.asOf ? (
          <Badge variant="outline" className="shrink-0">
            <Clock3Icon data-icon="inline-start" aria-hidden="true" />
            {formatAsOf(output.asOf)}
          </Badge>
        ) : null}
      </div>

      {output.isComplete ? (
        <CompletedRecommendations />
      ) : (
        <RecommendationRail labelledBy="exam-recommendations-heading">
          {lanes.map(({ lane, items }) => (
            <RecommendationLane
              key={lane}
              workspaceSlug={workspaceSlug}
              examId={examId}
              lane={lane}
              items={items}
            />
          ))}
        </RecommendationRail>
      )}
    </section>
  )
}
