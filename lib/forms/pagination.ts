/** A bounded page window, independent of URL or client-state pagination. */
export function paginationWindow(page: number, totalPages: number): number[] {
  const pages = Math.max(1, Math.floor(totalPages)),
    current = Math.min(pages, Math.max(1, Math.floor(page)))
  return [...new Set([1, current - 1, current, current + 1, pages])]
    .filter((p) => p >= 1 && p <= pages)
    .sort((a, b) => a - b)
}
