"use server"

import { workspaceRoutes } from "@/lib/routes/workspace-tools"
import { getExamsOverview } from "@/lib/tools/definitions/exam-prep/repository"
import { getGoalsPathsOverview } from "@/lib/tools/definitions/goals-paths/repository"
import { getMockTestsOverview } from "@/lib/tools/definitions/mock-tests/repository"

export type CurrentArcItem = {
  id: string
  title: string
  summary: string | null
  toolKey: "core.exam-prep" | "core.goals-paths" | "core.mock-tests" | string
  toolName: string
  lifecycleStatus: string
  progressPercent: number
  targetDate?: string | null
  metaLabel?: string
  lastActivityAt: string | null
  updatedAt: string
  href: string
}

export type DashboardMomentumMetrics = {
  activeGoalsCount: number
  avgGoalsProgress: number
  nearestExam: {
    id: string
    title: string
    targetDate: string
    daysLeft: number
  } | null
  totalAssessmentsCount: number
  bestAccuracyPercent: number | null
  totalInstalledTools: number
}

type InstallationForArc = {
  id: string
  toolDefinition: {
    key: string
    name: string
  }
}

function formatLifecycle(status: string) {
  return status
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

export async function getDashboardData({
  workspaceId,
  workspaceSlug,
  installations,
}: {
  workspaceId: string
  workspaceSlug: string
  installations: InstallationForArc[]
}): Promise<{
  items: CurrentArcItem[]
  metrics: DashboardMomentumMetrics
}> {
  const items: CurrentArcItem[] = []

  let activeGoalsCount = 0
  let totalGoalsProgress = 0
  let nearestExam: DashboardMomentumMetrics["nearestExam"] = null
  let totalAssessmentsCount = 0
  let bestAccuracyPercent: number | null = null

  // 1. Concurrent Overview Data Fetching
  const examPrep = installations.find(
    (installation) => installation.toolDefinition.key === "core.exam-prep"
  )
  const goalsPaths = installations.find(
    (installation) => installation.toolDefinition.key === "core.goals-paths"
  )
  const mockTests = installations.find(
    (installation) => installation.toolDefinition.key === "core.mock-tests"
  )

  const [examOverview, goalsOverview, mockTestsOverview] = await Promise.all([
    examPrep
      ? getExamsOverview(workspaceId, workspaceSlug, examPrep.id).catch((e) => {
          console.error("Failed to load exam prep overview for dashboard:", e)
          return null
        })
      : null,
    goalsPaths
      ? getGoalsPathsOverview(workspaceSlug).catch((e) => {
          console.error("Failed to load goals overview for dashboard:", e)
          return null
        })
      : null,
    mockTests
      ? getMockTestsOverview(workspaceId, workspaceSlug, mockTests.id, {
          includeCommunity: false,
        }).catch((e) => {
          console.error("Failed to load mock tests overview for dashboard:", e)
          return null
        })
      : null,
  ])

  // 2. Exam Prep Processing
  if (examOverview && examPrep) {
    const now = new Date()

    for (const exam of examOverview.exams) {
      items.push({
        id: exam.id,
        title: exam.title,
        summary: exam.summary,
        toolKey: "core.exam-prep",
        toolName: examPrep.toolDefinition.name,
        lifecycleStatus: exam.lifecycleStatus,
        progressPercent: exam.progressPercent,
        targetDate: exam.expectedStartDate,
        metaLabel: exam.scheduleStatus === "confirmed" ? "Confirmed date" : "Target estimate",
        lastActivityAt: exam.lastActivityAt,
        updatedAt: exam.updatedAt,
        href: workspaceRoutes.examPrep.exam(workspaceSlug, exam.id),
      })

      // Check for nearest upcoming exam
      if (exam.expectedStartDate) {
        const examDate = new Date(exam.expectedStartDate)
        if (!isNaN(examDate.getTime())) {
          const diffTime = examDate.getTime() - now.getTime()
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
          if (diffDays >= 0 && (!nearestExam || diffDays < nearestExam.daysLeft)) {
            nearestExam = {
              id: exam.id,
              title: exam.title,
              targetDate: exam.expectedStartDate,
              daysLeft: diffDays,
            }
          }
        }
      }
    }
  }

  // 3. Goals & Paths Processing
  if (goalsOverview && goalsPaths) {
    for (const arc of goalsOverview.arcs) {
      items.push({
        id: arc.id,
        title: arc.title,
        summary: arc.summary ?? arc.objective,
        toolKey: "core.goals-paths",
        toolName: goalsPaths.toolDefinition.name,
        lifecycleStatus: arc.lifecycleStatus,
        progressPercent: arc.progressPercent,
        targetDate: arc.targetDate,
        metaLabel: formatLifecycle(arc.lifecycleStatus),
        lastActivityAt: arc.lastActivityAt,
        updatedAt: arc.updatedAt,
        href: workspaceRoutes.goalsPaths.arc(workspaceSlug, arc.id),
      })

      if (arc.lifecycleStatus === "active") {
        activeGoalsCount++
        totalGoalsProgress += arc.progressPercent
      }
    }
  }

  // 4. Mock Tests Processing
  if (mockTestsOverview && mockTests) {
    totalAssessmentsCount = mockTestsOverview.assessments.length

    for (const assessment of mockTestsOverview.assessments.slice(0, 3)) {
      if (assessment.myBestPercentage !== null) {
        if (bestAccuracyPercent === null || assessment.myBestPercentage > bestAccuracyPercent) {
          bestAccuracyPercent = assessment.myBestPercentage
        }
      }

      items.push({
        id: assessment.id,
        title: assessment.title,
        summary: `${assessment.questionCount} questions • ${assessment.durationMinutes ? `${assessment.durationMinutes} mins` : "Untimed"}`,
        toolKey: "core.mock-tests",
        toolName: mockTests.toolDefinition.name,
        lifecycleStatus: assessment.attemptsCount > 0 ? "in_progress" : "not_started",
        progressPercent: assessment.myBestPercentage || 0,
        metaLabel: assessment.attemptsCount > 0 ? `${assessment.attemptsCount} attempts` : "Not attempted",
        lastActivityAt: assessment.updatedAt,
        updatedAt: assessment.updatedAt,
        href: workspaceRoutes.mockTests.assessment(workspaceSlug, assessment.id),
      })
    }
  }

  const sortedItems = items.sort((left, right) => {
    const leftTime = left.lastActivityAt ?? left.updatedAt
    const rightTime = right.lastActivityAt ?? right.updatedAt
    return rightTime.localeCompare(leftTime)
  })

  const avgGoalsProgress = activeGoalsCount > 0 ? Math.round(totalGoalsProgress / activeGoalsCount) : 0

  return {
    items: sortedItems,
    metrics: {
      activeGoalsCount,
      avgGoalsProgress,
      nearestExam,
      totalAssessmentsCount,
      bestAccuracyPercent,
      totalInstalledTools: installations.length,
    },
  }
}

/**
 * Backward-compatible helper returning just the current arc items.
 */
export async function getCurrentArcItems(params: {
  workspaceId: string
  workspaceSlug: string
  installations: InstallationForArc[]
}): Promise<CurrentArcItem[]> {
  const data = await getDashboardData(params)
  return data.items
}
