"use client"

import type { ComponentProps, ComponentType, ReactNode } from "react"
import { DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export function SettingsDialogContent({
  className,
  ...props
}: ComponentProps<typeof DialogContent>) {
  return (
    <DialogContent
      {...props}
      className={cn(
        "flex h-[min(700px,calc(100dvh-2rem))] w-[calc(100vw-1.5rem)] max-w-4xl flex-col gap-0 overflow-hidden rounded-4xl bg-popover/60 p-0 shadow-2xl ring-1 ring-foreground/5 backdrop-blur-2xl sm:max-w-4xl dark:ring-foreground/10",
        className
      )}
    />
  )
}

export function SettingsHeader({
  title,
  context,
  icon: Icon,
}: {
  title: string
  context: string
  icon: ComponentType<{ className?: string }>
}) {
  return (
    <div className="flex h-14 shrink-0 items-center border-b border-border/60 bg-muted/20 px-5 sm:px-6">
      <div className="flex min-w-0 items-center gap-3 pr-8">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-xs">
          <Icon className="size-4" />
        </span>
        <DialogTitle className="truncate font-heading text-sm font-semibold sm:text-base">
          {title}
        </DialogTitle>
        <span
          aria-hidden="true"
          className="hidden text-muted-foreground sm:inline"
        >
          /
        </span>
        <span className="hidden max-w-48 truncate text-xs text-muted-foreground sm:inline">
          {context}
        </span>
      </div>
    </div>
  )
}

export type SettingsNavigationGroup<K extends string> = {
  group: string
  items: {
    key: K
    label: string
    icon: ComponentType<{ className?: string }>
    badge?: string | number
  }[]
}

export function SettingsNavigation<K extends string>({
  groups,
  active,
  onChange,
}: {
  groups: SettingsNavigationGroup<K>[]
  active: K
  onChange: (key: K) => void
}) {
  return (
    <aside className="flex w-full min-w-0 shrink-0 flex-col overflow-x-auto border-b border-border/60 bg-muted/15 p-3 md:w-56 md:justify-between md:overflow-x-hidden md:overflow-y-auto md:border-r md:border-b-0 md:p-3.5">
      <nav
        aria-label="Settings sections"
        className="flex w-max min-w-full gap-4 md:w-full md:min-w-0 md:flex-col"
      >
        {groups.map((group) => (
          <div key={group.group} className="flex flex-col gap-1">
            <p className="hidden px-2.5 text-[11px] font-semibold text-muted-foreground uppercase md:block">
              {group.group}
            </p>
            <div className="flex gap-1 md:flex-col">
              {group.items.map((item) => {
                const Icon = item.icon,
                  selected = active === item.key
                return (
                  <button
                    key={item.key}
                    type="button"
                    aria-current={selected ? "true" : undefined}
                    onClick={() => onChange(item.key)}
                    className={cn(
                      "flex min-h-11 items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-xs font-medium whitespace-nowrap transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      selected
                        ? "bg-background font-semibold text-foreground shadow-xs ring-1 ring-border/60"
                        : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                    )}
                  >
                    <span className="flex items-center gap-2.5">
                      <Icon className="size-4 shrink-0" />
                      <span>{item.label}</span>
                    </span>
                    {item.badge !== undefined ? (
                      <Badge variant={selected ? "default" : "secondary"}>
                        {item.badge}
                      </Badge>
                    ) : null}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </nav>
      <p className="mt-3 hidden border-t border-border/40 px-2 pt-3 text-[11px] text-muted-foreground md:block">
        <kbd>Esc</kbd> to close
      </p>
    </aside>
  )
}

export function SettingsBody({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden md:flex-row">
      {children}
    </div>
  )
}

export function SettingsPanel({ children }: { children: ReactNode }) {
  return (
    <div className="min-w-0 flex-1 overflow-y-auto p-4 sm:p-6 md:p-8">
      {children}
    </div>
  )
}

export function SettingsFooter({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex min-h-14 shrink-0 items-center justify-between border-t border-border/60 bg-muted/10 px-4 py-2 sm:px-6 [&_button]:min-h-11",
        className
      )}
    >
      {children}
    </div>
  )
}
