"use client"

import { useId, useMemo, useState } from "react"
import { Extension, Node, mergeAttributes } from "@tiptap/core"
import { Plugin, PluginKey } from "@tiptap/pm/state"
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
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { Textarea } from "@/components/ui/textarea"

import {
  buildMathNormalizationTransaction,
  mathClipboardSlice,
} from "./math-normalization"

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
            <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
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
      data-math-inline="true"
      data-tex={tex}
      contentEditable={false}
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
      data-math-block="true"
      data-tex={tex}
      contentEditable={false}
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

function isCodeContext(view: EditorView): boolean {
  const { $from } = view.state.selection
  return Boolean(
    $from.parent.type.spec.code ||
    (view.state.storedMarks ?? $from.marks()).some(
      (mark) => mark.type.spec.code
    )
  )
}

const mathNormalizationKey = new PluginKey("mathPaste")

/** Normalize initial, externally synced, typed and pasted dollar-delimited math. */
export const MathPaste = Extension.create({
  name: "mathPaste",

  onCreate() {
    const tr = buildMathNormalizationTransaction(this.editor.state)
    if (tr)
      this.editor.view.dispatch(
        tr.setMeta(mathNormalizationKey, true).setMeta("addToHistory", false)
      )
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: mathNormalizationKey,
        appendTransaction(transactions, _previousState, state) {
          if (
            !transactions.some(
              (tr) => tr.docChanged && !tr.getMeta(mathNormalizationKey)
            )
          )
            return null
          return (
            buildMathNormalizationTransaction(state)?.setMeta(
              mathNormalizationKey,
              true
            ) ?? null
          )
        },
        props: {
          handlePaste(view, event) {
            if (isCodeContext(view)) return false
            // Rich clipboard content follows ProseMirror's parser to preserve its marks;
            // appendTransaction normalizes its text after insertion.
            if (event.clipboardData?.getData("text/html")) return false
            const text = event.clipboardData?.getData("text/plain") ?? ""
            const slice = mathClipboardSlice(
              text,
              view.state.schema,
              view.state.storedMarks ?? view.state.selection.$from.marks()
            )
            if (!slice) return false
            try {
              const tr = view.state.tr.replaceSelection(slice)
              tr.doc.check()
              if (!tr.docChanged) return false
              view.dispatch(tr.scrollIntoView())
              event.preventDefault()
              return true
            } catch {
              return false
            }
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
})
