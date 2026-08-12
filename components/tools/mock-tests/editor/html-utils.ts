/**
 * Small HTML helpers for rich-editor content stored in the existing string
 * columns (`stem`, `QuestionOption.content`, `QuestionSolution.explanation`).
 */

/** Strip tags and decode common entities so rich HTML can be validated like
 *  plain text (e.g. "is this field actually empty?"). */
export function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#0?39;/gi, "'")
    .replace(/&#x27;/gi, "'")
    .trim()
}

/** Plain-text length of rich HTML — used for client-side limit checks. */
export function htmlTextLength(html: string): number {
  return stripHtml(html).length
}
