"use client"

import { useEffect, useRef } from "react"

import {
  BlockNoteSchema,
  defaultBlockSpecs,
  defaultInlineContentSpecs,
  defaultStyleSpecs,
} from "@blocknote/core"
import { en } from "@blocknote/core/locales"
import { useCreateBlockNote } from "@blocknote/react"
import { BlockNoteView } from "@blocknote/shadcn"
import { useReducedMotion } from "motion/react"
import { useTheme } from "next-themes"

import { cn } from "@/lib/utils"

const markdownEditorSchema = BlockNoteSchema.create({
  blockSpecs: {
    paragraph: defaultBlockSpecs.paragraph,
    heading: defaultBlockSpecs.heading,
    bulletListItem: defaultBlockSpecs.bulletListItem,
    numberedListItem: defaultBlockSpecs.numberedListItem,
    checkListItem: defaultBlockSpecs.checkListItem,
    quote: defaultBlockSpecs.quote,
    codeBlock: defaultBlockSpecs.codeBlock,
    table: defaultBlockSpecs.table,
    divider: defaultBlockSpecs.divider,
  },
  inlineContentSpecs: defaultInlineContentSpecs,
  styleSpecs: {
    bold: defaultStyleSpecs.bold,
    italic: defaultStyleSpecs.italic,
    strike: defaultStyleSpecs.strike,
    code: defaultStyleSpecs.code,
  },
})

export type MarkdownBlockEditorProps = {
  id: string
  name?: string
  value: string
  onChange: (markdown: string) => void
  placeholder: string
  ariaLabelledBy: string
  ariaInvalid?: boolean
  className?: string
}

export function MarkdownBlockEditorImpl({
  id,
  name,
  value,
  onChange,
  placeholder,
  ariaLabelledBy,
  ariaInvalid = false,
  className,
}: MarkdownBlockEditorProps) {
  const initialized = useRef(false)
  const reduceMotion = useReducedMotion()
  const { resolvedTheme } = useTheme()
  const editor = useCreateBlockNote(
    {
      schema: markdownEditorSchema,
      animations: !reduceMotion,
      dictionary: {
        ...en,
        placeholders: {
          ...en.placeholders,
          default: placeholder,
          emptyDocument: placeholder,
        },
      },
    },
    [placeholder, reduceMotion]
  )

  useEffect(() => {
    if (initialized.current) {
      return
    }

    const initialBlocks = value.trim()
      ? editor.tryParseMarkdownToBlocks(value)
      : editor.tryParseMarkdownToBlocks("")

    editor.replaceBlocks(editor.document, initialBlocks)
    initialized.current = true
  }, [editor, value])

  return (
    <div
      id={id}
      data-invalid={ariaInvalid || undefined}
      className={cn("markdown-block-editor", className)}
    >
      {name ? <input type="hidden" name={name} value={value} /> : null}
      <BlockNoteView
        editor={editor}
        theme={resolvedTheme === "dark" ? "dark" : "light"}
        onChange={() => {
          if (!initialized.current) {
            return
          }

          onChange(editor.blocksToMarkdownLossy(editor.document).trim())
        }}
        aria-labelledby={ariaLabelledBy}
        aria-invalid={ariaInvalid || undefined}
      />
    </div>
  )
}
