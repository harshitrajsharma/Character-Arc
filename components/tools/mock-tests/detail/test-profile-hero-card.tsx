"use client"

import { useMemo, type ReactNode } from "react"
import Link from "next/link"
import {
  CalculatorIcon,
  ClockIcon,
  CopyIcon,
  FilePenLineIcon,
  FileTextIcon,
  GlobeIcon,
  PlayIcon,
  Share2Icon,
  TagIcon,
  TargetIcon,
  UserIcon,
  UsersIcon,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { formatNumber } from "@/lib/tools/mock-tests/kind-labels"
import { workspaceRoutes } from "@/lib/routes/workspace-tools"
import { RichContent } from "../editor/rich-content"
import { StartAttemptButton } from "../start-attempt-button"
import { PublishAssessmentButton } from "../publish-assessment-button"
import type {
  AssessmentDetail,
  AssessmentAttemptHistory,
  CommunityPaperDetailView,
  SectionDefinition,
} from "@/lib/tools/definitions/mock-tests/repository"

export type TestProfileHeroCardProps =
  | {
      mode: "workspace"
      workspaceSlug: string
      assessment: AssessmentDetail
      attempts: AssessmentAttemptHistory[]
      canWrite: boolean
      onOpenShare?: () => void
      children?: ReactNode
    }
  | {
      mode: "public"
      paper: CommunityPaperDetailView
      userWorkspaceSlug?: string
      isAuthorOrInSameWorkspace: boolean
      cloning?: boolean
      onCloneAndStart?: () => void
    }

const PAPER_TYPE_CONFIG: Record<
  string,
  { label: string; className: string }
> = {
  full_length: {
    label: "Full-Length Mock",
    className: "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  },
  multi_subject: {
    label: "Multi-Subject Mock",
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
    label: "PYQ (Previous Year)",
    className: "border-cyan-500/30 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300",
  },
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  draft: {
    label: "Draft",
    className: "border-border bg-muted/60 text-muted-foreground",
  },
  published: {
    label: "Published",
    className:
      "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold",
  },
  archived: {
    label: "Archived",
    className:
      "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  },
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—"
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date)
}

export function TestProfileHeroCard(props: TestProfileHeroCardProps) {
  const isWorkspace = props.mode === "workspace"

  const title = isWorkspace ? props.assessment.title : props.paper.title
  const summary = isWorkspace ? props.assessment.summary : props.paper.summary
  const instructions = isWorkspace
    ? props.assessment.instructions
    : props.paper.instructions
  const taxonomy = isWorkspace
    ? props.assessment.taxonomy
    : props.paper.taxonomy
  const calculatorAllowed = isWorkspace
    ? Boolean(props.assessment.calculatorAllowed)
    : Boolean(props.paper.calculatorAllowed)
  const durationMinutes = isWorkspace
    ? props.assessment.durationMinutes
    : props.paper.durationMinutes
  const totalMarks = isWorkspace
    ? props.assessment.totalMarks
    : props.paper.totalMarks
  const questionCount = isWorkspace
    ? props.assessment.questions.length
    : props.paper.questionCount
  const sections: SectionDefinition[] = isWorkspace
    ? props.assessment.sections
    : props.paper.sections
  const publishedAt = isWorkspace
    ? props.assessment.publishedAt
    : props.paper.publishedAt
  const authorName = isWorkspace
    ? props.assessment.authorName
    : props.paper.authorName
  const authorAvatarUrl = isWorkspace
    ? props.assessment.authorAvatarUrl
    : props.paper.authorAvatarUrl

  const ongoingAttempt = isWorkspace
    ? props.attempts.find((a) => a.status === "in_progress")
    : null

  const paperTypeCfg = taxonomy?.paperType
    ? PAPER_TYPE_CONFIG[taxonomy.paperType]
    : null

  const status = isWorkspace
    ? STATUS_CONFIG[props.assessment.status] ?? STATUS_CONFIG.draft
    : null

  const pacingEstimate = useMemo(() => {
    if (!durationMinutes || questionCount === 0) return null
    const minsPerQ = durationMinutes / questionCount
    if (minsPerQ < 1) {
      return `~${Math.round(minsPerQ * 60)}s / question`
    }
    return `~${Math.round(minsPerQ * 10) / 10}m / question`
  }, [durationMinutes, questionCount])

  const rawDescription = isWorkspace
    ? instructions?.trim() ||
      summary?.trim() ||
      (props.assessment.status === "published"
        ? "This is a comprehensive mock test. Attempt all questions under timed CBT conditions to track your progress and evaluate your readiness."
        : "Draft mode: organize sections, adjust marks, and publish when the paper is ready.")
    : summary?.trim() ||
      instructions?.trim() ||
      "Comprehensive mock test paper available for cohort benchmark practice."

  const hasHtml = /<[a-z][\s\S]*>/i.test(rawDescription)

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-xs divide-y divide-border antialiased">
      {/* ── Segment 1: Identity & Taxonomy ── */}
      <div className="flex flex-col gap-4 p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {paperTypeCfg ? (
              <Badge
                variant="outline"
                className={cn("text-xs font-semibold rounded-full px-3 py-1", paperTypeCfg.className)}
              >
                {paperTypeCfg.label}
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="text-xs font-semibold rounded-full px-3 py-1 border-border bg-muted/60 text-muted-foreground"
              >
                Standard Mock Test
              </Badge>
            )}

            {taxonomy?.examTag && (
              <span className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-foreground bg-muted border border-border rounded-full px-3 py-0.5">
                <TagIcon className="size-3 text-muted-foreground" />
                {taxonomy.examTag}
              </span>
            )}

            {isWorkspace && status ? (
              <>
                <Badge
                  variant="outline"
                  className={cn("text-xs font-semibold rounded-full px-2.5 py-0.5", status.className)}
                >
                  {status.label}
                </Badge>
                <span className="text-xs text-muted-foreground font-mono">
                  Rev {props.assessment.revision}
                </span>
              </>
            ) : (
              <Badge
                variant="outline"
                className="border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300 gap-1 text-xs font-semibold rounded-full px-2.5 py-0.5"
              >
                <GlobeIcon className="size-3" />
                Public Community Paper
              </Badge>
            )}
          </div>

          <span className="text-xs text-muted-foreground font-mono">
            {publishedAt
              ? `Published ${formatDate(publishedAt)}`
              : isWorkspace
                ? `Created ${formatDate(props.assessment.createdAt)}`
                : "—"}
          </span>
        </div>

        {/* Paper Title & Description */}
        <div className="space-y-2">
          <h1 className="font-heading font-bold text-2xl sm:text-3xl text-foreground leading-tight break-words">
            {title}
          </h1>

          {hasHtml ? (
            <RichContent
              html={rawDescription}
              className="text-xs sm:text-sm text-muted-foreground leading-relaxed line-clamp-3 max-w-3xl"
            />
          ) : (
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap line-clamp-3 max-w-3xl">
              {rawDescription}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
            {calculatorAllowed ? (
              <span className="inline-flex items-center gap-1 text-xs font-mono font-semibold text-cyan-700 dark:text-cyan-400 border border-cyan-500/30 rounded-full px-2.5 py-0.5 bg-cyan-500/10">
                <CalculatorIcon className="size-3" />
                Calculator Allowed
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs font-mono text-muted-foreground border border-border/80 rounded-full px-2.5 py-0.5 bg-muted/30">
                <CalculatorIcon className="size-3 opacity-60" />
                No Calculator
              </span>
            )}

        </div>

        {/* Subject Chips */}
        {taxonomy?.subjects && taxonomy.subjects.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {taxonomy.subjects.map((subj, idx) => (
              <span
                key={idx}
                className="text-xs font-medium text-foreground/80 bg-muted/60 px-2.5 py-1 rounded-lg border border-border/60"
              >
                {subj}
              </span>
            ))}
          </div>
        )}

        {/* Author & Workspace Attribution */}
        {(authorName || (!isWorkspace && props.paper.workspaceName)) && (
          <div className="flex items-center gap-2.5 pt-1">
            <div className="size-7 rounded-full bg-muted flex items-center justify-center text-muted-foreground overflow-hidden text-[10px] font-bold border border-border/80 shrink-0">
              {authorAvatarUrl ? (
                <img
                  src={authorAvatarUrl}
                  alt={authorName ?? "Author"}
                  className="size-full object-cover"
                />
              ) : authorName ? (
                authorName.slice(0, 2).toUpperCase()
              ) : (
                <UserIcon className="size-3.5" />
              )}
            </div>
            <div className="min-w-0 text-xs">
              <span className="font-semibold text-foreground">
                {authorName ? `Authored by ${authorName}` : "Workspace Paper"}
              </span>
              {!isWorkspace && props.paper.workspaceName && (
                <span className="text-muted-foreground ml-1.5 text-[11px]">
                  • {props.paper.workspaceName}
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Segment 2: 4-Column Key Metrics Grid ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 bg-muted/15 [&>div]:border-border [&>div:nth-child(even)]:border-l [&>div:nth-child(n+3)]:border-t lg:[&>div:nth-child(n+3)]:border-t-0 lg:[&>div+div]:border-l">
        {/* Col 1: Questions & Structure */}
        <div className="p-4 sm:p-5 space-y-1">
          <span className="text-[11px] font-semibold text-muted-foreground block">
            Questions &amp; Structure
          </span>
          <div className="text-2xl font-mono font-bold text-foreground flex items-center gap-1.5">
            <FileTextIcon className="size-4 text-muted-foreground/70" />
            {questionCount}
          </div>
          <p className="text-[11px] text-muted-foreground line-clamp-1">
            {sections && sections.length > 0
              ? `${sections.length} ${sections.length === 1 ? "Section" : "Sections"} • `
              : ""}
            {questionCount === 1 ? "1 question" : `${questionCount} questions`}
          </p>
        </div>

        {/* Col 2: Duration & Pacing */}
        <div className="p-4 sm:p-5 space-y-1">
          <span className="text-[11px] font-semibold text-muted-foreground block">
            Duration &amp; Pacing
          </span>
          <div className="text-2xl font-mono font-bold text-foreground flex items-center gap-1.5">
            <ClockIcon className="size-4 text-muted-foreground/70" />
            {durationMinutes ? `${durationMinutes}m` : "Untimed"}
          </div>
          <p className="text-[11px] text-muted-foreground">
            {pacingEstimate ?? "Self-paced practice"}
          </p>
        </div>

        {/* Col 3: Maximum Marks */}
        <div className="p-4 sm:p-5 space-y-1">
          <span className="text-[11px] font-semibold text-muted-foreground block">
            Maximum Marks
          </span>
          <div className="text-2xl font-mono font-bold text-foreground flex items-center gap-1.5">
            <TargetIcon className="size-4 text-muted-foreground/70" />
            {totalMarks !== null && totalMarks !== undefined
              ? formatNumber(totalMarks)
              : "—"}
          </div>
          <p className="text-[11px] text-muted-foreground">
            Standard negative penalty
          </p>
        </div>

        {/* Col 4: Performance Cut-offs (workspace) OR Cohort Attempts (public) */}
        {isWorkspace ? (
          <div className="p-4 sm:p-5 space-y-1">
            <span className="text-[11px] font-semibold text-muted-foreground block">
              Performance Cut-offs
            </span>
            <div className="text-2xl font-mono font-bold text-foreground">
              {props.assessment.passingBenchmark ?? 33}%{" "}
              <span className="text-sm font-sans font-medium text-muted-foreground">
                /
              </span>{" "}
              {props.assessment.distinctionBenchmark ?? 70}%
            </div>
            <p className="text-[11px] text-muted-foreground">
              Passing &amp; Distinction targets
            </p>
          </div>
        ) : (
          <div className="p-4 sm:p-5 space-y-1">
            <span className="text-[11px] font-semibold text-muted-foreground block">
              Cohort Attempts
            </span>
            <div className="text-2xl font-mono font-bold text-foreground flex items-center gap-1.5">
              <UsersIcon className="size-4 text-muted-foreground/70" />
              {props.paper.attemptsCount}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Avg Score:{" "}
              {props.paper.avgScorePercentage !== null
                ? `${Math.round(props.paper.avgScorePercentage)}%`
                : "—"}
            </p>
          </div>
        )}
      </div>

      {/* ── Segment 3: Integrated Action & State Ribbon ── */}
      <div className="p-4 sm:p-5 bg-card/60 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        {/* Left: Ongoing attempt alert or contextual status */}
        <div className="min-w-0">
          {ongoingAttempt ? (
            <div className="flex items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3.5 py-2.5 shadow-2xs">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/20 text-amber-700 dark:text-amber-400">
                <ClockIcon className="size-4" />
              </div>
              <div className="min-w-0">
                <span className="text-xs font-bold text-amber-900 dark:text-amber-300 block truncate">
                  Attempt #{ongoingAttempt.attemptNumber} in progress
                </span>
                <span className="text-[11px] text-amber-700 dark:text-amber-400/80 block truncate">
                  Started on {formatDate(ongoingAttempt.startedAt)}
                </span>
              </div>
              <Button
                size="xs"
                className="ml-2 h-7 px-3 rounded-lg text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shrink-0 shadow-xs"
                render={
                  <Link
                    href={`/assessments/${encodeURIComponent(ongoingAttempt.id)}`}
                  />
                }
              >
                Resume Attempt →
              </Button>
            </div>
          ) : isWorkspace ? (
            <div className="text-xs text-muted-foreground flex items-center gap-2">
              <span
                className={cn(
                  "size-2 rounded-full shrink-0",
                  props.assessment.status === "published"
                    ? "bg-emerald-500"
                    : "bg-muted-foreground/60"
                )}
              />
              <span>
                {props.assessment.status === "published"
                  ? "CBT test room is ready. Timer initiates immediately upon launch."
                  : props.assessment.status === "archived"
                    ? "Archived test paper. Available as read-only historical reference."
                    : "Draft paper. Configure questions and sections before publishing."}
              </span>
            </div>
          ) : (
            <div className="text-xs text-muted-foreground flex items-center gap-2">
              <span className="size-2 rounded-full bg-sky-500 shrink-0" />
              <span>
                Community assessment available for instant practice or workspace duplication.
              </span>
            </div>
          )}
        </div>

        {/* Right: Primary and Secondary Action CTAs */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {isWorkspace ? (
            props.assessment.status === "published" ? (
              <>
                {props.canWrite && (
                  <>
                    <Button
                      variant="outline"
                      size="default"
                      className="h-10 px-4 rounded-xl text-xs font-semibold gap-1.5 border-border hover:bg-muted/30"
                      render={
                        <Link
                          href={workspaceRoutes.mockTests.edit(
                            props.workspaceSlug,
                            props.assessment.id
                          )}
                        />
                      }
                    >
                      <FilePenLineIcon className="size-3.5" />
                      Edit Paper in Builder
                    </Button>
                    {props.onOpenShare && (
                      <Button
                        variant="outline"
                        size="default"
                        onClick={props.onOpenShare}
                        className="h-10 px-4 rounded-xl text-xs font-semibold gap-1.5 border-border hover:bg-muted/30"
                      >
                        <Share2Icon className="size-3.5" />
                        Share &amp; Distribute
                      </Button>
                    )}
                  </>
                )}
                {!ongoingAttempt && <StartAttemptButton
                  workspaceSlug={props.workspaceSlug}
                  assessmentId={props.assessment.id}
                  size="default"
                  label={
                    props.attempts.length > 0
                      ? "Start New Attempt"
                      : "Start Mock Test"
                  }
                  className="h-10 px-5 rounded-xl text-xs font-bold bg-foreground text-background hover:bg-foreground/90 shadow-xs"
                />}
              </>
            ) : props.canWrite ? (
              <>
                <Button
                  variant="outline"
                  size="default"
                  className="h-10 px-4 rounded-xl text-xs font-semibold gap-1.5 border-border hover:bg-muted/30"
                  render={
                    <Link
                      href={workspaceRoutes.mockTests.edit(
                        props.workspaceSlug,
                        props.assessment.id
                      )}
                    />
                  }
                >
                  <FilePenLineIcon className="size-3.5" />
                  Edit Paper in Builder
                </Button>
                <PublishAssessmentButton
                  workspaceSlug={props.workspaceSlug}
                  assessmentId={props.assessment.id}
                  expectedRevision={props.assessment.revision}
                  className="h-10 px-4 rounded-xl text-xs font-semibold"
                />
              </>
            ) : null
          ) : (
            <>
              {props.paper.allowCloning && props.userWorkspaceSlug && (
                <Button
                  variant="outline"
                  disabled={props.cloning}
                  onClick={props.onCloneAndStart}
                  className="h-10 rounded-xl px-4 text-xs font-semibold gap-1.5 border-border hover:bg-muted/50"
                >
                  <CopyIcon className="size-3.5" />
                  {props.cloning ? "Cloning..." : "Clone to My Workspace"}
                </Button>
              )}

              {props.isAuthorOrInSameWorkspace && props.userWorkspaceSlug ? (
                <Button
                  className="h-10 rounded-xl px-5 text-xs font-bold bg-foreground text-background hover:bg-foreground/90 gap-1.5 shadow-xs transition-opacity"
                  render={
                    <Link
                      href={workspaceRoutes.mockTests.detail(
                        props.userWorkspaceSlug,
                        props.paper.id
                      )}
                    />
                  }
                >
                  <PlayIcon className="size-3.5 fill-current" />
                  Open in Workspace
                </Button>
              ) : (
                <Button
                  disabled={props.cloning}
                  onClick={props.onCloneAndStart}
                  className="h-10 rounded-xl px-5 text-xs font-bold bg-foreground text-background hover:bg-foreground/90 gap-1.5 shadow-xs transition-opacity"
                >
                  <PlayIcon className="size-3.5 fill-current" />
                  {props.cloning ? "Preparing Paper..." : "Take Mock Test"}
                </Button>
              )}
            </>
          )}
        </div>
      </div>
      {isWorkspace && props.children ? <div>{props.children}</div> : null}
    </div>
  )
}
