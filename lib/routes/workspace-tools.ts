export const workspaceRoutes = {
  home: (slug: string) => `/workspace/${encodeURIComponent(slug)}`,
  tools: {
    home: "/tools",
    detail: (toolSlug: string) => `/tools/${encodeURIComponent(toolSlug)}`,
  },
  toolHome: (slug: string, toolKey: string): string | null => {
    if (toolKey === "core.exam-prep") return workspaceRoutes.examPrep.home(slug)
    if (toolKey === "core.goals-paths") return workspaceRoutes.goalsPaths.home(slug)
    return null
  },
  examPrep: {
    home: (slug: string) => `/workspace/${encodeURIComponent(slug)}/exam-prep`,
    new: (slug: string) => `/workspace/${encodeURIComponent(slug)}/exam-prep/new`,
    exam: (slug: string, examId: string) =>
      `/workspace/${encodeURIComponent(slug)}/exam-prep/${encodeURIComponent(examId)}`,
    subject: (slug: string, examId: string, subjectId: string) =>
      `/workspace/${encodeURIComponent(slug)}/exam-prep/${encodeURIComponent(examId)}/subjects/${encodeURIComponent(subjectId)}`,
    subjectSettings: (slug: string, subjectId: string, fromExamId?: string) => {
      const path = `/workspace/${encodeURIComponent(slug)}/exam-prep/subjects/${encodeURIComponent(subjectId)}/settings`
      return fromExamId
        ? `${path}?fromExam=${encodeURIComponent(fromExamId)}`
        : path
    },
  },
  goalsPaths: {
    home: (slug: string) => `/workspace/${encodeURIComponent(slug)}/goals-paths`,
    new: (slug: string) => `/workspace/${encodeURIComponent(slug)}/goals-paths/new`,
    arc: (slug: string, arcId: string) =>
      `/workspace/${encodeURIComponent(slug)}/goals-paths/${encodeURIComponent(arcId)}`,
    arcEdit: (slug: string, arcId: string) =>
      `/workspace/${encodeURIComponent(slug)}/goals-paths/${encodeURIComponent(arcId)}/edit`,
  },
}

export function resolveToolDestination({
  workspaceSlug,
  toolKey,
  catalogRoute,
  installed,
}: {
  workspaceSlug: string
  toolKey: string
  catalogRoute: string
  installed: boolean
}) {
  if (!installed) return catalogRoute
  return workspaceRoutes.toolHome(workspaceSlug, toolKey) ?? catalogRoute
}
