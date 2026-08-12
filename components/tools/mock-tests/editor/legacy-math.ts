import katex from "katex"

/**
 * Legacy math enhancement for `RichContent`.
 *
 * Questions authored before the rich editor stored math as raw TeX delimited
 * by dollar signs (`$...$` inline, `$$...$$` display). This module tokenizes
 * that text and renders the math with KaTeX, while leaving currency-style
 * amounts (e.g. `$5` or `$10.50`) alone.
 */

export interface LegacyMathToken {
  tex: string
  display: boolean
}

export type LegacyMathSegment = string | LegacyMathToken

export function renderTex(tex: string, displayMode: boolean): string {
  const source = tex.trim()
  if (!source) {
    return `<span class="math-empty">${displayMode ? "$$" : "$"}$</span>`
  }
  return katex.renderToString(source, {
    throwOnError: false,
    displayMode,
    output: "html",
  })
}

/** Amount-shaped `$...$` (currency, counts) — almost never intended as math. */
const AMOUNT_PATTERN = /^[\d\s.,₹$€£%]+$/

/**
 * Display math first (`$$...$$`), then inline `$...$`. Display content may
 * span lines; inline content must not contain `$` or a newline.
 */
const MATH_PATTERN = /\$\$([\s\S]+?)\$\$|\$([^$\n]+)\$/g

/**
 * Splits legacy markdown text into plain-text and math segments.
 *
 * A candidate is accepted as math only when its delimiters sit flush against
 * the content and the content is not amount-shaped (e.g. `$5` or `$10.50`),
 * which keeps currency and prices as literal text.
 */
export function tokenizeLegacyMath(text: string): LegacyMathSegment[] {
  const segments: LegacyMathSegment[] = []
  let cursor = 0
  const re = new RegExp(MATH_PATTERN.source, "g")
  let match: RegExpExecArray | null
  while ((match = re.exec(text)) !== null) {
    const display = match[1] !== undefined
    const raw = (display ? match[1] : match[2]) ?? ""
    const tex = raw.trim()
    let accepted = false
    if (display) {
      accepted = tex.length > 0
    } else {
      const edgeClean = raw.length > 0 && !/^\s/.test(raw) && !/\s$/.test(raw)
      accepted = edgeClean && tex.length > 0 && !AMOUNT_PATTERN.test(tex)
    }
    if (accepted) {
      segments.push(text.slice(cursor, match.index), { tex, display })
      cursor = match.index + match[0].length
    } else {
      // Not math (e.g. `$5` or `$ x $`): keep the opener as literal text and
      // continue scanning right after it.
      re.lastIndex = match.index + (display ? 2 : 1)
    }
  }
  segments.push(text.slice(cursor))
  return segments
}

/**
 * Parses a paste that consists of exactly one dollar-delimited math value.
 * Surrounding whitespace is allowed, but prose around the delimiters is not.
 */
export function parseDelimitedMath(text: string): LegacyMathToken | null {
  const source = text.trim()
  if (!source) return null

  const segments = tokenizeLegacyMath(source).filter(
    (segment) => typeof segment !== "string" || segment.length > 0
  )
  if (segments.length !== 1 || typeof segments[0] === "string") {
    return null
  }

  return segments[0]
}

/**
 * Legacy authors wrote sets like `${0, 1, 2}$` where the braces are meant
 * literally; KaTeX treats bare braces as grouping, so escape them.
 */
export function normalizeLegacyTex(tex: string): string {
  if (tex.startsWith("{") && tex.endsWith("}")) {
    return `\\{${tex.slice(1, -1)}\\}`
  }
  return tex
}

export function escapeHtmlText(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

/**
 * Renders legacy dollar-delimited math to KaTeX HTML for a single text node.
 * Returns `null` when the text contains nothing worth enhancing.
 */
export function legacyMathToHtml(text: string): string | null {
  const segments = tokenizeLegacyMath(text)
  if (segments.length === 1 && typeof segments[0] === "string") {
    return null
  }
  return segments
    .map((segment) => {
      if (typeof segment === "string") {
        return escapeHtmlText(segment)
      }
      const tex = normalizeLegacyTex(segment.tex)
      return segment.display
        ? `<span class="math-block">${renderTex(tex, true)}</span>`
        : `<span class="math-inline">${renderTex(tex, false)}</span>`
    })
    .join("")
}
