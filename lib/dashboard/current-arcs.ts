import "server-only"

import { workspaceRoutes } from "@/lib/routes/workspace-tools"
import { getExamsOverview } from "@/lib/tools/definitions/exam-prep/repository"
import { getGoalsPathsOverview } from "@/lib/tools/definitions/goals-paths/repository"

export type CurrentArcItem = {
  id: string
  title: string
  summary: string | null
  toolKey: string
  toolName: string
  lifecycleStatus: string
  progressPercent: number
  lastActivityAt: string | null
  updatedAt: string
  href: string
}

type InstallationForArc = {
  id: string
  toolDefinition: {
    key: string
    name: string
  }
}

/**
 * Returns the most recently touched work items across every installed tool in
 * the workspace, newest first. Used by the dashboard's "current arc" section.
 */
export async function getCurrentArcItems({
  workspaceId,
  workspaceSlug,
  installations,
}: {
  workspaceId: string
  workspaceSlug: string
  installations: InstallationForArc[]
}): Promise<CurrentArcItem[]> {
  const items: CurrentArcItem[] = []

  const examPrep = installations.find(
    (installation) => installation.toolDefinition.key === "core.exam-prep"
  )
  if (examPrep) {
    const overview = await getExamsOverview(
      workspaceId,
      workspaceSlug,
      examPrep.id
    )
    for (const exam of overview.exams.slice(0, 2)) {
      items.push({
        id: exam.id,
        title: exam.title,
        summary: exam.summary,
        toolKey: "core.exam-prep",
        toolName: examPrep.toolDefinition.name,
        lifecycleStatus: exam.lifecycleStatus,
        progressPercent: exam.progressPercent,
        lastActivityAt: exam.lastActivityAt,
        updatedAt: exam.updatedAt,
        href: workspaceRoutes.examPrep.exam(workspaceSlug, exam.id),
      })
    }
  }

  const goalsPaths = installations.find(
    (installation) => installation.toolDefinition.key === "core.goals-paths"
  )
  if (goalsPaths) {
    const overview = await getGoalsPathsOverview(workspaceSlug)
    for (const arc of overview.arcs.slice(0, 2)) {
      items.push({
        id: arc.id,
        title: arc.title,
        summary: arc.summary ?? arc.objective,
        toolKey: "core.goals-paths",
        toolName: goalsPaths.toolDefinition.name,
        lifecycleStatus: arc.lifecycleStatus,
        progressPercent: arc.progressPercent,
        lastActivityAt: arc.lastActivityAt,
        updatedAt: arc.updatedAt,
        href: workspaceRoutes.goalsPaths.arc(workspaceSlug, arc.id),
      })
    }
  }

  return items.sort((left, right) => {
    const leftTime = left.lastActivityAt ?? left.updatedAt
    const rightTime = right.lastActivityAt ?? right.updatedAt
    return rightTime.localeCompare(leftTime)
  })
}
