"use client"

import { type FormEvent, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { SearchIcon } from "lucide-react"

import { buttonVariants } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty"
import { Input } from "@/components/ui/input"
import { Kbd, KbdGroup } from "@/components/ui/kbd"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  NAVBAR_DESTINATIONS,
  type NavbarDestination,
  type NavbarDestinationKey,
} from "./navbar-data"

type NavbarSearchProps = {
  onSelect: (destination: NavbarDestinationKey) => void
}

export function NavbarSearch({ onSelect }: NavbarSearchProps) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState("")
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const toggleSearch = (event: globalThis.KeyboardEvent) => {
      const usesSearchShortcut =
        (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k"

      if (!usesSearchShortcut) return

      event.preventDefault()
      setOpen((current) => {
        if (current) setQuery("")
        return !current
      })
    }

    window.addEventListener("keydown", toggleSearch)
    return () => window.removeEventListener("keydown", toggleSearch)
  }, [])

  useEffect(() => {
    if (!open) return

    const frame = window.requestAnimationFrame(() => inputRef.current?.focus())
    return () => window.cancelAnimationFrame(frame)
  }, [open])

  const results = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) return NAVBAR_DESTINATIONS

    return NAVBAR_DESTINATIONS.filter((item) =>
      `${item.label} ${item.description} ${item.keywords}`
        .toLowerCase()
        .includes(normalized)
    )
  }, [query])

  function setSearchOpen(nextOpen: boolean) {
    setOpen(nextOpen)
    if (!nextOpen) setQuery("")
  }

  function choose(destination: NavbarDestination) {
    onSelect(destination.key)
    setSearchOpen(false)
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const firstResult = results[0]

    if (firstResult) {
      choose(firstResult)
      router.push(firstResult.href)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setSearchOpen}>
      <Tooltip>
        <TooltipTrigger
          render={
            <DialogTrigger
              aria-label="Search Character Arc"
              className={buttonVariants({ variant: "ghost", size: "icon" })}
            />
          }
        >
          <SearchIcon aria-hidden="true" />
        </TooltipTrigger>
        <TooltipContent side="bottom">
          Search
          <KbdGroup>
            <Kbd>Ctrl</Kbd>
            <span aria-hidden="true">+</span>
            <Kbd>K</Kbd>
          </KbdGroup>
        </TooltipContent>
      </Tooltip>

      <DialogContent showCloseButton={false} className="gap-3 p-4 sm:max-w-xl">
        <DialogHeader className="sr-only">
          <DialogTitle>Search Character Arc</DialogTitle>
          <DialogDescription>
            Find a destination in your workspace.
          </DialogDescription>
        </DialogHeader>

        <form role="search" onSubmit={submit}>
          <div className="flex items-center gap-2">
            <SearchIcon
              className="size-4 shrink-0 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              ref={inputRef}
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search destinations..."
              aria-label="Search destinations"
              spellCheck={false}
              className="h-11 flex-1"
            />
            <Kbd>Esc</Kbd>
          </div>
        </form>

        {results.length ? (
          <div className="flex max-h-72 flex-col gap-1 overflow-y-auto">
            {results.map((item) => {
              const Icon = item.icon

              return (
                <Link
                  key={item.key}
                  href={item.href}
                  onClick={() => choose(item)}
                  className="flex min-h-11 items-center gap-3 rounded-lg px-2.5 py-2 text-muted-foreground transition-colors outline-none hover:bg-accent hover:text-foreground focus-visible:bg-accent focus-visible:text-foreground"
                >
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted">
                    <Icon className="size-4" aria-hidden="true" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-medium">
                      {item.label}
                    </span>
                    <span className="block truncate text-xs">
                      {item.description}
                    </span>
                  </span>
                </Link>
              )
            })}
          </div>
        ) : (
          <Empty className="p-6">
            <EmptyHeader>
              <EmptyTitle>No matching destination</EmptyTitle>
              <EmptyDescription>
                Try searching for Today, Workspace, or Tools.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
      </DialogContent>
    </Dialog>
  )
}
