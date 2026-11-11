export const builderBankPrefix = (workspaceSlug: string) =>
  ["builder-question-bank", workspaceSlug] as const

export type BuilderBankFilters = {
  query: string
  type: "ALL" | "SINGLE_CHOICE" | "MULTIPLE_CHOICE" | "NUMERIC" | "TRUE_FALSE"
  difficulty: "ALL" | "UNSET" | "1" | "2" | "3" | "4" | "5"
  page: number
}

export function builderBankKey(
  workspaceSlug: string,
  viewerId: string,
  filters: BuilderBankFilters
) {
  return [
    ...builderBankPrefix(workspaceSlug),
    viewerId,
    filters.query.trim().slice(0, 500),
    filters.type,
    filters.difficulty,
    filters.page,
  ] as const
}

export function builderBankUiKey(
  workspaceSlug: string,
  viewerId: string,
  assessmentId: string
) {
  return [
    "builder-question-picker-ui",
    workspaceSlug,
    viewerId,
    assessmentId,
  ] as const
}
