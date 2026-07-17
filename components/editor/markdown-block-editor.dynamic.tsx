"use client"

import dynamic from "next/dynamic"

import type { MarkdownBlockEditorProps } from "@/components/editor/markdown-block-editor"
import { Spinner } from "@/components/ui/spinner"

const MarkdownBlockEditorClient = dynamic(
  () =>
    import("@/components/editor/markdown-block-editor").then(
      (module) => module.MarkdownBlockEditorImpl
    ),
  {
    ssr: false,
    loading: () => (
      <div
        className="flex min-h-28 items-center justify-center text-muted-foreground"
        role="status"
      >
        <Spinner />
        <span className="sr-only">Loading editor</span>
      </div>
    ),
  }
)

export function MarkdownBlockEditor(props: MarkdownBlockEditorProps) {
  return <MarkdownBlockEditorClient {...props} />
}
