"use client"

import { useLayoutEffect, useRef } from "react"

import { cn } from "@/lib/utils"
import {
  legacyMathToHtml,
  renderTex,
} from "@/components/tools/mock-tests/editor/legacy-math"

/**
 * Shared read-only renderer for rich question content (stems, options,
 * explanations) everywhere outside the editor: question bank, assessment
 * builder, attempt player, analysis.
 *
 * Renders the stored HTML inside `.rich-text` (shared typography with the
 * editor) and enhances math atoms (`[data-math-inline]` / `[data-math-block]`
 * with `data-tex`) with rendered KaTeX before paint. Text written before the
 * rich editor existed (raw `$...$` / `$$...$$`) is also upgraded to KaTeX.
 */

/**
 * Replaces legacy dollar-delimited math in plain text nodes with rendered
 * KaTeX, skipping code blocks and already-enhanced math atoms.
 */
function enhanceLegacyMath(root: HTMLElement) {
  // Use the standard SHOW_TEXT value instead of the global NodeFilter binding;
  // some browser runtimes expose the document API without that global.
  const walker = root.ownerDocument.createTreeWalker(root, 4)
  const candidates: Text[] = []
  for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
    if (node.nodeValue?.includes("$")) {
      candidates.push(node as Text)
    }
  }
  for (const textNode of candidates) {
    const parent = textNode.parentElement
    if (parent === null) continue
    if (
      parent.closest(
        "code, pre, script, style, [data-math-inline], [data-math-block]"
      )
    ) {
      continue
    }
    const html = legacyMathToHtml(textNode.nodeValue ?? "")
    if (html === null) continue
    const wrapper = document.createElement("span")
    wrapper.innerHTML = html
    textNode.replaceWith(...wrapper.childNodes)
  }
}

export function RichContent({
  html,
  className,
  style,
}: {
  html: string
  className?: string
  style?: React.CSSProperties
}) {
  const rootRef = useRef<HTMLDivElement | null>(null)

  useLayoutEffect(() => {
    const root = rootRef.current
    if (!root) return
    const mathNodes = root.querySelectorAll<HTMLElement>(
      "[data-math-inline], [data-math-block]"
    )
    for (const element of mathNodes) {
      const tex = element.getAttribute("data-tex") ?? ""
      element.innerHTML = renderTex(tex, element.hasAttribute("data-math-block"))
    }
    enhanceLegacyMath(root)
    // The parent can toggle between Form and Preview without changing the
    // HTML string; re-run after each commit so React cannot leave raw math
    // atoms visible after that mode switch.
  })

  return (
    <div
      ref={rootRef}
      style={style}
      className={cn("rich-text", className)}
      // Author-authored HTML is trusted: it is produced by the rich editor
      // and sanitized by Tiptap's schema on the way in.
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
