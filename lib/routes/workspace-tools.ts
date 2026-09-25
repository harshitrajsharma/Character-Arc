export const workspaceRoutes = {
  home: (slug: string) => `/workspace/${encodeURIComponent(slug)}`,
  settings: (slug: string) => `/workspace/${encodeURIComponent(slug)}/settings`,
  mcpSettings: (slug: string) => `/workspace/${encodeURIComponent(slug)}/settings?tab=mcp`,
  tools: {
    home: "/tools",
    detail: (toolSlug: string) => `/tools/${encodeURIComponent(toolSlug)}`,
  },
  toolHome: (slug: string, toolKey: string): string | null => {
    if (toolKey === "core.exam-prep") return workspaceRoutes.examPrep.home(slug)
    if (toolKey === "core.goals-paths")
      return workspaceRoutes.goalsPaths.home(slug)
    if (toolKey === "core.mock-tests")
      return workspaceRoutes.mockTests.home(slug)
    return null
  },
  examPrep: {
    home: (slug: string) => `/workspace/${encodeURIComponent(slug)}/exam-prep`,
    new: (slug: string) =>
      `/workspace/${encodeURIComponent(slug)}/exam-prep/new`,
    exam: (slug: string, examId: string) =>
      `/workspace/${encodeURIComponent(slug)}/exam-prep/${encodeURIComponent(examId)}`,
    examSettings: (slug: string, examId: string) =>
      `/workspace/${encodeURIComponent(slug)}/exam-prep/${encodeURIComponent(examId)}/settings`,
    settings: (slug: string, examId: string) =>
      `/workspace/${encodeURIComponent(slug)}/exam-prep/${encodeURIComponent(examId)}/settings`,
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
    home: (slug: string) =>
      `/workspace/${encodeURIComponent(slug)}/goals-paths`,
    new: (slug: string) =>
      `/workspace/${encodeURIComponent(slug)}/goals-paths/new`,
    arc: (slug: string, arcId: string) =>
      `/workspace/${encodeURIComponent(slug)}/goals-paths/${encodeURIComponent(arcId)}`,
    arcEdit: (slug: string, arcId: string) =>
      `/workspace/${encodeURIComponent(slug)}/goals-paths/${encodeURIComponent(arcId)}/edit`,
  },
  mockTests: {
    home: (slug: string) =>
      `/workspace/${encodeURIComponent(slug)}/assessments`,
    authoring: (slug: string) =>
      `/workspace/${encodeURIComponent(slug)}/assessments/authoring`,
    new: (slug: string) =>
      `/workspace/${encodeURIComponent(slug)}/assessments/new`,
    detail: (slug: string, assessmentId: string) =>
      `/workspace/${encodeURIComponent(slug)}/assessments/${encodeURIComponent(assessmentId)}`,
    assessment: (slug: string, assessmentId: string) =>
      `/workspace/${encodeURIComponent(slug)}/assessments/${encodeURIComponent(assessmentId)}`,
    edit: (slug: string, assessmentId: string) =>
      `/workspace/${encodeURIComponent(slug)}/assessments/${encodeURIComponent(assessmentId)}/edit`,
    attemptNew: (slug: string, assessmentId: string) =>
      `/workspace/${encodeURIComponent(slug)}/assessments/${encodeURIComponent(assessmentId)}/attempts/new`,
    attempt: (_slug: string, attemptId: string) =>
      `/assessments/${encodeURIComponent(attemptId)}`,
    share: (assessmentId: string) =>
      `/assessments/share/${encodeURIComponent(assessmentId)}`,
    analysis: (slug: string, attemptId: string) =>
      `/workspace/${encodeURIComponent(slug)}/assessments/attempts/${encodeURIComponent(attemptId)}/analysis`,
    questions: (slug: string) =>
      `/workspace/${encodeURIComponent(slug)}/assessments/questions`,
    questionNew: (slug: string) =>
      `/workspace/${encodeURIComponent(slug)}/assessments/questions/new`,
    questionEdit: (slug: string, questionId: string) =>
      `/workspace/${encodeURIComponent(slug)}/assessments/questions/${encodeURIComponent(questionId)}/edit`,
  },
  get assessments() {
    return this.mockTests
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



