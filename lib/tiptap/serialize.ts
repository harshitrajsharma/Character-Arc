import katex from "katex"

/**
 * Serialization helpers for Tiptap JSON content stored in mock-tests fields
 * (Question.stem, QuestionOption.content, QuestionSolution.explanation,
 * Assessment.instructions).
 *
 * This module is intentionally server-safe (no DOM, no React): it is used by
 * server components for SSR rendering and by the client editor for previews.
 * All HTML output is escaped; URLs and colors are whitelisted.
 */

export type RichTextMark = {
  type: string
  attrs?: Record<string, unknown>
}

export type RichTextNode = {
  type: string
  attrs?: Record<string, unknown>
  content?: RichTextNode[]
  marks?: RichTextMark[]
  text?: string
}

export type RichTextDoc = {
  type: "doc"
  content?: RichTextNode[]
}

function isDoc(value: unknown): value is RichTextDoc {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as { type?: unknown }).type === "doc"
  )
}

/** True when `value` is a stringified Tiptap JSON document. */
export function isRichJson(value: unknown): value is string {
  if (typeof value !== "string") return false
  const trimmed = value.trim()
  if (!trimmed.startsWith("{")) return false
  try {
    return isDoc(JSON.parse(trimmed) as unknown)
  } catch {
    return false
  }
}

/** Parse a stringified Tiptap document; returns null when not rich JSON. */
export function parseRichContent(value: unknown): RichTextDoc | null {
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  if (!trimmed.startsWith("{")) return null
  try {
    const parsed = JSON.parse(trimmed) as unknown
    return isDoc(parsed) ? parsed : null
  } catch {
    return null
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

function safeUrl(raw: string): string {
  const value = raw.trim()
  if (/^(https?:|mailto:|tel:|\/|#|\.\/|\.\.\/)/i.test(value)) {
    return escapeHtml(value)
  }
  return "#"
}

const COLOR_PATTERN = /^(#[0-9a-fA-F]{3,8}|rgba?\([0-9\s,.%]+\)|[a-zA-Z]{3,30})$/

function safeColor(raw: string): string | null {
  const value = raw.trim()
  return COLOR_PATTERN.test(value) ? escapeHtml(value) : null
}

function renderMath(tex: string, displayMode: boolean): string {
  const source = tex.trim()
  if (!source) return ""
  try {
    return katex.renderToString(source, {
      throwOnError: false,
      displayMode,
      output: "html",
    })
  } catch {
    return `<span class="katex math-error">${escapeHtml(source)}</span>`
  }
}

function childrenOf(node: RichTextNode): RichTextNode[] {
  return Array.isArray(node.content) ? node.content : []
}

function plainTextOf(node: RichTextNode): string {
  const children = childrenOf(node).map(plainTextOf).join("")
  switch (node.type) {
    case "text":
      return node.text ?? ""
    case "inlineMath":
      return `$${(node.attrs?.tex as string | undefined) ?? ""}$`
    case "blockMath":
      return `\n$$${(node.attrs?.tex as string | undefined) ?? ""}$$\n`
    case "hardBreak":
      return "\n"
    case "horizontalRule":
      return "\n---\n"
    case "image":
      return `[image]`
    case "paragraph":
    case "heading":
    case "blockquote":
    case "codeBlock":
    case "listItem":
    case "taskItem":
    case "tableCell":
    case "tableHeader":
      return `${children.trimEnd()}\n`
    default:
      return children
  }
}

function applyMark(mark: RichTextMark, html: string): string {
  switch (mark.type) {
    case "bold":
      return `<strong>${html}</strong>`
    case "italic":
      return `<em>${html}</em>`
    case "underline":
      return `<u>${html}</u>`
    case "strike":
      return `<s>${html}</s>`
    case "code":
      return `<code>${html}</code>`
    case "link": {
      const href = safeUrl(String(mark.attrs?.href ?? "#"))
      const title =
        typeof mark.attrs?.title === "string" && mark.attrs.title.trim()
          ? ` title="${escapeHtml(mark.attrs.title)}"`
          : ""
      return `<a href="${href}"${title}>${html}</a>`
    }
    case "highlight": {
      const color =
        typeof mark.attrs?.color === "string"
          ? safeColor(mark.attrs.color)
          : null
      return color
        ? `<mark style="background-color: ${color}">${html}</mark>`
        : `<mark>${html}</mark>`
    }
    case "textStyle": {
      const color =
        typeof mark.attrs?.color === "string"
          ? safeColor(mark.attrs.color)
          : null
      return color
        ? `<span style="color: ${color}">${html}</span>`
        : html
    }
    default:
      return html
  }
}

function renderTextNode(node: RichTextNode): string {
  let html = escapeHtml(node.text ?? "")
  for (const mark of node.marks ?? []) {
    html = applyMark(mark, html)
  }
  return html
}

function renderChildren(node: RichTextNode): string {
  return childrenOf(node).map(renderNode).join("")
}

function renderCodeBlock(node: RichTextNode): string {
  const language =
    typeof node.attrs?.language === "string" && node.attrs.language
      ? ` class="language-${escapeHtml(node.attrs.language)}"`
      : ""
  return `<pre${language}><code>${plainTextOf(node).trimEnd()}</code></pre>`
}

function renderTaskItem(node: RichTextNode): string {
  const checked = node.attrs?.checked === true
  return `<li data-checked="${checked ? "true" : "false"}"><label><input type="checkbox" ${
    checked ? "checked " : ""
  }disabled></label><div>${renderChildren(node)}</div></li>`
}

function renderNode(node: RichTextNode): string {
  switch (node.type) {
    case "text":
      return renderTextNode(node)
    case "paragraph":
      return `<p>${renderChildren(node)}</p>`
    case "heading": {
      const rawLevel = Number(node.attrs?.level ?? 2)
      const level = Math.min(6, Math.max(1, Number.isFinite(rawLevel) ? rawLevel : 2))
      return `<h${level}>${renderChildren(node)}</h${level}>`
    }
    case "blockquote":
      return `<blockquote>${renderChildren(node)}</blockquote>`
    case "codeBlock":
      return renderCodeBlock(node)
    case "bulletList":
      return `<ul>${renderChildren(node)}</ul>`
    case "orderedList":
      return `<ol${node.attrs?.start ? ` start="${Number(node.attrs.start)}"` : ""}>${renderChildren(node)}</ol>`
    case "listItem":
      return `<li>${renderChildren(node)}</li>`
    case "taskList":
      return `<ul data-type="taskList">${renderChildren(node)}</ul>`
    case "taskItem":
      return renderTaskItem(node)
    case "horizontalRule":
      return `<hr>`
    case "hardBreak":
      return `<br>`
    case "image": {
      const src = safeUrl(String(node.attrs?.src ?? ""))
      const alt = typeof node.attrs?.alt === "string" ? escapeHtml(node.attrs.alt) : ""
      const title =
        typeof node.attrs?.title === "string" && node.attrs.title.trim()
          ? ` title="${escapeHtml(node.attrs.title)}"`
          : ""
      return `<img src="${src}" alt="${alt}"${title} loading="lazy">`
    }
    case "inlineMath":
      return `<span class="math-inline">${renderMath(
        (node.attrs?.tex as string | undefined) ?? "",
        false
      )}</span>`
    case "blockMath":
      return `<div class="math-block">${renderMath(
        (node.attrs?.tex as string | undefined) ?? "",
        true
      )}</div>`
    case "table":
      return `<table><tbody>${renderChildren(node)}</tbody></table>`
    case "tableRow":
      return `<tr>${renderChildren(node)}</tr>`
    case "tableHeader":
      return `<th>${renderChildren(node)}</th>`
    case "tableCell":
      return `<td>${renderChildren(node)}</td>`
    default:
      return renderChildren(node)
  }
}

/** Render a rich document to sanitized HTML (KaTeX included). Null when the
 *  value is not rich JSON (caller falls back to plain text). */
export function richTextToHtml(value: unknown): string | null {
  const doc = parseRichContent(value)
  if (!doc) return null
  return renderChildren(doc)
}

/** Plain-text extraction. For non-rich values, returns the raw string. */
export function richTextToPlainText(value: unknown): string {
  if (typeof value !== "string") return ""
  const doc = parseRichContent(value)
  if (!doc) return value
  return plainTextOf(doc)
}

/** Length of the authored text (used for character budgets). */
export function richTextLength(value: unknown): number {
  return richTextToPlainText(value).trim().length
}

/** True when a rich document has no meaningful text (used for "required" checks). */
export function richJsonIsEmpty(value: unknown): boolean {
  const doc = parseRichContent(value)
  if (!doc) return true
  return richTextLength(doc) === 0
}

// ─── Legacy markdown/plain-text import ─────────────────────────────────────
// Existing mock-tests rows store markdown strings. When an author opens one
// in the rich editor we convert it once (editor-only; the stored value stays
// untouched until the author saves). The parser is deliberately conservative.

function inlineToNodes(text: string): RichTextNode[] {
  const nodes: RichTextNode[] = []
  let rest = text
  const token =
    /(\$\$[^$\n]+\$\$)|(\$[^$\n]+\$)|(`[^`\n]+`)|(\*\*[^*\n]+\*\*)|(__[^_\n]+__)|(\*[^*\n]+\*)|(_[^_\n]+_)|(\[([^\]]+)\]\((https?:\/\/[^\s)]+)\))/g
  let match: RegExpExecArray | null
  let cursor = 0
  while ((match = token.exec(rest)) !== null) {
    if (match.index > cursor) {
      nodes.push({ type: "text", text: rest.slice(cursor, match.index) })
    }
    const [full, blockMath, inlineMath, code, bold, boldAlt, italic, italicAlt, link, linkText, linkHref] =
      match
    if (blockMath) {
      nodes.push({ type: "blockMath", attrs: { tex: blockMath.slice(2, -2).trim() } })
    } else if (inlineMath) {
      nodes.push({ type: "inlineMath", attrs: { tex: inlineMath.slice(1, -1).trim() } })
    } else if (code) {
      nodes.push({ type: "text", text: code.slice(1, -1), marks: [{ type: "code" }] })
    } else if (bold || boldAlt) {
      const inner = (bold ?? boldAlt)!.slice(2, -2)
      nodes.push({ type: "text", text: inner, marks: [{ type: "bold" }] })
    } else if (italic || italicAlt) {
      const inner = (italic ?? italicAlt)!.slice(1, -1)
      nodes.push({ type: "text", text: inner, marks: [{ type: "italic" }] })
    } else if (link) {
      nodes.push({
        type: "text",
        text: linkText ?? "",
        marks: [{ type: "link", attrs: { href: linkHref ?? "" } }],
      })
    } else {
      nodes.push({ type: "text", text: full })
    }
    cursor = match.index + full.length
  }
  if (cursor < rest.length) {
    nodes.push({ type: "text", text: rest.slice(cursor) })
  }
  return nodes
}

/** Convert legacy markdown/plain text into a Tiptap document. */
export function markdownToRich(text: string): RichTextDoc {
  const lines = text.replace(/\r\n/g, "\n").split("\n")
  const content: RichTextNode[] = []
  let paragraph: string[] = []
  let listType: "bullet" | "ordered" | "task" | null = null
  let listItems: RichTextNode[] = []
  let inCode = false
  let codeLines: string[] = []

  function flushParagraph() {
    if (paragraph.length === 0) return
    content.push({ type: "paragraph", content: inlineToNodes(paragraph.join(" ")) })
    paragraph = []
  }

  function flushList() {
    if (listType === null) return
    const items = listItems
    if (listType === "task") {
      content.push({ type: "taskList", content: items })
    } else if (listType === "ordered") {
      content.push({ type: "orderedList", content: items })
    } else {
      content.push({ type: "bulletList", content: items })
    }
    listType = null
    listItems = []
  }

  for (const rawLine of lines) {
    const line = rawLine.trimEnd()
    if (inCode) {
      if (/^```/.test(line)) {
        inCode = false
        content.push({ type: "codeBlock", content: [{ type: "text", text: codeLines.join("\n") }] })
        codeLines = []
      } else {
        codeLines.push(line)
      }
      continue
    }
    if (/^```/.test(line)) {
      flushParagraph()
      flushList()
      inCode = true
      continue
    }
    const heading = /^(#{1,3})\s+(.*)$/.exec(line)
    if (heading) {
      flushParagraph()
      flushList()
      content.push({
        type: "heading",
        attrs: { level: heading[1].length },
        content: inlineToNodes(heading[2]),
      })
      continue
    }
    if (/^---+$/.test(line) || /^\*\*\*+$/.test(line)) {
      flushParagraph()
      flushList()
      content.push({ type: "horizontalRule" })
      continue
    }
    const quote = /^>\s?(.*)$/.exec(line)
    if (quote) {
      flushParagraph()
      flushList()
      content.push({ type: "blockquote", content: inlineToNodes(quote[1]) })
      continue
    }
    const task = /^[-*]\s+\[( |x|X)\]\s+(.*)$/.exec(line)
    if (task) {
      flushParagraph()
      if (listType !== "task") flushList()
      listType = "task"
      listItems.push({
        type: "taskItem",
        attrs: { checked: task[1] !== " " },
        content: [{ type: "paragraph", content: inlineToNodes(task[2]) }],
      })
      continue
    }
    const bullet = /^[-*]\s+(.*)$/.exec(line)
    if (bullet) {
      flushParagraph()
      if (listType !== "bullet") flushList()
      listType = "bullet"
      listItems.push({
        type: "listItem",
        content: [{ type: "paragraph", content: inlineToNodes(bullet[1]) }],
      })
      continue
    }
    const ordered = /^\d+[.)]\s+(.*)$/.exec(line)
    if (ordered) {
      flushParagraph()
      if (listType !== "ordered") flushList()
      listType = "ordered"
      listItems.push({
        type: "listItem",
        content: [{ type: "paragraph", content: inlineToNodes(ordered[1]) }],
      })
      continue
    }
    if (line.trim() === "") {
      flushParagraph()
      flushList()
      continue
    }
    flushList()
    paragraph.push(line)
  }
  flushParagraph()
  flushList()
  if (content.length === 0) {
    content.push({ type: "paragraph", content: [] })
  }
  return { type: "doc", content }
}
