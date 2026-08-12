"use client"

import { useId, useMemo, useState } from "react"
import { Extension, InputRule, Node, mergeAttributes } from "@tiptap/core"
import { Fragment } from "@tiptap/pm/model"
import {
  Plugin,
  PluginKey,
  TextSelection,
  type Transaction,
} from "@tiptap/pm/state"
import type { EditorView } from "@tiptap/pm/view"
import {
  NodeViewWrapper,
  ReactNodeViewRenderer,
  type ReactNodeViewProps,
} from "@tiptap/react"
import katex from "katex"
import { CheckIcon, PencilIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Field,
  FieldDescription,
  FieldLabel,
} from "@/components/ui/field"
import { Textarea } from "@/components/ui/textarea"

import { parseDelimitedMath } from "./legacy-math"

/**
 * KaTeX math atoms for the rich question editor.
 *
 * The ProseMirror node is an atom holding `attrs.tex`. In the editor the
 * node view renders the formula live; on serialize we emit a span/div with
 * `data-math-inline` / `data-math-block` + `data-tex`, which the read-only
 * `RichContent` renderer enhances with rendered KaTeX (and which the editor
 * can parse back on re-open).
 */

function renderTex(tex: string, displayMode: boolean): string {
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

function MathEditDialog({
  open,
  onOpenChange,
  tex,
  displayMode,
  onSave,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  tex: string
  displayMode: boolean
  onSave: (tex: string) => void
}) {
  const [draft, setDraft] = useState(tex)
  const fieldId = useId()

  const preview = useMemo(
    () => renderTex(draft, displayMode),
    [displayMode, draft]
  )

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) setDraft(tex)
    onOpenChange(nextOpen)
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const next = draft.trim()
    if (!next) return
    setDraft(next)
    onSave(next)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="gap-4 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            Edit {displayMode ? "display equation" : "inline equation"}
          </DialogTitle>
          <DialogDescription>
            Update the LaTeX source and check the rendered result before
            applying it.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Field>
            <FieldLabel htmlFor={fieldId}>LaTeX source</FieldLabel>
            <Textarea
              id={fieldId}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              autoFocus
              spellCheck={false}
              className="min-h-24 resize-y font-mono text-sm"
            />
            <FieldDescription>
              Use standard KaTeX syntax, without the surrounding dollar
              delimiters.
            </FieldDescription>
          </Field>

          <div className="flex flex-col gap-2 rounded-lg border border-border bg-muted/40 p-3">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Live preview
            </p>
            <div
              aria-live="polite"
              className="min-h-10 overflow-x-auto py-1 text-center"
              dangerouslySetInnerHTML={{ __html: preview }}
            />
          </div>

          <DialogFooter className="mt-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!draft.trim()}>
              <CheckIcon data-icon="inline-start" aria-hidden="true" />
              Apply equation
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function selectNode(
  editor: ReactNodeViewProps["editor"],
  getPos: (() => number | undefined) | undefined
) {
  const pos = typeof getPos === "function" ? getPos() : null
  if (pos !== null && pos !== undefined) {
    editor.chain().setNodeSelection(pos).focus().run()
  }
}

function InlineMathNodeView({
  node,
  selected,
  updateAttributes,
  editor,
  getPos,
}: ReactNodeViewProps) {
  const tex = String(node.attrs.tex ?? "")
  const [editOpen, setEditOpen] = useState(false)

  return (
    <NodeViewWrapper
      as="span"
      className="math-inline"
      onClick={() => selectNode(editor, getPos)}
      onDoubleClick={(event: React.MouseEvent) => {
        event.stopPropagation()
        setEditOpen(true)
      }}
    >
      <span
        className="math-render"
        dangerouslySetInnerHTML={{ __html: renderTex(tex, false) }}
      />
      {selected ? (
        <button
          type="button"
          className="math-edit-button"
          onClick={(event) => {
            event.stopPropagation()
            setEditOpen(true)
          }}
          aria-label="Edit LaTeX"
          title="Edit LaTeX"
        >
          <PencilIcon className="size-3" aria-hidden="true" />
        </button>
      ) : null}
      <MathEditDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        tex={tex}
        displayMode={false}
        onSave={(next) => {
          updateAttributes({ tex: next })
          editor.commands.focus()
        }}
      />
    </NodeViewWrapper>
  )
}

function BlockMathNodeView({
  node,
  selected,
  updateAttributes,
  editor,
  getPos,
}: ReactNodeViewProps) {
  const tex = String(node.attrs.tex ?? "")
  const [editOpen, setEditOpen] = useState(false)

  return (
    <NodeViewWrapper
      className="math-block"
      onClick={() => selectNode(editor, getPos)}
      onDoubleClick={(event: React.MouseEvent) => {
        event.stopPropagation()
        setEditOpen(true)
      }}
    >
      <div
        className="math-render"
        dangerouslySetInnerHTML={{ __html: renderTex(tex, true) }}
      />
      {selected ? (
        <button
          type="button"
          className="math-edit-button"
          onClick={(event) => {
            event.stopPropagation()
            setEditOpen(true)
          }}
          aria-label="Edit LaTeX"
          title="Edit LaTeX"
        >
          <PencilIcon className="size-3" aria-hidden="true" />
        </button>
      ) : null}
      <MathEditDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        tex={tex}
        displayMode
        onSave={(next) => {
          updateAttributes({ tex: next })
          editor.commands.focus()
        }}
      />
    </NodeViewWrapper>
  )
}

const mathAttributes = {
  tex: {
    default: "",
    parseHTML: (element: HTMLElement) => element.getAttribute("data-tex") ?? "",
    renderHTML: (attributes: Record<string, unknown>) => ({
      "data-tex": attributes.tex,
    }),
  },
}

/**
 * Decide whether a `$...$` / `$$...$$` capture is really LaTeX rather than
 * plain text. Real LaTeX almost always contains a command, superscript,
 * subscript, or brace. We also accept compact whitespace-free formulas
 * (`$2x+3$`) so simple math converts too, while avoiding mangling dollar
 * amounts like "$5 and $10".
 */
function looksLikeLatex(tex: string): boolean {
  const source = tex.trim()
  if (!source || /^[\d\s.,%]+$/.test(source)) return false
  return /\\|[\^_{}=+\-*/<>]/.test(source) || !/\s/.test(source)
}

/** Auto-convert `$...$` to an inline math atom as you type. */
function inlineMathInputRule(): InputRule {
  return new InputRule({
    // Opening `$` must not be escaped (`\$`) or be the second of a `$$` block.
    find: /(?<![\\$])\$([^$]+)\$$/,
    handler: ({ state, range, match }) => {
      const tex = match[1]?.trim()
      if (!tex || !looksLikeLatex(tex)) return null

      const { tr, schema } = state
      const start = range.from
      const end = range.to
      if (tr.doc.resolve(start).parent !== tr.doc.resolve(end).parent) return null

      try {
        tr.replaceRangeWith(start, end, schema.nodes.mathInline.create({ tex }))
        tr.setSelection(TextSelection.near(tr.doc.resolve(start + 1)))
      } catch {
        // Replacement would produce an invalid document (e.g. spans a hard
        // break); leave the text as typed.
        return null
      }
    },
  })
}

/**
 * Auto-convert `$$...$$` to a block math atom when it is the entire content of
 * its own paragraph (i.e. typed on its own line). The paragraph is replaced
 * with the equation followed by an empty paragraph so typing can continue.
 */
function blockMathInputRule(): InputRule {
  return new InputRule({
    find: /\$\$([\s\S]+?)\$\$$/,
    handler: ({ state, range, match }) => {
      const tex = match[1]?.trim()
      if (!tex) return null

      const { tr, schema } = state
      const start = range.from
      const end = range.to
      const $start = tr.doc.resolve(start)
      const $end = tr.doc.resolve(end)

      if ($start.parent !== $end.parent) return null
      if ($start.parentOffset !== 0) return null
      if ($end.parentOffset !== $end.parent.content.size) return null

      const from = $start.before()
      const to = $end.after()
      replaceParagraphWithBlockMath(tr, schema, from, to, tex)
    },
  })
}

/** Replace a textblock with a valid block equation followed by an empty paragraph. */
function replaceParagraphWithBlockMath(
  tr: Transaction,
  schema: Transaction["doc"]["type"]["schema"],
  from: number,
  to: number,
  tex: string
): boolean {
  const block = schema.nodes.mathBlock?.create({ tex })
  const paragraph = schema.nodes.paragraph?.create()
  if (!block || !paragraph) return false

  try {
    tr.replaceWith(from, to, Fragment.fromArray([block, paragraph]))
    tr.setSelection(
      TextSelection.near(tr.doc.resolve(from + block.nodeSize + 1))
    )
    return true
  } catch {
    return false
  }
}

function isCodeContext(view: EditorView): boolean {
  const { $from } = view.state.selection
  return Boolean(
    $from.parent.type.spec.code ||
      $from.nodeBefore?.marks.some((mark) => mark.type.spec.code)
  )
}

function insertPastedMath(view: EditorView, text: string): boolean {
  const math = parseDelimitedMath(text)
  if (!math || isCodeContext(view)) return false

  const { state } = view
  const { selection } = state
  const { $from, $to } = selection

  if (math.display) {
    if (
      $from.parent !== $to.parent ||
      $from.parent.type.name !== "paragraph"
    ) {
      return false
    }

    const replacesWholeParagraph =
      $from.parentOffset === 0 &&
      $to.parentOffset === $to.parent.content.size
    if (!replacesWholeParagraph) return false

    const tr = state.tr
    const handled = replaceParagraphWithBlockMath(
      tr,
      state.schema,
      $from.before(),
      $from.after(),
      math.tex
    )
    if (!handled) return false

    view.dispatch(tr.scrollIntoView())
    return true
  }

  if ($from.parent !== $to.parent || !$from.parent.isTextblock) {
    return false
  }

  const node = state.schema.nodes.mathInline?.create({ tex: math.tex })
  if (!node) return false

  const tr = state.tr.replaceSelectionWith(node)
  if (!tr.docChanged) return false

  view.dispatch(tr.scrollIntoView())
  return true
}

/** Converts exact `$...$` / `$$...$$` clipboard text into a math atom. */
export const MathPaste = Extension.create({
  name: "mathPaste",

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey("mathPaste"),
        props: {
          handlePaste: (view, event) => {
            const text = event.clipboardData?.getData("text/plain") ?? ""
            const handled = insertPastedMath(view, text)
            if (handled) event.preventDefault()
            return handled
          },
        },
      }),
    ]
  },
})

/** Inline math atom (`$...$`). Serializes as `<span data-math-inline>`. */
export const MathInline = Node.create({
  name: "mathInline",

  group: "inline",
  inline: true,
  atom: true,
  selectable: true,
  draggable: false,

  addAttributes() {
    return mathAttributes
  },

  parseHTML() {
    return [{ tag: "span[data-math-inline]" }]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "span",
      mergeAttributes(HTMLAttributes, {
        "data-math-inline": "true",
        class: "math-inline",
      }),
    ]
  },

  addNodeView() {
    return ReactNodeViewRenderer(InlineMathNodeView)
  },

  addInputRules() {
    return [inlineMathInputRule()]
  },
})

/** Display math atom (`$$...$$`). Serializes as `<div data-math-block>`. */
export const MathBlock = Node.create({
  name: "mathBlock",

  group: "block",
  atom: true,
  selectable: true,
  draggable: false,

  addAttributes() {
    return mathAttributes
  },

  parseHTML() {
    return [{ tag: "div[data-math-block]" }]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-math-block": "true",
        class: "math-block",
      }),
    ]
  },

  addNodeView() {
    return ReactNodeViewRenderer(BlockMathNodeView)
  },

  addInputRules() {
    return [blockMathInputRule()]
  },
})
