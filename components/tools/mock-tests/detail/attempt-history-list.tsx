"use client"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  formatDuration,
  formatNumber,
} from "@/lib/tools/mock-tests/kind-labels"
import { workspaceRoutes } from "@/lib/routes/workspace-tools"
import type { AssessmentAttemptHistory } from "@/lib/tools/definitions/mock-tests/repository"
import { cn } from "@/lib/utils"

export function AttemptHistoryList({
  workspaceSlug,
  attempts,
  className,
}: {
  workspaceSlug: string
  assessmentId: string
  attempts: AssessmentAttemptHistory[]
  isPublished: boolean
  className?: string
}) {
  return (
    <section
      aria-label="Attempt history"
      className={cn("flex min-w-0 flex-col gap-4", className)}
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-heading text-base font-bold">Attempt History</h2>
        <Badge variant="outline">{attempts.length} attempts</Badge>
      </div>
      {attempts.length === 0 ? (
        <p className="py-4 text-sm text-muted-foreground">
          Your attempts and results will appear here after you start practising.
        </p>
      ) : (
        <div className="divide-y divide-border">
          {[...attempts]
            .sort((a, b) => b.attemptNumber - a.attemptNumber)
            .map((att) => (
              <article
                key={att.id}
                id={`attempt-card-${att.id}`}
                className="flex scroll-mt-24 flex-col gap-3 py-4 first:pt-0"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-semibold">
                      Attempt #{att.attemptNumber}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {new Date(att.startedAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  <Badge variant="outline" className="capitalize">
                    {att.status.replaceAll("_", " ")}
                  </Badge>
                </div>
                <dl className="grid grid-cols-3 gap-3 text-sm">
                  <div>
                    <dt className="text-xs text-muted-foreground">Score</dt>
                    <dd className="font-medium tabular-nums">
                      {att.score === null ? " - " : formatNumber(att.score)} /{" "}
                      {att.maxScore === null ? " - " : formatNumber(att.maxScore)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Accuracy</dt>
                    <dd>
                      {att.accuracyRate === null
                        ? " - "
                        : `${Math.round(att.accuracyRate)}%`}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">
                      Time taken
                    </dt>
                    <dd>
                      {att.durationSeconds === null
                        ? " - "
                        : formatDuration(att.durationSeconds)}
                    </dd>
                  </div>
                </dl>
                {att.status === "in_progress" ? (
                  <Button
                    variant="outline"
                    className="min-h-11 self-start"
                    render={
                      <Link
                        href={workspaceRoutes.mockTests.attempt(
                          workspaceSlug,
                          att.id
                        )}
                      />
                    }
                  >
                    Resume attempt
                  </Button>
                ) : att.status === "evaluated" || att.status === "submitted" ? (
                  <Button
                    variant="outline"
                    className="min-h-11 self-start"
                    render={
                      <Link
                        href={workspaceRoutes.mockTests.analysis(
                          workspaceSlug,
                          att.id
                        )}
                      />
                    }
                  >
                    Review attempt
                  </Button>
                ) : null}
              </article>
            ))}
        </div>
      )}
    </section>
  )
}
