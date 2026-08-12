import type { Metadata } from "next"
import Link from "next/link"
import { CircleAlertIcon, SearchIcon, WrenchIcon } from "lucide-react"

import { ToolCatalogCard } from "@/components/tools/tool-catalog-card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Input } from "@/components/ui/input"
import { getToolCatalog } from "@/lib/tools/catalog"
import { cn } from "@/lib/utils"

export const metadata: Metadata = { title: "Tools" }

type ToolsPageProps = {
  searchParams: Promise<{ q?: string; view?: string }>
}

export default async function ToolsPage({ searchParams }: ToolsPageProps) {
  const [params, catalog] = await Promise.all([searchParams, getToolCatalog()])
  const query = params.q?.trim() ?? ""
  const view = params.view === "installed" ? "installed" : "all"
  const installedCount = catalog.items.filter(
    (item) => item.installationStatus === "active"
  ).length
  const normalizedQuery = query.toLowerCase()
  const visibleItems = catalog.items.filter((item) => {
    const matchesView = view === "all" || item.installationStatus === "active"
    const matchesQuery =
      !normalizedQuery ||
      `${item.name} ${item.description} ${item.category} ${item.blockTypeNames.join(" ")}`
        .toLowerCase()
        .includes(normalizedQuery)

    return matchesView && matchesQuery
  })

  return (
    <main className="mx-auto w-full max-w-6xl px-4 md:px-6 xl:px-12 pt-24 pb-8 sm:pb-10">
      <header className="flex flex-col gap-5 border-b pb-7 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl">
          <p className="mb-2 text-sm font-medium text-muted-foreground">
            Your systems
          </p>
          <h1 className="font-heading text-3xl font-semibold tracking-normal">
            Tools
          </h1>
          <p className="mt-3 text-base leading-7 text-muted-foreground">
            Choose the focused systems that belong in your current chapter.
          </p>
        </div>
        <Badge variant="outline" className="w-fit">
          {installedCount} installed
        </Badge>
      </header>

      {catalog.issue ? (
        <Alert variant="destructive" className="mt-6">
          <CircleAlertIcon aria-hidden="true" />
          <AlertTitle>
            {catalog.issue === "workspace_unavailable"
              ? "Your workspace is not ready"
              : "The tool catalog is temporarily unavailable"}
          </AlertTitle>
          <AlertDescription>
            Your existing workspace data is safe. Try again after the latest
            database setup has completed.
          </AlertDescription>
        </Alert>
      ) : null}

      <section aria-label="Tool catalog" className="mt-7">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="inline-flex w-fit rounded-full bg-muted p-1">
            <Link
              href={query ? `/tools?q=${encodeURIComponent(query)}` : "/tools"}
              className={cn(
                "rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
                view === "all"
                  ? "bg-background text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
              aria-current={view === "all" ? "page" : undefined}
            >
              All
            </Link>
            <Link
              href={
                query
                  ? `/tools?view=installed&q=${encodeURIComponent(query)}`
                  : "/tools?view=installed"
              }
              className={cn(
                "rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
                view === "installed"
                  ? "bg-background text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
              aria-current={view === "installed" ? "page" : undefined}
            >
              Installed
            </Link>
          </div>

          <form
            action="/tools"
            role="search"
            className="flex w-full gap-2 sm:max-w-sm"
          >
            {view === "installed" ? (
              <input type="hidden" name="view" value="installed" />
            ) : null}
            <div className="relative min-w-0 flex-1">
              <SearchIcon
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                type="search"
                name="q"
                defaultValue={query}
                placeholder="Search tools"
                aria-label="Search tools"
                className="h-11 pl-9 sm:h-9"
              />
            </div>
            <Button type="submit" variant="secondary" className="h-11 sm:h-9">
              Search
            </Button>
          </form>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {catalog.workspace && visibleItems.length ? (
            visibleItems.map((item) => (
              <ToolCatalogCard
                key={item.key}
                item={item}
                workspaceId={catalog.workspace!.id}
                workspaceSlug={catalog.workspace!.slug}
              />
            ))
          ) : catalog.issue ? null : (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <WrenchIcon aria-hidden="true" />
                </EmptyMedia>
                <EmptyTitle>No tools found</EmptyTitle>
                <EmptyDescription>
                  {view === "installed"
                    ? "Install a tool to make it part of this workspace."
                    : "Try a different name or category."}
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Link
                  href="/tools"
                  className={buttonVariants({ variant: "secondary" })}
                >
                  View all tools
                </Link>
              </EmptyContent>
            </Empty>
          )}
        </div>
      </section>
    </main>
  )
}
