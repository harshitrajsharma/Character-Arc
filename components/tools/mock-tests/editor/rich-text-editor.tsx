"use client"

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react"
import {
  EditorContent,
  useEditor,
  useEditorState,
  type Editor,
} from "@tiptap/react"
import { BubbleMenu } from "@tiptap/react/menus"
import StarterKit from "@tiptap/starter-kit"
import Link from "@tiptap/extension-link"
import Underline from "@tiptap/extension-underline"
import { TextStyle } from "@tiptap/extension-text-style"
import Color from "@tiptap/extension-color"
import Highlight from "@tiptap/extension-highlight"
import Image from "@tiptap/extension-image"
import { Table } from "@tiptap/extension-table"
import TableCell from "@tiptap/extension-table-cell"
import TableHeader from "@tiptap/extension-table-header"
import TableRow from "@tiptap/extension-table-row"
import TaskItem from "@tiptap/extension-task-item"
import TaskList from "@tiptap/extension-task-list"
import { Placeholder } from "@tiptap/extensions"
import katex from "katex"
import {
  BoldIcon,
  CheckIcon,
  CodeIcon,
  EraserIcon,
  HighlighterIcon,
  ItalicIcon,
  Link2Icon,
  ListChecksIcon,
  ListIcon,
  ListOrderedIcon,
  PaletteIcon,
  MoreHorizontalIcon,
  QuoteIcon,
  Redo2Icon,
  SigmaIcon,
  SquareCodeIcon,
  StrikethroughIcon,
  Table2Icon,
  UnderlineIcon,
  Undo2Icon,
  UnlinkIcon,
  XIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { MathBlock, MathInline, MathPaste } from "./math-extensions"
import { ImageInsertPopover } from "./image-insert-popover"

const TEXT_COLORS = [
  { label: "Red", value: "#dc2626" },
  { label: "Orange", value: "#ea580c" },
  { label: "Amber", value: "#d97706" },
  { label: "Green", value: "#16a34a" },
  { label: "Teal", value: "#0d9488" },
  { label: "Blue", value: "#2563eb" },
  { label: "Violet", value: "#7c3aed" },
  { label: "Pink", value: "#db2777" },
  { label: "Gray", value: "#6b7280" },
]

const HIGHLIGHT_COLORS = [
  { label: "Red", value: "#fecaca" },
  { label: "Amber", value: "#fde68a" },
  { label: "Green", value: "#bbf7d0" },
  { label: "Blue", value: "#bfdbfe" },
  { label: "Violet", value: "#ddd6fe" },
  { label: "Pink", value: "#fbcfe8" },
]

function toolbarButtonClass(active: boolean): string {
  return cn(
    "inline-flex size-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/30 disabled:pointer-events-none disabled:opacity-40 sm:size-8",
    active &&
      "bg-foreground font-semibold text-background shadow-2xs hover:bg-foreground/90"
  )
}

function ToolbarButton({
  active = false,
  disabled,
  onClick,
  title,
  ariaExpanded,
  children,
}: {
  active?: boolean
  disabled?: boolean
  onClick?: () => void
  title: string
  ariaExpanded?: boolean
  children: ReactNode
}) {
  return (
    <button
      type="button"
      className={toolbarButtonClass(active)}
      disabled={disabled}
      onClick={onClick}
      title={title}
      aria-label={title}
      aria-pressed={active}
      aria-expanded={ariaExpanded}
    >
      {children}
    </button>
  )
}

function ToolbarSeparator() {
  return (
    <span
      className="mx-0.5 h-7 w-px shrink-0 bg-border sm:h-5"
      aria-hidden="true"
    />
  )
}

function LinkPopover({ editor, isLink }: { editor: Editor; isLink: boolean }) {
  const [open, setOpen] = useState(false)
  const [href, setHref] = useState("")

  function openPopover() {
    setHref(String(editor.getAttributes("link").href ?? ""))
    setOpen(true)
  }

  function applyLink() {
    const url = href.trim()
    if (!url) {
      editor.chain().focus().unsetLink().run()
    } else {
      const normalized = /^(https?:\/\/|mailto:|tel:)/i.test(url)
        ? url
        : `https://${url}`
      editor.chain().focus().setLink({ href: normalized }).run()
    }
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className={toolbarButtonClass(isLink)}
        aria-label="Insert link"
        title="Insert link"
        onClick={openPopover}
      >
        <Link2Icon className="size-4" aria-hidden="true" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72">
        <div className="grid gap-2">
          <Label htmlFor="rich-link-url">URL</Label>
          <Input
            id="rich-link-url"
            value={href}
            onChange={(event) => setHref(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") applyLink()
            }}
            placeholder="https://example.com"
            autoFocus
          />
          <div className="flex justify-end gap-2">
            {isLink ? (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => {
                  editor.chain().focus().unsetLink().run()
                  setOpen(false)
                }}
              >
                <UnlinkIcon data-icon="inline-start" aria-hidden="true" />
                Remove
              </Button>
            ) : null}
            <Button type="button" size="sm" onClick={applyLink}>
              {isLink ? "Update" : "Insert link"}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

function MathPopover({
  editor,
  mode,
}: {
  editor: Editor
  mode: "inline" | "block"
}) {
  const [open, setOpen] = useState(false)
  const [tex, setTex] = useState("")

  const preview = useMemo(() => {
    if (!tex.trim()) return null
    return katex.renderToString(tex, {
      throwOnError: false,
      displayMode: mode === "block",
      output: "html",
    })
  }, [tex, mode])

  function insertMath() {
    const source = tex.trim()
    if (!source) return
    editor
      .chain()
      .focus()
      .insertContent({
        type: mode === "inline" ? "mathInline" : "mathBlock",
        attrs: { tex: source },
      })
      .run()
    setTex("")
    setOpen(false)
  }

  const label =
    mode === "inline" ? "Insert inline math" : "Insert display equation"

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className={toolbarButtonClass(false)}
        aria-label={label}
        title={label}
        onClick={() => setOpen(true)}
      >
        <SigmaIcon className="size-4" aria-hidden="true" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80">
        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="rich-math-tex">
              LaTeX{" "}
              <span className="text-xs font-normal text-muted-foreground">
                {mode === "block" ? "(display equation)" : "(inline math)"}
              </span>
            </Label>
            <Textarea
              id="rich-math-tex"
              rows={3}
              value={tex}
              onChange={(event) => setTex(event.target.value)}
              placeholder={"e.g., \\frac{a}{b} = \\sqrt{c}"}
              className="font-mono text-xs"
              autoFocus
            />
            <p className="text-[11px] text-muted-foreground">
              Tip: type{" "}
              <code className="rounded bg-muted px-1 py-0.5 font-mono text-[10px]">
                {mode === "block" ? "$$x^2$$" : "$x^2$"}
              </code>{" "}
              directly in the editor to auto-convert to{" "}
              {mode === "block" ? "a display equation" : "inline math"}.
            </p>
          </div>
          <div className="rounded-lg border bg-muted/40 p-3">
            <p className="mb-1.5 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
              Preview
            </p>
            <div
              className="min-h-8 overflow-x-auto py-0.5"
              dangerouslySetInnerHTML={{
                __html:
                  preview ??
                  '<span class="text-xs text-muted-foreground">Enter LaTeX to see the preview.</span>',
              }}
            />
          </div>
          <div className="flex justify-end">
            <Button
              type="button"
              size="sm"
              disabled={!tex.trim()}
              onClick={insertMath}
            >
              <CheckIcon data-icon="inline-start" aria-hidden="true" />
              Insert
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

function ColorPopover({
  editor,
  type,
}: {
  editor: Editor
  type: "text" | "highlight"
}) {
  const [open, setOpen] = useState(false)
  const colors = type === "text" ? TEXT_COLORS : HIGHLIGHT_COLORS
  const isText = type === "text"
  const activeColor = isText
    ? (editor.getAttributes("textStyle").color as string | undefined)
    : (editor.getAttributes("highlight").color as string | undefined)
  const label = isText ? "Text color" : "Highlight"

  function applyColor(value: string) {
    if (isText) {
      editor.chain().focus().setColor(value).run()
    } else {
      editor.chain().focus().toggleHighlight({ color: value }).run()
    }
    setOpen(false)
  }

  function resetColor() {
    if (isText) {
      editor.chain().focus().unsetColor().run()
    } else {
      editor.chain().focus().unsetHighlight().run()
    }
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className={toolbarButtonClass(Boolean(activeColor))}
        aria-label={label}
        title={label}
        onClick={() => setOpen(true)}
      >
        {isText ? (
          <PaletteIcon className="size-4" aria-hidden="true" />
        ) : (
          <HighlighterIcon className="size-4" aria-hidden="true" />
        )}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-56">
        <div className="grid gap-2">
          <div className="flex flex-wrap gap-1.5">
            {colors.map((color) => (
              <button
                key={color.value}
                type="button"
                className={cn(
                  "size-6 rounded-full border border-black/10 shadow-sm transition-transform hover:scale-110",
                  activeColor === color.value &&
                    "ring-2 ring-foreground ring-offset-2 ring-offset-background"
                )}
                style={{ backgroundColor: color.value }}
                onClick={() => applyColor(color.value)}
                aria-label={color.label}
                title={color.label}
              />
            ))}
          </div>
          <div className="flex justify-end">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={!activeColor}
              onClick={resetColor}
            >
              <XIcon data-icon="inline-start" aria-hidden="true" />
              Remove
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

function TablePopover({
  editor,
  isTable,
}: {
  editor: Editor
  isTable: boolean
}) {
  const [open, setOpen] = useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className={toolbarButtonClass(isTable)}
        aria-label="Table"
        title="Table"
        onClick={() => setOpen(true)}
      >
        <Table2Icon className="size-4" aria-hidden="true" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-60">
        <div className="grid gap-1">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="justify-start"
            onClick={() => {
              editor
                .chain()
                .focus()
                .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
                .run()
              setOpen(false)
            }}
          >
            <Table2Icon data-icon="inline-start" aria-hidden="true" />
            Insert 3 × 3 table
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="justify-start"
            disabled={!editor.can().addColumnAfter()}
            onClick={() => editor.chain().focus().addColumnAfter().run()}
          >
            Add column after
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="justify-start"
            disabled={!editor.can().addRowAfter()}
            onClick={() => editor.chain().focus().addRowAfter().run()}
          >
            Add row after
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="justify-start"
            disabled={!editor.can().deleteColumn()}
            onClick={() => editor.chain().focus().deleteColumn().run()}
          >
            Delete column
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="justify-start"
            disabled={!editor.can().deleteRow()}
            onClick={() => editor.chain().focus().deleteRow().run()}
          >
            Delete row
          </Button>
          <Button
            type="button"
            size="sm"
            variant="destructive"
            className="justify-start"
            disabled={!editor.can().deleteTable()}
            onClick={() => {
              editor.chain().focus().deleteTable().run()
              setOpen(false)
            }}
          >
            Delete table
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}

function HeadingSelect({ editor, level }: { editor: Editor; level: number }) {
  const value = level ? `h${level}` : "p"

  return (
    <Select
      value={value}
      onValueChange={(next) => {
        if (!next || next === "p") {
          editor.chain().focus().setParagraph().run()
        } else {
          const level = Number(next.slice(1)) as 1 | 2 | 3
          editor.chain().focus().toggleHeading({ level }).run()
        }
      }}
    >
      <SelectTrigger
        className="h-11 w-[7.6rem] gap-1 rounded-lg text-xs font-medium sm:h-8"
        aria-label="Block type"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="start">
        <SelectItem value="p">Paragraph</SelectItem>
        <SelectItem value="h1">Heading 1</SelectItem>
        <SelectItem value="h2">Heading 2</SelectItem>
        <SelectItem value="h3">Heading 3</SelectItem>
      </SelectContent>
    </Select>
  )
}

function Toolbar({
  editor,
  workspaceSlug,
  onImageUploadStateChange,
}: {
  editor: Editor
  workspaceSlug?: string
  onImageUploadStateChange?: (busy: boolean) => void
}) {
  const [showAdvanced, setShowAdvanced] = useState(false)
  const state = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      level: e.isActive("heading")
        ? (e.getAttributes("heading").level as number)
        : 0,
      isBold: e.isActive("bold"),
      isItalic: e.isActive("italic"),
      isUnderline: e.isActive("underline"),
      isStrike: e.isActive("strike"),
      isCode: e.isActive("code"),
      isBulletList: e.isActive("bulletList"),
      isOrderedList: e.isActive("orderedList"),
      isTaskList: e.isActive("taskList"),
      isBlockquote: e.isActive("blockquote"),
      isCodeBlock: e.isActive("codeBlock"),
      isLink: e.isActive("link"),
      isTable: e.isActive("table"),
      canUndo: e.can().undo(),
      canRedo: e.can().redo(),
    }),
  })

  return (
    <div
      className="flex h-[41px] min-h-[41px] max-w-full shrink-0 [scrollbar-width:none] flex-nowrap items-center gap-0.5 overflow-x-auto border-b border-border bg-muted/30 px-1.5 py-1 [&::-webkit-scrollbar]:hidden"
      role="toolbar"
      aria-label="Text formatting"
    >
      <ToolbarButton
        title="Undo (Ctrl+Z)"
        disabled={!state?.canUndo}
        onClick={() => editor.chain().focus().undo().run()}
      >
        <Undo2Icon className="size-4" aria-hidden="true" />
      </ToolbarButton>
      <ToolbarButton
        title="Redo (Ctrl+Y)"
        disabled={!state?.canRedo}
        onClick={() => editor.chain().focus().redo().run()}
      >
        <Redo2Icon className="size-4" aria-hidden="true" />
      </ToolbarButton>
      <ToolbarSeparator />

      <HeadingSelect editor={editor} level={state?.level ?? 0} />
      <ToolbarButton
        title="Bold (Ctrl+B)"
        active={state?.isBold}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <BoldIcon className="size-4" aria-hidden="true" />
      </ToolbarButton>
      <ToolbarButton
        title="Italic (Ctrl+I)"
        active={state?.isItalic}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <ItalicIcon className="size-4" aria-hidden="true" />
      </ToolbarButton>
      <ToolbarSeparator />

      <ToolbarButton
        title="Bullet list"
        active={state?.isBulletList}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        <ListIcon className="size-4" aria-hidden="true" />
      </ToolbarButton>
      <ToolbarButton
        title="Numbered list"
        active={state?.isOrderedList}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        <ListOrderedIcon className="size-4" aria-hidden="true" />
      </ToolbarButton>
      <ToolbarSeparator />

      <LinkPopover editor={editor} isLink={Boolean(state?.isLink)} />
      <ImageInsertPopover
        workspaceSlug={workspaceSlug}
        onUploadStateChange={onImageUploadStateChange}
        triggerClassName={toolbarButtonClass(false)}
        onInsert={(image) => {
          if (!editor.isDestroyed) editor.chain().focus().setImage(image).run()
        }}
      />
      <MathPopover editor={editor} mode="inline" />
      <MathPopover editor={editor} mode="block" />
      <ToolbarButton
        title="More formatting"
        active={showAdvanced}
        ariaExpanded={showAdvanced}
        onClick={() => setShowAdvanced((visible) => !visible)}
      >
        <MoreHorizontalIcon className="size-4" aria-hidden="true" />
      </ToolbarButton>

      {showAdvanced ? (
        <>
          <ToolbarSeparator />
          <ToolbarButton
            title="Underline (Ctrl+U)"
            active={state?.isUnderline}
            onClick={() => editor.chain().focus().toggleUnderline().run()}
          >
            <UnderlineIcon className="size-4" aria-hidden="true" />
          </ToolbarButton>
          <ToolbarButton
            title="Strikethrough"
            active={state?.isStrike}
            onClick={() => editor.chain().focus().toggleStrike().run()}
          >
            <StrikethroughIcon className="size-4" aria-hidden="true" />
          </ToolbarButton>
          <ToolbarButton
            title="Inline code"
            active={state?.isCode}
            onClick={() => editor.chain().focus().toggleCode().run()}
          >
            <CodeIcon className="size-4" aria-hidden="true" />
          </ToolbarButton>
          <ToolbarButton
            title="Task list"
            active={state?.isTaskList}
            onClick={() => editor.chain().focus().toggleTaskList().run()}
          >
            <ListChecksIcon className="size-4" aria-hidden="true" />
          </ToolbarButton>
          <ToolbarButton
            title="Blockquote"
            active={state?.isBlockquote}
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
          >
            <QuoteIcon className="size-4" aria-hidden="true" />
          </ToolbarButton>
          <ToolbarButton
            title="Code block"
            active={state?.isCodeBlock}
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          >
            <SquareCodeIcon className="size-4" aria-hidden="true" />
          </ToolbarButton>
          <TablePopover editor={editor} isTable={Boolean(state?.isTable)} />
          <ColorPopover editor={editor} type="text" />
          <ColorPopover editor={editor} type="highlight" />
          <ToolbarButton
            title="Clear formatting"
            onClick={() =>
              editor.chain().focus().unsetAllMarks().clearNodes().run()
            }
          >
            <EraserIcon className="size-4" aria-hidden="true" />
          </ToolbarButton>
        </>
      ) : null}
    </div>
  )
}

export function ToolbarSkeleton() {
  return (
    <div
      className="flex h-[41px] min-h-[41px] max-w-full shrink-0 items-center gap-0.5 border-b border-border bg-muted/30 px-1.5 py-1"
      aria-hidden="true"
    >
      <div className="flex items-center gap-1 opacity-50">
        <div className="size-8 animate-pulse rounded-lg bg-muted" />
        <div className="size-8 animate-pulse rounded-lg bg-muted" />
        <span className="mx-0.5 h-5 w-px bg-border" />
        <div className="h-8 w-[7.6rem] animate-pulse rounded-lg bg-muted" />
        <div className="size-8 animate-pulse rounded-lg bg-muted" />
        <div className="size-8 animate-pulse rounded-lg bg-muted" />
        <span className="mx-0.5 h-5 w-px bg-border" />
        <div className="size-8 animate-pulse rounded-lg bg-muted" />
        <div className="size-8 animate-pulse rounded-lg bg-muted" />
      </div>
    </div>
  )
}

export function RichTextEditorSkeleton({
  minHeight = "140px",
  className,
}: {
  minHeight?: string
  className?: string
}) {
  return (
    <div
      className={cn(
        "rich-text-editor relative flex flex-col overflow-hidden rounded-xl border border-input bg-background [&_.katex]:text-[1.5rem]!",
        className
      )}
      style={{ minHeight }}
    >
      <ToolbarSkeleton />
      <div className="min-h-[99px] flex-1 bg-muted/5 p-3" />
    </div>
  )
}

function BubbleMenuContent({ editor }: { editor: Editor }) {
  const state = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      isBold: e.isActive("bold"),
      isItalic: e.isActive("italic"),
      isStrike: e.isActive("strike"),
      isHighlight: e.isActive("highlight"),
      isLink: e.isActive("link"),
    }),
  })

  return (
    <div className="flex items-center gap-0.5 rounded-xl border border-border bg-popover/95 p-1 shadow-lg backdrop-blur">
      <ToolbarButton
        title="Bold"
        active={state?.isBold}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <BoldIcon className="size-4" aria-hidden="true" />
      </ToolbarButton>
      <ToolbarButton
        title="Italic"
        active={state?.isItalic}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <ItalicIcon className="size-4" aria-hidden="true" />
      </ToolbarButton>
      <ToolbarButton
        title="Strikethrough"
        active={state?.isStrike}
        onClick={() => editor.chain().focus().toggleStrike().run()}
      >
        <StrikethroughIcon className="size-4" aria-hidden="true" />
      </ToolbarButton>
      <ToolbarButton
        title="Highlight"
        active={Boolean(state?.isHighlight)}
        onClick={() => editor.chain().focus().toggleHighlight().run()}
      >
        <HighlighterIcon className="size-4" aria-hidden="true" />
      </ToolbarButton>
      {state?.isLink ? (
        <ToolbarButton
          title="Remove link"
          onClick={() => editor.chain().focus().unsetLink().run()}
        >
          <UnlinkIcon className="size-4" aria-hidden="true" />
        </ToolbarButton>
      ) : null}
    </div>
  )
}

function parseCssLengthToPx(val?: string, fallback = 140): number {
  if (!val) return fallback
  const num = parseFloat(val)
  if (isNaN(num)) return fallback
  if (val.endsWith("rem") || val.endsWith("em")) return num * 16
  return num
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = "Type your content…",
  minHeight,
  maxHeight,
  resizable = true,
  className,
  id,
  ariaLabelledBy,
  invalid,
  showMathHint = false,
  workspaceSlug,
  onImageUploadStateChange,
}: {
  value: string
  onChange: (html: string) => void
  placeholder?: string
  /** CSS length, e.g. "3.5rem" for compact option editors. */
  minHeight?: string
  /** Maximum CSS height when resizing (default: 800px). */
  maxHeight?: string
  /** Whether the bottom-right corner shows a draggable resize grip like a textarea. Default true. */
  resizable?: boolean
  className?: string
  id?: string
  ariaLabelledBy?: string
  invalid?: boolean
  showMathHint?: boolean
  workspaceSlug?: string
  onImageUploadStateChange?: (busy: boolean) => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [customHeight, setCustomHeight] = useState<number | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const onChangeRef = useRef(onChange)
  const lastEmittedRef = useRef(value)

  // Keep the editor's onUpdate closure pointing at the latest onChange prop
  // without touching the ref during render.
  useEffect(() => {
    onChangeRef.current = onChange
  })

  // Pointer drag resizing logic
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()

    const startY = e.clientY
    const startHeight =
      containerRef.current?.getBoundingClientRect().height ??
      parseCssLengthToPx(minHeight, 140)

    const prevUserSelect = document.body.style.userSelect
    const prevCursor = document.body.style.cursor

    document.body.style.userSelect = "none"
    document.body.style.cursor = "se-resize"
    setIsDragging(true)

    const minH = parseCssLengthToPx(minHeight, 120)
    const maxH = parseCssLengthToPx(maxHeight, 800)

    const onPointerMove = (moveEvent: PointerEvent) => {
      const deltaY = moveEvent.clientY - startY
      const newHeight = Math.max(
        minH,
        Math.min(maxH, Math.round(startHeight + deltaY))
      )
      setCustomHeight(newHeight)
    }

    const onPointerUp = () => {
      document.body.style.userSelect = prevUserSelect
      document.body.style.cursor = prevCursor
      setIsDragging(false)
      window.removeEventListener("pointermove", onPointerMove)
      window.removeEventListener("pointerup", onPointerUp)
    }

    window.addEventListener("pointermove", onPointerMove)
    window.addEventListener("pointerup", onPointerUp)
  }

  const editor = useEditor(
    {
      immediatelyRender: false,
      extensions: [
        StarterKit.configure({
          heading: { levels: [1, 2, 3] },
          link: false,
          underline: false,
        }),
        Link.configure({
          openOnClick: false,
          autolink: true,
          linkOnPaste: true,
          HTMLAttributes: {
            rel: "noopener noreferrer nofollow",
            target: "_blank",
          },
        }),
        Underline,
        TextStyle,
        Color,
        Highlight.configure({ multicolor: true }),
        Image.configure({ allowBase64: false }),
        Table.configure({ resizable: true, allowTableNodeSelection: true }),
        TableRow,
        TableHeader,
        TableCell,
        TaskList,
        TaskItem.configure({ nested: true }),
        Placeholder.configure({ placeholder }),
        MathInline,
        MathBlock,
        MathPaste,
      ],
      content: value,
      editorProps: {
        attributes: {
          spellcheck: "true",
        },
      },
      onUpdate: ({ editor: instance }) => {
        const html = instance.getHTML()
        lastEmittedRef.current = html
        onChangeRef.current(html)
      },
    },
    [placeholder]
  )

  // Sync external value changes (e.g. form reset) without echoing updates.
  useEffect(() => {
    if (!editor) return
    if (value === lastEmittedRef.current) return
    lastEmittedRef.current = value
    editor.commands.setContent(value || "", { emitUpdate: false })
  }, [value, editor])

  return (
    <div className={cn("grid gap-1.5", className)}>
      <div
        ref={containerRef}
        id={id}
        className={cn(
          "rich-text-editor relative flex flex-col overflow-hidden rounded-xl border bg-background transition-[border-color,box-shadow] focus-within:ring-2 focus-within:ring-ring/25 [&_.katex]:text-[1.5rem]!",
          invalid
            ? "border-destructive"
            : "border-input focus-within:border-foreground/40"
        )}
        style={
          {
            "--rich-editor-min-height": minHeight,
            height: customHeight ? `${customHeight}px` : undefined,
            minHeight: minHeight ?? "140px",
            maxHeight: maxHeight ?? "800px",
          } as CSSProperties
        }
      >
        {editor ? (
          <Toolbar
            editor={editor}
            workspaceSlug={workspaceSlug}
            onImageUploadStateChange={onImageUploadStateChange}
          />
        ) : (
          <ToolbarSkeleton />
        )}
        {showMathHint ? (
          <div className="flex min-h-[29px] shrink-0 flex-wrap items-center gap-1 border-b border-border/70 bg-muted/15 px-3 py-1.5 text-[11px] text-muted-foreground">
            <SigmaIcon
              className="size-3.5 text-foreground"
              aria-hidden="true"
            />
            <span>Math shortcuts:</span>
            <code className="rounded bg-muted px-1 py-0.5 font-mono">
              $x^2$
            </code>
            <span>inline</span>
            <span className="text-muted-foreground/50">/</span>
            <code className="rounded bg-muted px-1 py-0.5 font-mono">
              $$x^2$$
            </code>
            <span>display</span>
          </div>
        ) : null}
        {editor ? (
          <BubbleMenu
            editor={editor}
            shouldShow={({ state }) => !state.selection.empty}
          >
            <BubbleMenuContent editor={editor} />
          </BubbleMenu>
        ) : null}
        <EditorContent
          editor={editor}
          className="min-h-0 flex-1 overflow-y-auto"
          aria-labelledby={ariaLabelledBy}
          aria-invalid={invalid || undefined}
        />
        {resizable ? (
          <div
            onPointerDown={handlePointerDown}
            onDoubleClick={() => setCustomHeight(null)}
            role="separator"
            aria-orientation="horizontal"
            title="Drag corner to resize height (double-click to reset)"
            className={cn(
              "group absolute right-0 bottom-0 z-10 flex size-6 cursor-se-resize touch-none items-end justify-end p-1 select-none",
              isDragging
                ? "opacity-100"
                : "opacity-40 transition-opacity hover:opacity-100"
            )}
            aria-hidden="true"
          >
            <svg
              className="size-3 text-muted-foreground transition-colors group-hover:text-foreground"
              viewBox="0 0 12 12"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            >
              <path d="M10.5 3.5L3.5 10.5M10.5 6.5L6.5 10.5M10.5 9.5L9.5 10.5" />
            </svg>
          </div>
        ) : null}
      </div>
    </div>
  )
}
