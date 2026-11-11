/** Presentation DTOs only: no repository, editor or persistence dependencies. */
export type QuestionContent = {
  id?: string
  kind: string
  stem: string
  difficulty?: number | null
  options: ReadonlyArray<{ key: string; content: string }>
  topicTitles?: readonly string[]
}

export type QuestionAllocation = {
  number?: number
  marks?: number
  negativeMarks?: number
  section?: string | null
}

/** Supply only from an already-authorized author/review data source. */
export type QuestionSolutionData = {
  answerKeys?: readonly string[]
  numericAnswer?: number | string | null
  textAnswer?: string | null
  explanation?: string | null
}

export type QuestionResponseValue = {
  selectedKeys: readonly string[]
  answerText: string
}

export const EMPTY_RESPONSE: QuestionResponseValue = {
  selectedKeys: [],
  answerText: "",
}

export function isChoiceKind(kind: string) {
  return (
    kind === "SINGLE_CHOICE" ||
    kind === "MULTIPLE_CHOICE" ||
    kind === "TRUE_FALSE"
  )
}

export function hasSolution(solution: QuestionSolutionData) {
  return Boolean(
    solution.answerKeys?.length ||
    (solution.numericAnswer !== null &&
      solution.numericAnswer !== undefined &&
      String(solution.numericAnswer).trim()) ||
    solution.textAnswer?.trim() ||
    solution.explanation?.trim()
  )
}

export function toggleChoice(
  response: QuestionResponseValue,
  kind: string,
  key: string
): QuestionResponseValue {
  return {
    ...response,
    selectedKeys:
      kind === "MULTIPLE_CHOICE"
        ? response.selectedKeys.includes(key)
          ? response.selectedKeys.filter((candidate) => candidate !== key)
          : [...response.selectedKeys, key]
        : [key],
  }
}
