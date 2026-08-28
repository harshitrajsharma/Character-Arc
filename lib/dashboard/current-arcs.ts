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

  // 1. Exam Prep Data
  const examPrep = installations.find(
    (installation) => installation.toolDefinition.key === "core.exam-prep"
  )
  if (examPrep) {
    try {
      const overview = await getExamsOverview(
        workspaceId,
        workspaceSlug,
        examPrep.id
      )
      const now = new Date()

      for (const exam of overview.exams) {
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
    } catch (e) {
      console.error("Failed to load exam prep overview for dashboard:", e)
    }
  }

  // 2. Goals & Paths Data
  const goalsPaths = installations.find(
    (installation) => installation.toolDefinition.key === "core.goals-paths"
  )
  if (goalsPaths) {
    try {
      const overview = await getGoalsPathsOverview(workspaceSlug)
      for (const arc of overview.arcs) {
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
    } catch (e) {
      console.error("Failed to load goals overview for dashboard:", e)
    }
  }

  // 3. Mock Tests Data
  const mockTests = installations.find(
    (installation) => installation.toolDefinition.key === "core.mock-tests"
  )
  if (mockTests) {
    try {
      const overview = await getMockTestsOverview(
        workspaceId,
        workspaceSlug,
        mockTests.id
      )
      totalAssessmentsCount = overview.assessments.length

      for (const assessment of overview.assessments.slice(0, 3)) {
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
    } catch (e) {
      console.error("Failed to load mock tests overview for dashboard:", e)
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
