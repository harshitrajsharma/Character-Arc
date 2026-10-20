import {
  Fragment,
  Slice,
  type Mark,
  type Node as ProseMirrorNode,
  type Schema,
} from "@tiptap/pm/model"
import { type EditorState, type Transaction } from "@tiptap/pm/state"
import { Transform } from "@tiptap/pm/transform"
import { tokenizeLegacyMathWithRanges } from "./legacy-math"

/** Normalize only delimited text, retaining unrelated nodes, marks and cursor mapping. */
export function buildMathNormalizationTransaction(
  state: EditorState
): Transaction | null {
  const inlineType = state.schema.nodes.mathInline
  const blockType = state.schema.nodes.mathBlock
  if (!inlineType || !blockType) return null
  const candidates: Array<{
    from: number
    to: number
    tex: string
    display: boolean
    marks: readonly Mark[]
  }> = []
  state.doc.descendants((node, position) => {
    if (node.type.spec.code || node.marks.some((mark) => mark.type.spec.code))
      return false
    if (!node.isTextblock) return true
    let run = ""
    let start = 0
    const flush = () => {
      for (const token of tokenizeLegacyMathWithRanges(run)) {
        const from = start + token.from
        candidates.push({
          ...token,
          from,
          to: start + token.to,
          marks:
            state.doc.nodeAt(from)?.marks ?? state.doc.resolve(from).marks(),
        })
      }
      run = ""
    }
    node.forEach((child, offset) => {
      if (child.isText && !child.marks.some((mark) => mark.type.spec.code)) {
        if (!run) start = position + 1 + offset
        run += child.text ?? ""
      } else if (child.type.name === "hardBreak") {
        if (!run) start = position + 1 + offset
        run += "\n"
      } else flush()
    })
    flush()
    return false
  })
  if (!candidates.length) return null
  const tr = state.tr
  for (const candidate of candidates.reverse()) {
    const from = tr.mapping.map(candidate.from)
    const to = tr.mapping.map(candidate.to)
    const replacement = candidate.display
      ? blockType.create({ tex: candidate.tex })
      : inlineType.create({ tex: candidate.tex }, null, candidate.marks)
    // Trial transforms keep a rejected block fit from partially mutating the transaction.
    const trial = new Transform(tr.doc)
    try {
      const $from = trial.doc.resolve(from)
      const $to = trial.doc.resolve(to)
      if (
        candidate.display &&
        $from.sameParent($to) &&
        $from.parentOffset === 0 &&
        $to.parentOffset === $to.parent.content.size &&
        state.schema.nodes.paragraph
      ) {
        const fragment = Fragment.fromArray([
          replacement,
          state.schema.nodes.paragraph.create(),
        ])
        const parent = $from.node(-1)
        const index = $from.index(-1)
        if (parent.canReplace(index, index + 1, fragment)) {
          trial.replaceWith($from.before(), $to.after(), fragment)
        } else {
          // List items require an initial paragraph before any block equation.
          const withLeadingParagraph = Fragment.fromArray([
            state.schema.nodes.paragraph.create(),
            replacement,
            state.schema.nodes.paragraph.create(),
          ])
          if (!parent.canReplace(index, index + 1, withLeadingParagraph))
            continue
          trial.replaceWith($from.before(), $to.after(), withLeadingParagraph)
        }
      } else {
        trial.replaceRangeWith(from, to, replacement)
      }
      trial.doc.check()
      trial.steps.forEach((step) => tr.step(step))
    } catch {
      // Restricted contexts (for example a code block or mandatory list paragraph)
      // retain their source rather than accepting an invalid document.
    }
  }
  return tr.docChanged ? tr : null
}

/** Plain clipboard prose and equations become a valid block slice before insertion. */
export function mathClipboardSlice(
  text: string,
  schema: Schema,
  marks: readonly Mark[] = []
): Slice | null {
  const tokens = tokenizeLegacyMathWithRanges(text)
  if (
    !tokens.length ||
    !schema.nodes.paragraph ||
    !schema.nodes.mathInline ||
    !schema.nodes.mathBlock
  )
    return null
  const blocks: ProseMirrorNode[] = []
  let inline: ProseMirrorNode[] = []
  const flush = (allowEmpty = false) => {
    if (inline.length || allowEmpty)
      blocks.push(schema.nodes.paragraph.create(null, inline))
    inline = []
  }
  const appendText = (value: string) => {
    const lines = value.split(/\r?\n/)
    lines.forEach((line, index) => {
      if (
        index &&
        !(
          index === 1 &&
          !lines[0] &&
          !inline.length &&
          blocks.at(-1)?.type.name === "mathBlock"
        )
      )
        flush(true)
      if (line) inline.push(schema.text(line, marks))
    })
  }
  let cursor = 0
  for (const token of tokens) {
    appendText(text.slice(cursor, token.from))
    if (token.display) {
      flush()
      blocks.push(schema.nodes.mathBlock.create({ tex: token.tex }))
    } else
      inline.push(
        schema.nodes.mathInline.create({ tex: token.tex }, null, marks)
      )
    cursor = token.to
  }
  appendText(text.slice(cursor))
  flush(blocks.at(-1)?.type.name === "mathBlock")
  const content = Fragment.fromArray(blocks)
  // Open only the paragraph edges, allowing pasted prose to join existing prose.
  return new Slice(
    content,
    blocks[0]?.type.name === "paragraph" ? 1 : 0,
    blocks.at(-1)?.type.name === "paragraph" ? 1 : 0
  )
}
