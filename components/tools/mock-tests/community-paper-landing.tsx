"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArrowLeftIcon,
  AwardIcon,
  LayersIcon,
  Share2Icon,
  TrophyIcon,
} from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { formatNumber } from "@/lib/tools/mock-tests/kind-labels"
import { workspaceRoutes } from "@/lib/routes/workspace-tools"
import { cloneAssessmentAction } from "@/lib/tools/mock-tests/actions/assessment-actions"
import { TestProfileHeroCard } from "./detail/test-profile-hero-card"
import type {
  CommunityLeaderboardEntry,
  CommunityPaperDetailView,
} from "@/lib/tools/definitions/mock-tests/repository"

function formatDuration(seconds: number | null) {
  if (!seconds || seconds <= 0) return "—"
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  if (mins < 60) return `${mins}m ${secs}s`
  const hrs = Math.floor(mins / 60)
  const remMins = mins % 60
  return `${hrs}h ${remMins}m`
}

function formatDate(iso: string | null) {
  if (!iso) return "—"
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(d)
}

export function CommunityPaperLanding({
  paper,
  leaderboard,
  userWorkspaceSlug,
  isAuthorOrInSameWorkspace,
}: {
  paper: CommunityPaperDetailView
  leaderboard: CommunityLeaderboardEntry[]
  userWorkspaceSlug?: string
  isAuthorOrInSameWorkspace: boolean
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [cloning, setCloning] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleShareCopy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      toast.success("Public test link copied!")
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error("Failed to copy link")
    }
  }

  const handleCloneAndStart = () => {
    if (!userWorkspaceSlug) {
      toast.error("No active workspace found to clone this mock test.")
      return
    }

    setCloning(true)
    startTransition(async () => {
      try {
        const result = await cloneAssessmentAction({
          workspaceSlug: userWorkspaceSlug,
          sourceAssessmentId: paper.id,
        })
        toast.success("Mock test cloned to your workspace as draft!")
        router.push(
          workspaceRoutes.mockTests.detail(userWorkspaceSlug, result.assessmentId)
        )
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to clone mock test."
        )
        setCloning(false)
      }
    })
  }

  return (
    <div className="space-y-8 font-sans antialiased text-foreground pb-16">
      {/* ── 1. NAVIGATION BAR CRUMB ── */}
      <div className="flex items-center justify-between">
        {userWorkspaceSlug ? (
          <Link
            href={workspaceRoutes.mockTests.home(userWorkspaceSlug)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeftIcon className="size-3.5" />
            Back to Mock Tests
          </Link>
        ) : (
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeftIcon className="size-3.5" />
            Back to Dashboard
          </Link>
        )}

        <Button
          variant="outline"
          size="xs"
          onClick={handleShareCopy}
          className="h-8 rounded-full px-3 text-xs font-medium gap-1.5 border-border hover:bg-muted/40"
        >
          <Share2Icon className="size-3" />
          {copied ? "Link Copied!" : "Share Paper"}
        </Button>
      </div>

      {/* ── 2. UNIFIED TEST PROFILE HERO CARD ── */}
      <TestProfileHeroCard
        mode="public"
        paper={paper}
        userWorkspaceSlug={userWorkspaceSlug}
        isAuthorOrInSameWorkspace={isAuthorOrInSameWorkspace}
        cloning={cloning || isPending}
        onCloneAndStart={handleCloneAndStart}
      />

      {/* ── 3. SYLLABUS / SECTION BREAKDOWN ── */}
      {paper.sections && paper.sections.length > 0 && (
        <section aria-labelledby="syllabus-title" className="space-y-3">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h2
              id="syllabus-title"
              className="font-heading text-lg font-bold text-foreground flex items-center gap-2"
            >
              <LayersIcon className="size-4 text-foreground" />
              Syllabus &amp; Section Structure
            </h2>
            <span className="text-xs text-muted-foreground font-mono">
              {paper.sections.length} sections defined
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {paper.sections.map((sec, idx) => {
              const secQuestions = paper.questionsPreview.filter(
                (q) => q.section === sec.key
              )
              const totalSecMarks = secQuestions.reduce((a, b) => a + b.marks, 0)

              return (
                <div
                  key={sec.key || idx}
                  className="rounded-2xl border border-border bg-card p-4 space-y-2 shadow-2xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono font-bold text-muted-foreground uppercase">
                      Section {idx + 1}
                    </span>
                    <span className="text-[11px] font-mono text-foreground font-semibold">
                      {secQuestions.length} Qs • {totalSecMarks} Marks
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-foreground">
                    {sec.title}
                  </h3>
                  {sec.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {sec.description}
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* ── 4. COHORT LEADERBOARD TABLE ── */}
      <section aria-labelledby="leaderboard-title" className="space-y-3">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div>
            <h2
              id="leaderboard-title"
              className="font-heading text-lg font-bold text-foreground flex items-center gap-2"
            >
              <TrophyIcon className="size-4 text-amber-500" />
              Cohort Test Leaderboard
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Top verified scores achieved by candidates attempting this paper.
            </p>
          </div>
          <span className="text-xs text-muted-foreground font-mono">
            {leaderboard.length} ranked
          </span>
        </div>

        {leaderboard.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center space-y-2">
            <div className="mx-auto size-10 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground">
              <AwardIcon className="size-5" />
            </div>
            <p className="text-sm font-bold text-foreground">
              No evaluated attempts yet
            </p>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Be the first candidate to take this paper and claim rank #1 on the cohort leaderboard!
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-xs">
            <div className="hidden border-b border-border bg-muted/40 px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground sm:grid sm:grid-cols-[70px_1.5fr_120px_120px_130px] sm:items-center sm:gap-4">
              <span>Rank</span>
              <span>Candidate</span>
              <span className="text-right">Score</span>
              <span className="text-right">Time Taken</span>
              <span className="text-right">Attempt Date</span>
            </div>

            <div className="divide-y divide-border">
              {leaderboard.map((entry) => {
                const isGold = entry.rank === 1
                const isSilver = entry.rank === 2
                const isBronze = entry.rank === 3

                return (
                  <div
                    key={entry.attemptId}
                    className="grid gap-2 p-4 text-xs sm:grid-cols-[70px_1.5fr_120px_120px_130px] sm:items-center sm:gap-4 hover:bg-muted/20 transition-colors"
                  >
                    {/* Rank Indicator */}
                    <div className="flex items-center">
                      {isGold ? (
                        <span className="inline-flex items-center justify-center size-7 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 font-bold font-mono text-xs">
                          #1
                        </span>
                      ) : isSilver ? (
                        <span className="inline-flex items-center justify-center size-7 rounded-full bg-zinc-200 dark:bg-zinc-800 border border-zinc-400/30 text-zinc-700 dark:text-zinc-300 font-bold font-mono text-xs">
                          #2
                        </span>
                      ) : isBronze ? (
                        <span className="inline-flex items-center justify-center size-7 rounded-full bg-amber-700/10 border border-amber-700/30 text-amber-800 dark:text-amber-300 font-bold font-mono text-xs">
                          #3
                        </span>
                      ) : (
                        <span className="inline-flex items-center justify-center size-7 text-muted-foreground font-mono font-medium text-xs">
                          #{entry.rank}
                        </span>
                      )}
                    </div>

                    {/* Candidate Name & Avatar */}
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="size-6 rounded-full bg-muted flex items-center justify-center text-muted-foreground overflow-hidden text-[10px] font-bold shrink-0">
                        {entry.userAvatarUrl ? (
                          <img
                            src={entry.userAvatarUrl}
                            alt={entry.userName}
                            className="size-full object-cover"
                          />
                        ) : (
                          entry.userName.slice(0, 2).toUpperCase()
                        )}
                      </div>
                      <span className="font-bold text-foreground truncate">
                        {entry.userName}
                      </span>
                    </div>

                    {/* Score & Accuracy */}
                    <div className="sm:text-right font-mono font-bold text-foreground">
                      {entry.score !== null ? formatNumber(entry.score) : "—"}
                      {entry.maxScore !== null ? ` / ${formatNumber(entry.maxScore)}` : ""}
                      {entry.percentage !== null && (
                        <span className="ml-1 text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold">
                          ({entry.percentage}%)
                        </span>
                      )}
                    </div>

                    {/* Time Taken */}
                    <div className="sm:text-right text-muted-foreground font-mono">
                      {formatDuration(entry.timeSpentSeconds)}
                    </div>

                    {/* Date */}
                    <div className="sm:text-right text-muted-foreground font-mono text-[11px]">
                      {formatDate(entry.submittedAt)}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
