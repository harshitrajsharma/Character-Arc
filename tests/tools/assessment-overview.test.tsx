// @ts-expect-error Bun supplies this module at test runtime.
import { describe, expect, test } from "bun:test"
import { renderToStaticMarkup } from "react-dom/server"
import {
  assessmentCapabilities,
  attemptPercentage,
  scoringPenaltyRange,
} from "@/lib/tools/mock-tests/assessment-overview-model"
import {
  personalAttemptWhere,
  attemptPageBounds,
} from "@/lib/tools/mock-tests/attempt-history-query"
import { ScoreTrajectoryGraph } from "@/components/tools/mock-tests/detail/score-trajectory-graph"
import type { RecentAttemptItem } from "@/lib/tools/definitions/mock-tests/repository"

describe("assessment overview eligibility and personal history", () => {
  test("penalty facts follow the grader even for legacy positive values", () => {
    expect(scoringPenaltyRange(0, 0.33)).toEqual({ minimum: 0, maximum: 0 })
    expect(scoringPenaltyRange(-0.33, 0.33)).toEqual({
      minimum: -0.33,
      maximum: 0,
    })
    expect(scoringPenaltyRange(-0.33, -0.33)).toEqual({
      minimum: -0.33,
      maximum: -0.33,
    })
  })
  test("readers and archived papers never advertise mutation actions", () => {
    for (const status of ["draft", "published", "archived"] as const) {
      expect(
        assessmentCapabilities({
          status,
          canWrite: false,
          questionCount: 3,
          hasActiveAttempt: true,
        })
      ).toEqual({ edit: false, share: false, start: false, resume: false })
    }
    expect(
      assessmentCapabilities({
        status: "archived",
        canWrite: true,
        questionCount: 3,
        hasActiveAttempt: true,
      })
    ).toEqual({ edit: false, share: false, start: false, resume: false })
  })
  test("drafts continue in the editor and empty published papers cannot start", () => {
    expect(
      assessmentCapabilities({
        status: "draft",
        canWrite: true,
        questionCount: 3,
        hasActiveAttempt: false,
      })
    ).toEqual({ edit: true, share: false, start: false, resume: false })
    expect(
      assessmentCapabilities({
        status: "published",
        canWrite: true,
        questionCount: 0,
        hasActiveAttempt: false,
      }).start
    ).toBe(false)
  })
  test("an independently found active attempt replaces the new-attempt shortcut", () => {
    const input = {
      status: "published" as const,
      canWrite: true,
      questionCount: 3,
    }
    expect(
      assessmentCapabilities({ ...input, hasActiveAttempt: true })
    ).toMatchObject({ start: false, resume: true })
    expect(
      assessmentCapabilities({ ...input, hasActiveAttempt: false })
    ).toMatchObject({ start: true, resume: false })
  })
  test("every paper activity query keeps both workspace and personal scope", () => {
    expect(personalAttemptWhere("workspace-a", "user-b", "paper-c")).toEqual({
      workspaceId: "workspace-a",
      userId: "user-b",
      assessmentId: "paper-c",
      assessment: { workspaceId: "workspace-a" },
    })
    expect(personalAttemptWhere("workspace-a", "user-b")).toEqual({
      workspaceId: "workspace-a",
      userId: "user-b",
      assessment: { workspaceId: "workspace-a" },
    })
  })
  test("history pages are bounded without dropping the final partial page", () => {
    expect(attemptPageBounds(2, 21)).toEqual({
      page: 2,
      pageSize: 10,
      totalPages: 3,
      skip: 10,
    })
    expect(attemptPageBounds(Number.MAX_SAFE_INTEGER, 21)).toEqual({
      page: 3,
      pageSize: 10,
      totalPages: 3,
      skip: 20,
    })
    expect(attemptPageBounds(1, 0)).toEqual({
      page: 1,
      pageSize: 10,
      totalPages: 1,
      skip: 0,
    })
    for (const invalid of [-1, 0, 1.5, NaN, Infinity])
      expect(attemptPageBounds(invalid, 21).page).toBe(1)
  })
  test("scores preserve zero, negative values and each historical maximum", () => {
    expect(attemptPercentage(0, 4)).toBe(0)
    expect(attemptPercentage(-1, 4)).toBe(-25)
    expect(attemptPercentage(41, 50)).toBe(82)
    expect(attemptPercentage(3, 4)).toBe(75)
    expect(attemptPercentage(null, 4)).toBeNull()
    expect(attemptPercentage(0, 0)).toBeNull()
  })
  test("trend has truthful stored denominators, negative/zero scores and result links", () => {
    const base: RecentAttemptItem = {
      id: "zero",
      assessmentId: "paper",
      assessmentTitle: "Assessment",
      status: "evaluated",
      score: 0,
      maxScore: 4,
      percentage: 0,
      startedAt: "2026-10-29T10:00:00Z",
      submittedAt: "2026-10-29T10:01:00Z",
    }
    const html = renderToStaticMarkup(
      <ScoreTrajectoryGraph
        attempts={[
          base,
          { ...base, id: "negative", score: -1, maxScore: 2 },
          { ...base, id: "pending", status: "submitted", score: null },
        ]}
        evaluatedCount={12}
        workspaceSlug="mine"
      />
    )
    expect(html).toContain("Latest 2 of 12 scored attempts")
    expect(html).toContain("different mark totals")
    expect(html).toContain("Score data, oldest to newest")
    expect(html).toContain("<td>0%</td>")
    expect(html).toContain("<td>-50%</td>")
    expect(html).toContain("/attempts/zero/analysis")
    expect(html).not.toContain("min-w-[480px]")
  })
})
