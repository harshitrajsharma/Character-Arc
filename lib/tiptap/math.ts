import { Node, mergeAttributes } from "@tiptap/core"
import { InputRule, inputRules } from "@tiptap/pm/inputrules"

/**
 * LaTeX math nodes for the rich question editor.
 *
 * Content model: the node is an atom that carries the LaTeX source in
 * `attrs.tex`. Typing `$...$` creates inline math and `$$...$$` on its own
 * line creates a block equation. The schema stays server-safe (pure
 * ProseMirror); the live KaTeX preview is layered on top with a React node
 * view in the editor component, and the read-only renderer uses
 * `katex.renderToString` (see `lib/tiptap/serialize.ts`).
 */

const INLINE_MATH_FIND = /(?<!\$)\$([^$\n]+)\$(?!\$)/u
const BLOCK_MATH_FIND = /^\$\$([\s\S]+)\$\$$/

function texFromMatch(match: RegExpMatchArray): string | null {
  const tex = match[1]?.trim()
  return tex ? tex : null
}

export const InlineMath = Node.create({
  name: "inlineMath",

  group: "inline",
  inline: true,
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      tex: {
        default: "",
        parseHTML: (element) => element.getAttribute("data-tex") ?? "",
        renderHTML: (attributes) => ({ "data-tex": attributes.tex ?? "" }),
      },
    }
  },

  parseHTML() {
    return [{ tag: "span[data-math-type='inline']" }]
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      "span",
      mergeAttributes(HTMLAttributes, {
        "data-math-type": "inline",
        class: "math-inline",
      }),
      node.attrs.tex,
    ]
  },

  renderText({ node }) {
    return `$${node.attrs.tex}$`
  },

  addProseMirrorPlugins() {
    return [
      inputRules({
        rules: [
          new InputRule(INLINE_MATH_FIND, (state, match, start, end) => {
            const tex = texFromMatch(match)
            if (!tex) return null
            return state.tr.replaceRangeWith(start, end, this.type.create({ tex }))
          }),
        ],
      }),
    ]
  },
})

export const BlockMath = Node.create({
  name: "blockMath",

  group: "block",
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      tex: {
        default: "",
        parseHTML: (element) => element.getAttribute("data-tex") ?? "",
        renderHTML: (attributes) => ({ "data-tex": attributes.tex ?? "" }),
      },
    }
  },

  parseHTML() {
    return [{ tag: "div[data-math-type='block']" }]
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-math-type": "block",
        class: "math-block",
      }),
      node.attrs.tex,
    ]
  },

  renderText({ node }) {
    return `\n$$${node.attrs.tex}$$\n`
  },

  addProseMirrorPlugins() {
    return [
      inputRules({
        rules: [
          new InputRule(BLOCK_MATH_FIND, (state, match, start, end) => {
            const tex = texFromMatch(match)
            if (!tex) return null
            return state.tr.replaceRangeWith(start, end, this.type.create({ tex }))
          }),
        ],
      }),
    ]
  },
})
