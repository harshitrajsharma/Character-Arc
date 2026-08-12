// Runtime smoke test for the LaTeX input rules in math-extensions.tsx.
// Replicates TipTap v3's `run()` flow exactly (getTextContentFromNodes +
// position check + range math) and applies the same handler logic, asserting
// the resulting documents are valid.

import { Schema, Fragment } from "@tiptap/pm/model"
import { EditorState, TextSelection } from "@tiptap/pm/state"

// ---- Minimal schema mirroring the real editor (the relevant nodes) ----
const schema = new Schema({
  nodes: {
    doc: { content: "block+" },
    paragraph: { content: "inline*", group: "block" },
    text: { group: "inline" },
    hardBreak: { inline: true, group: "inline", selectable: false },
    mathInline: { group: "inline", inline: true, atom: true, selectable: true, attrs: { tex: { default: "" } } },
    mathBlock: { group: "block", atom: true, selectable: true, attrs: { tex: { default: "" } } },
  },
})

// ---- Replicate TipTap helpers ----
function getTextContentFromNodes($from) {
  let textBefore = ""
  const sliceEndPos = $from.parentOffset
  $from.parent.nodesBetween(Math.max(0, sliceEndPos - 500), sliceEndPos, (node, pos) => {
    const chunk = node.textContent || "%leaf%"
    textBefore += node.isAtom && !node.isText ? chunk : chunk.slice(0, Math.max(0, sliceEndPos - pos))
  })
  return textBefore
}

function looksLikeLatex(tex) {
  return /\\|[\^_{}]/.test(tex) || !/\s/.test(tex)
}

// Replicate run(): given a doc with the pre-typed text (all but the final
// char), the typed char, and a rule, produce TipTap's dispatch decision.
// fromPos defaults to the end of the last paragraph's inline content (where
// the caret actually sits in the editor — NOT the doc-level end position).
function simulateInputRule(doc, typedText, rule, fromPos) {
  if (fromPos === undefined) {
    // A top-level block's content begins at position 1 (doc wrapper counts 1),
    // so the caret at the end of its inline content sits at 1 + content.size.
    const last = doc.child(doc.childCount - 1)
    fromPos = 1 + last.content.size
  }
  const view = { state: EditorState.create({ doc, schema }) }
  const $from = view.state.doc.resolve(fromPos)
  const text = typedText
  const textBefore = getTextContentFromNodes($from) + text
  const match = rule.find.exec(textBefore)
  if (!match) return { fired: false }

  const matchedDocLength = match[0].length - text.length
  if (matchedDocLength > 0) {
    const matchStartOffset = $from.parentOffset - matchedDocLength
    if (
      matchStartOffset < 0 ||
      $from.parent.textBetween(matchStartOffset, $from.parentOffset) !== match[0].slice(0, matchedDocLength)
    ) {
      return { fired: false }
    }
  }
  const tr = view.state.tr
  const range = { from: fromPos - (match[0].length - text.length), to: fromPos }

  // ---- EXACT handler logic from math-extensions.tsx ----
  const handlerResult = rule.handler({ state: { tr, schema }, range, match })
  if (handlerResult === null || !tr.steps.length) return { fired: false }

  return { fired: true, tr, doc: tr.doc }
}

function textOf(doc) {
  return doc.textBetween(0, doc.content.size, "\n", "￼")
}

function assert(cond, msg) {
  if (!cond) {
    console.error("  ✗ FAIL:", msg)
    process.exitCode = 1
  } else {
    console.log("  ✓", msg)
  }
}

// ---- The two handlers, copied from math-extensions.tsx ----
const inlineHandler = ({ state, range, match }) => {
  const tex = match[1]?.trim()
  if (!tex || !looksLikeLatex(tex)) return null
  const { tr, schema: s } = state
  const start = range.from
  const end = range.to
  if (tr.doc.resolve(start).parent !== tr.doc.resolve(end).parent) return null
  try {
    tr.replaceRangeWith(start, end, s.nodes.mathInline.create({ tex }))
    tr.setSelection(TextSelection.near(tr.doc.resolve(start + 1)))
  } catch {
    return null
  }
}

const blockHandler = ({ state, range, match }) => {
  const tex = match[1]?.trim()
  if (!tex || !looksLikeLatex(tex)) return null
  const { tr, schema: s } = state
  const start = range.from
  const end = range.to
  const $start = tr.doc.resolve(start)
  const $end = tr.doc.resolve(end)
  if ($start.parent !== $end.parent) return null
  if ($start.parentOffset !== 0) return null
  if ($end.parentOffset !== $end.parent.content.size) return null
  const block = s.nodes.mathBlock.create({ tex })
  const wrapper = s.nodes.paragraph.create(null, block)
  const spacer = s.nodes.paragraph.create()
  const from = $start.before()
  const to = $end.after()
  try {
    tr.replaceWith(from, to, Fragment.fromArray([wrapper, spacer]))
    tr.setSelection(TextSelection.near(tr.doc.resolve(from + 2)))
  } catch {
    return null
  }
}

const rules = {
  inline: { find: /(?<![\\$])\$([^$]+)\$$/, handler: inlineHandler },
  block: { find: /\$\$([^$]+)\$\$$/, handler: blockHandler },
}

const para = (text) => schema.node("paragraph", null, schema.text(text))

// ================= TESTS =================
console.log("Inline math:")

{
  // typing "$x^2" then the closing "$"
  const doc = schema.node("doc", null, [para("$x^2")])
  const r = simulateInputRule(doc, "$", rules.inline)
  const ok = r.fired && r.doc.child(0).child(0).type.name === "mathInline" && r.doc.child(0).child(0).attrs.tex === "x^2"
  assert(ok, "typing `$x^2$` converts to inline math node with tex=\"x^2\"")
}

{
  // dollar amounts mid-sentence, cursor at end — must NOT convert
  const doc = schema.node("doc", null, [para("cost is $5 and $10")])
  const r = simulateInputRule(doc, "0", rules.inline)
  assert(!r.fired, "`$5 and $10` dollar amounts are NOT converted (position check)")
}

{
  // compact formula, no whitespace
  const doc = schema.node("doc", null, [para("$2x+3")])
  const r = simulateInputRule(doc, "$", rules.inline)
  assert(r.fired && r.doc.child(0).child(0).attrs.tex === "2x+3", "`$2x+3$` converts (compact formula)")
}

{
  // math in the middle of a sentence: leading text preserved, atom appended,
  // no stray "$" delimiters remain
  const doc = schema.node("doc", null, [para("the value $x^2")])
  const r = simulateInputRule(doc, "$", rules.inline)
  const p = r.doc.child(0)
  assert(
    r.fired &&
      p.childCount === 2 &&
      p.child(0).isText &&
      p.child(0).text === "the value " &&
      p.child(1).type.name === "mathInline",
    "`the value $x^2$` → [text \"the value \", mathInline], no stray delimiters"
  )
}

{
  // LaTeX command like \frac{a}{b}
  const doc = schema.node("doc", null, [para("$\\frac{a}{b}")])
  const r = simulateInputRule(doc, "$", rules.inline)
  assert(r.fired && r.doc.child(0).child(0).attrs.tex === "\\frac{a}{b}", "`$\\frac{a}{b}$` converts via backslash heuristic")
}

{
  // escaped dollar must NOT convert (negative lookbehind)
  const doc = schema.node("doc", null, [para("\\$x^2")])
  const r = simulateInputRule(doc, "$", rules.inline)
  assert(!r.fired, "escaped `\\$x^2$` is not converted")
}

{
  // plain prose in dollar signs (whitespace, no latex markers) not converted
  const doc = schema.node("doc", null, [para("$a long note")])
  const r = simulateInputRule(doc, "$", rules.inline)
  assert(!r.fired, "`$a long note$` prose is not converted")
}

{
  // math spanning a hard break must NOT convert inline
  const doc = schema.node("doc", null, [schema.node("paragraph", null, [schema.text("$x"), schema.node("hardBreak"), schema.text("^2")])])
  const r = simulateInputRule(doc, "$", rules.inline)
  assert(!r.fired, "inline math spanning a hard break is not converted")
}

{
  // cursor lands at end of paragraph after inline conversion
  const doc = schema.node("doc", null, [para("$a+b")])
  const r = simulateInputRule(doc, "$", rules.inline)
  assert(r.fired && r.tr.selection.from === r.doc.content.size, "cursor lands at end of paragraph after inline conversion")
}

console.log("\nBlock math:")

{
  // "$$x^2$" then final "$" on its own line → mathBlock + spacer paragraph
  const doc = schema.node("doc", null, [para("$$x^2$")])
  const r = simulateInputRule(doc, "$", rules.block)
  const childCount = r.doc.childCount
  const firstIsBlock = r.doc.child(0).type.name === "mathBlock"
  const firstTex = r.doc.child(0).attrs.tex
  const spacerIsEmpty = childCount === 2 && r.doc.child(1).content.size === 0
    assert(r.fired && firstIsBlock && firstTex === "x^2" && spacerIsEmpty, "`$$x^2$$` alone on a line → mathBlock + empty spacer paragraph")
}

{
  // block equation with a command
  const doc = schema.node("doc", null, [para("$$\\int f(x)\\,dx$")])
  const r = simulateInputRule(doc, "$", rules.block)
  assert(r.fired && r.doc.child(0).child(0).attrs.tex === "\\int f(x)\\,dx", "block equation with command converts")
}

{
  // dollar amount alone on a line is not converted
  const doc = schema.node("doc", null, [para("$$10")])
  const r = simulateInputRule(doc, "$", rules.block)
  assert(!r.fired, "`$$10$` (plain amount) is not converted")
}

{
  // empty math not converted
  const doc = schema.node("doc", null, [para("$$")])
  const r = simulateInputRule(doc, "$", rules.block)
  assert(!r.fired, "empty `$$$` is not converted")
}

{
  // block math not on its own line (preceded by text) must NOT convert
  const doc = schema.node("doc", null, [para("say $$x^2$")])
  const r = simulateInputRule(doc, "$", rules.block)
  assert(!r.fired, "`say $$x^2$$` (not alone on line) is not converted as block")
}

console.log("\nDone.")
