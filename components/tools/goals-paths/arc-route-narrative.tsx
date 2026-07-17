import {
  ArrowRightIcon,
  CheckIcon,
  CircleDotIcon,
  CompassIcon,
  FlagIcon,
  FootprintsIcon,
  MapIcon,
  RouteIcon,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { MarkdownContent } from "@/components/editor/markdown-content"

export type ArcPathOption = {
  id: string
  title: string
  rationale?: string | null
  tradeoffs?: string[]
  confidence?: number | null
}

export type ArcMilestone = {
  id: string
  title: string
  successCriteria?: string | null
  targetDate?: string | null
  completed?: boolean
  actions?: Array<{
    id: string
    title: string
    definitionOfDone?: string | null
    dueDate?: string | null
    completed?: boolean
  }>
}

export type ArcNarrativeCheckIn = {
  id: string
  note?: string | null
  progressPercent?: number | null
  createdAt: string
}

type ArcRouteNarrativeProps = {
  currentReality: string
  objective: string
  why?: string | null
  constraints?: string[]
  paths?: ArcPathOption[]
  milestones?: ArcMilestone[]
  checkIns?: ArcNarrativeCheckIn[]
  progressPercent?: number | null
}

const SHORT_DATE_FORMATTER = new Intl.DateTimeFormat("en", {
  day: "numeric",
  month: "short",
})

function NarrativeMarker({
  icon: Icon,
  label,
}: {
  icon: typeof CircleDotIcon
  label: string
}) {
  return (
    <span
      className="relative z-10 flex size-9 items-center justify-center rounded-full border border-brand-neon-line bg-background text-brand-neon-ink"
      aria-label={label}
    >
      <Icon className="size-4" aria-hidden="true" />
    </span>
  )
}

export function ArcRouteNarrative({
  currentReality,
  objective,
  why,
  constraints = [],
  paths = [],
  milestones = [],
  checkIns = [],
  progressPercent = 0,
}: ArcRouteNarrativeProps) {
  const completedMilestones = milestones.filter(
    (milestone) => milestone.completed
  ).length
  const latestCheckIn = checkIns[0]
  const progress = Math.min(100, Math.max(0, progressPercent ?? 0))

  return (
    <section aria-label="Arc route" className="relative min-w-0">
      <span
        aria-hidden="true"
        className="absolute top-5 bottom-5 left-[1.0625rem] w-px bg-brand-neon-line"
      />

      <div className="relative grid grid-cols-[2.25rem_minmax(0,1fr)] gap-x-4">
        <NarrativeMarker icon={CircleDotIcon} label="Current reality" />
        <section aria-labelledby="reality-title" className="min-w-0 pb-11">
          <p className="text-xs font-medium text-brand-neon-ink">
            Where you are
          </p>
          <h2
            id="reality-title"
            className="mt-1 font-heading text-xl font-semibold"
          >
            Current reality
          </h2>
          <MarkdownContent
            markdown={currentReality}
            className="mt-4 max-w-3xl text-base text-muted-foreground"
          />

          {constraints.length ? (
            <div className="mt-5">
              <p className="text-sm font-medium">Known constraints</p>
              <ul className="mt-2 flex flex-wrap gap-2">
                {constraints.map((constraint) => (
                  <li key={constraint}>
                    <Badge
                      variant="secondary"
                      className="h-auto py-1 whitespace-normal"
                    >
                      {constraint}
                    </Badge>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>

        <NarrativeMarker icon={FootprintsIcon} label="Current progress" />
        <section aria-labelledby="progress-title" className="min-w-0 pb-11">
          <p className="text-xs font-medium text-brand-neon-ink">
            What is moving
          </p>
          <h2
            id="progress-title"
            className="mt-1 font-heading text-xl font-semibold"
          >
            Current progress
          </h2>

          <div className="mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="font-mono text-3xl font-semibold">
              {Math.round(progress)}%
            </span>
            <span className="text-sm text-muted-foreground">
              {milestones.length
                ? `${completedMilestones} of ${milestones.length} milestones complete`
                : `${checkIns.length} check-in ${checkIns.length === 1 ? "signal" : "signals"} recorded`}
            </span>
          </div>

          {latestCheckIn?.note ? (
            <blockquote className="mt-4 border-l-2 border-brand-neon-line pl-4 text-sm leading-6 text-muted-foreground">
              &ldquo;{latestCheckIn.note}&rdquo;
              <footer className="mt-1 text-xs">
                Check-in from{" "}
                {SHORT_DATE_FORMATTER.format(new Date(latestCheckIn.createdAt))}
              </footer>
            </blockquote>
          ) : (
            <p className="mt-4 text-sm leading-6 text-muted-foreground">
              No check-in yet. Record the first honest signal from the route.
            </p>
          )}

          {paths.length ? (
            <div className="mt-7">
              <div className="flex items-center gap-2">
                <CompassIcon
                  className="size-4 text-muted-foreground"
                  aria-hidden="true"
                />
                <h3 className="font-heading text-base font-medium">
                  Possible routes
                </h3>
              </div>
              <div className="mt-3 border-y border-border">
                {paths.map((path) => (
                  <article
                    key={path.id}
                    className="grid gap-2 border-b border-border py-4 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_auto]"
                  >
                    <div className="min-w-0">
                      <h4 className="font-medium">{path.title}</h4>
                      {path.rationale ? (
                        <p className="mt-1 text-sm leading-6 text-muted-foreground">
                          {path.rationale}
                        </p>
                      ) : null}
                    </div>
                    {path.confidence != null ? (
                      <Badge variant="outline" className="mt-0.5">
                        {Math.round(path.confidence)}% confidence
                      </Badge>
                    ) : null}
                  </article>
                ))}
              </div>
            </div>
          ) : (
            <div className="mt-6 flex items-start gap-3 border-y border-border py-4">
              <MapIcon
                className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                aria-hidden="true"
              />
              <div>
                <p className="text-sm font-medium">The route is still open</p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  Use check-ins to gather evidence before committing to a path.
                </p>
              </div>
            </div>
          )}

          {milestones.length ? (
            <div className="mt-7">
              <div className="flex items-center gap-2">
                <RouteIcon
                  className="size-4 text-muted-foreground"
                  aria-hidden="true"
                />
                <h3 className="font-heading text-base font-medium">
                  Milestones
                </h3>
              </div>
              <ol className="mt-3 border-y border-border">
                {milestones.map((milestone) => (
                  <li
                    key={milestone.id}
                    className="grid grid-cols-[1.5rem_minmax(0,1fr)] gap-3 border-b border-border py-4 last:border-b-0"
                  >
                    <span className="flex size-6 items-center justify-center rounded-full bg-muted text-muted-foreground">
                      {milestone.completed ? (
                        <CheckIcon className="size-3.5" aria-hidden="true" />
                      ) : (
                        <ArrowRightIcon
                          className="size-3.5"
                          aria-hidden="true"
                        />
                      )}
                    </span>
                    <div className="min-w-0">
                      <p className="font-medium">{milestone.title}</p>
                      {milestone.successCriteria ? (
                        <p className="mt-1 text-sm leading-6 text-muted-foreground">
                          Done when {milestone.successCriteria}
                        </p>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          ) : null}
        </section>

        <NarrativeMarker icon={FlagIcon} label="Outcome" />
        <section aria-labelledby="outcome-title" className="min-w-0">
          <p className="text-xs font-medium text-brand-neon-ink">
            Where this leads
          </p>
          <h2
            id="outcome-title"
            className="mt-1 font-heading text-xl font-semibold"
          >
            Outcome
          </h2>
          <MarkdownContent
            markdown={objective}
            className="mt-4 max-w-3xl text-base"
          />
          {why ? (
            <div className="mt-5 border-l-2 border-border pl-4">
              <p className="text-xs font-medium text-muted-foreground">
                Why it matters
              </p>
              <MarkdownContent
                markdown={why}
                className="mt-1 text-sm text-muted-foreground"
              />
            </div>
          ) : null}
        </section>
      </div>
    </section>
  )
}
