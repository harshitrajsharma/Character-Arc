import { cn } from "@/lib/utils"
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
