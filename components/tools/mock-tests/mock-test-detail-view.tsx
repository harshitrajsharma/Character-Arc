"use client"

import { useState, useMemo } from "react"
import { LayersIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { formatNumber } from "@/lib/tools/mock-tests/kind-labels"
import { TestProfileHeroCard } from "./detail/test-profile-hero-card"
import { QuestionPaperRoster } from "./detail/question-paper-roster"
import { ScoreTrajectoryGraph } from "./detail/score-trajectory-graph"
import { AttemptHistoryList } from "./detail/attempt-history-list"
import { ShareAssessmentDialog } from "./share-assessment-dialog"
import type {
  AssessmentDetail,
  AssessmentAttemptHistory,
  AssessmentQuestionView,
  SectionDefinition,
} from "@/lib/tools/definitions/mock-tests/repository"

function matchesSection(
  qSection: string | null | undefined,
  sec: SectionDefinition
): boolean {
  if (!qSection) return false
  const trimmed = qSection.trim()
  return (
    trimmed === sec.key ||
    trimmed.toLowerCase() === sec.key.toLowerCase() ||
    trimmed === sec.title ||
    trimmed.toLowerCase() === sec.title.toLowerCase()
  )
}

export function MockTestDetailView({
  workspaceSlug,
  assessment,
  attempts,
  canWrite,
}: {
  workspaceSlug: string
  assessment: AssessmentDetail
  attempts: AssessmentAttemptHistory[]
  canWrite: boolean
}) {
  const [selectedSectionFilter, setSelectedSectionFilter] = useState<string>("ALL")
  const [shareOpen, setShareOpen] = useState(false)

  // Derive Effective Sections (with legacy fallback)
  const effectiveSections = useMemo<SectionDefinition[]>(() => {
    if (assessment.sections && assessment.sections.length > 0) {
      return assessment.sections
    }
    const uniqueKeys: string[] = []
    const seen = new Set<string>()
    for (const q of assessment.questions) {
      if (q.section && q.section.trim().length > 0) {
        const trimmed = q.section.trim()
        if (!seen.has(trimmed)) {
          seen.add(trimmed)
          uniqueKeys.push(trimmed)
        }
      }
    }
    return uniqueKeys.map((s) => ({ key: s, title: s }))
  }, [assessment.sections, assessment.questions])

  // Section-wise Question Counts & Marks
  const sectionStats = useMemo(() => {
    const map = new Map<string, { count: number; marks: number }>()
    for (const sec of effectiveSections) {
      map.set(sec.key, { count: 0, marks: 0 })
    }
    let unassignedCount = 0
    let unassignedMarks = 0

    for (const q of assessment.questions) {
      const matched = effectiveSections.find((s) => matchesSection(q.section, s))
      if (matched) {
        const cur = map.get(matched.key)!
        cur.count += 1
        cur.marks += Number.isFinite(q.marks) ? q.marks : 0
      } else {
        unassignedCount += 1
        unassignedMarks += Number.isFinite(q.marks) ? q.marks : 0
      }
    }

    return { map, unassigned: { count: unassignedCount, marks: unassignedMarks } }
  }, [effectiveSections, assessment.questions])

  // Grouped questions for the question roster
  const groupedSections = useMemo(() => {
    if (effectiveSections.length === 0) {
      return [
        {
          key: "__all__",
          title: null,
          description: null,
          questions: assessment.questions,
          count: assessment.questions.length,
          marks: assessment.totalMarks ?? 0,
        },
      ]
    }

    const groups: Array<{
      key: string
      title: string | null
      description: string | null
      questions: AssessmentQuestionView[]
      count: number
      marks: number
    }> = []

    for (const sec of effectiveSections) {
      if (selectedSectionFilter !== "ALL" && selectedSectionFilter !== sec.key) {
        continue
      }
      const qList = assessment.questions.filter((q) => matchesSection(q.section, sec))
      const stats = sectionStats.map.get(sec.key) ?? { count: qList.length, marks: 0 }
      groups.push({
        key: sec.key,
        title: sec.title,
        description: sec.description ?? null,
        questions: qList,
        count: stats.count,
        marks: stats.marks,
      })
    }

    // Unassigned group if in ALL view and unassigned items exist
    if (selectedSectionFilter === "ALL" && sectionStats.unassigned.count > 0) {
      const unassignedQs = assessment.questions.filter(
        (q) => !effectiveSections.some((s) => matchesSection(q.section, s))
      )
      if (unassignedQs.length > 0) {
        groups.push({
          key: "__unassigned__",
          title: "Unassigned Questions",
          description: "These questions are not assigned to any defined section.",
          questions: unassignedQs,
          count: sectionStats.unassigned.count,
          marks: sectionStats.unassigned.marks,
        })
      }
    }

    return groups
  }, [effectiveSections, assessment.questions, assessment.totalMarks, selectedSectionFilter, sectionStats])

  return (
    <div className="space-y-8 font-sans antialiased text-foreground">
      {/* ── 1. Unified Canonical Test Profile Hero Card ── */}
      <TestProfileHeroCard
        mode="workspace"
        workspaceSlug={workspaceSlug}
        assessment={assessment}
        attempts={attempts}
        canWrite={canWrite}
        onOpenShare={() => setShareOpen(true)}
      />

      {/* ── 2. Main 65/35 Split: Question Paper (65%) + Segmented Sidebar Card (35%) ── */}
      <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
        {/* Left: Question Paper Structure */}
        <QuestionPaperRoster
          workspaceSlug={workspaceSlug}
          assessment={assessment}
          effectiveSections={effectiveSections}
          groupedSections={groupedSections}
          selectedSectionFilter={selectedSectionFilter}
          setSelectedSectionFilter={setSelectedSectionFilter}
          canWrite={canWrite}
        />

        {/* Right: Segmented Sidebar Card */}
        <div className="space-y-6 self-start">
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-xs divide-y divide-border antialiased">
            {/* Segment A: Score Trajectory Graph */}
            <div>
              <ScoreTrajectoryGraph
                attempts={attempts}
                maxMarks={assessment.totalMarks ?? 100}
                passingBenchmark={assessment.passingBenchmark ?? 33}
                distinctionBenchmark={assessment.distinctionBenchmark ?? 70}
                hideHeaderBorder={true}
              />
            </div>

            {/* Segment B: Blueprint Distribution (section breakdown) */}
            {effectiveSections.length > 0 && (
              <div className="p-4 sm:p-5 space-y-3 bg-muted/5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <LayersIcon className="size-4 text-foreground" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                      Section Blueprint
                    </h3>
                  </div>
                  <Badge variant="outline" className="text-[10px] font-mono">
                    {effectiveSections.length} {effectiveSections.length === 1 ? "Section" : "Sections"}
                  </Badge>
                </div>
                <div className="grid gap-2">
                  {effectiveSections.map((sec) => {
                    const stats = sectionStats.map.get(sec.key) ?? { count: 0, marks: 0 }
                    return (
                      <div
                        key={sec.key}
                        className="flex items-center justify-between rounded-xl border border-border bg-card p-2.5 text-xs shadow-2xs"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="size-2 shrink-0 rounded-full bg-sky-500" />
                          <span className="font-semibold text-foreground truncate">
                            {sec.title}
                          </span>
                        </div>
                        <span className="font-mono text-xs text-muted-foreground shrink-0">
                          {stats.count} Qs • {formatNumber(stats.marks)} pts
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Segment C: Candidate Attempt History */}
            <div className="p-4 sm:p-5 bg-card">
              <AttemptHistoryList
                workspaceSlug={workspaceSlug}
                assessmentId={assessment.id}
                attempts={attempts}
                isPublished={assessment.status === "published"}
                className="space-y-4"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Share Assessment Dialog */}
      <ShareAssessmentDialog
        open={shareOpen}
        onOpenChange={setShareOpen}
        workspaceSlug={workspaceSlug}
        assessment={assessment}
      />
    </div>
  )
}
