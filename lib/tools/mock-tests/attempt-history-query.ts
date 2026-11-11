export const ATTEMPT_PAGE_SIZE = 10

/** Shared personal scope for history, latest result, active attempt and trend. */
export function personalAttemptWhere(
  workspaceId: string,
  userId: string,
  assessmentId?: string
) {
  return {
    workspaceId,
    userId,
    ...(assessmentId ? { assessmentId } : {}),
    assessment: { workspaceId },
  }
}

export function attemptPageBounds(requested: number, total: number) {
  const totalPages = Math.max(1, Math.ceil(total / ATTEMPT_PAGE_SIZE))
  const page = Math.min(
    totalPages,
    Number.isSafeInteger(requested) && requested > 0 ? requested : 1
  )
  return {
    page,
    pageSize: ATTEMPT_PAGE_SIZE,
    totalPages,
    skip: (page - 1) * ATTEMPT_PAGE_SIZE,
  }
}
