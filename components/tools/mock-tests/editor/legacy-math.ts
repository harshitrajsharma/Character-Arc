import katex from "katex"

/**
 * Legacy math enhancement for `RichContent`.
 *
 * Questions authored before the rich editor stored math as raw TeX delimited
 * by dollar signs (`$...$` inline, `$$...$$` display). This module tokenizes
 * that text and renders the math with KaTeX, while leaving unclosed currency
 * amounts (e.g. `$5` or `$10.50`) alone. Balanced delimiters request math.
 */

export interface LegacyMathToken {
  tex: string
  display: boolean
}

export type LegacyMathSegment = string | LegacyMathToken

const texCache = new Map<string, string>()
const MAX_CACHE_SIZE = 1000

export function renderTex(tex: string, displayMode: boolean): string {
  const source = tex.trim()
  if (!source) {
    return `<span class="math-empty">${displayMode ? "$$" : "$"}$</span>`
  }
  const key = `${displayMode ? "D" : "I"}:${source}`
  const cached = texCache.get(key)
  if (cached !== undefined) return cached

  const result = katex.renderToString(source, {
    throwOnError: false,
    displayMode,
    output: "html",
  })
  if (texCache.size >= MAX_CACHE_SIZE) {
    const firstKey = texCache.keys().next().value
    if (firstKey) texCache.delete(firstKey)
  }
  texCache.set(key, result)
  return result
}

/** Full delimiter range for editor normalization; offsets refer to the source text. */
export interface LegacyMathRange extends LegacyMathToken {
  from: number
  to: number
}

/** Balanced dollar delimiters explicitly request math, including numbers such as $100$. */
const MATH_PATTERN =
  /(?<![\\$])\$\$([\s\S]+?)(?<!\\)\$\$|(?<![\\$])\$([^$\n]+)(?<!\\)\$(?!\$)/g

export function tokenizeLegacyMathWithRanges(text: string): LegacyMathRange[] {
  const tokens: LegacyMathRange[] = []
  const re = new RegExp(MATH_PATTERN.source, "g")
  let match: RegExpExecArray | null
  while ((match = re.exec(text)) !== null) {
    const display = match[1] !== undefined
    const raw = (display ? match[1] : match[2]) ?? ""
    const tex = raw.trim()
    // Whitespace-padded inline captures can pair unrelated currency amounts
    // ("$5 and $10"); leave those literal rather than swallowing prose.
    const accepted = display
      ? tex.length > 0
      : tex.length > 0 && !/^\s/.test(raw) && !/\s$/.test(raw)
    if (accepted) {
      tokens.push({
        tex,
        display,
        from: match.index,
        to: match.index + match[0].length,
      })
    } else {
      re.lastIndex = match.index + (display ? 2 : 1)
    }
  }
  return tokens
}

export function tokenizeLegacyMath(text: string): LegacyMathSegment[] {
  const segments: LegacyMathSegment[] = []
  let cursor = 0
  for (const { tex, display, from, to } of tokenizeLegacyMathWithRanges(text)) {
    segments.push(text.slice(cursor, from), { tex, display })
    cursor = to
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
