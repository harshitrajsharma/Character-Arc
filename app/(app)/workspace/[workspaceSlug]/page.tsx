import Link from "next/link"
import { BlocksIcon, WrenchIcon, ArrowRightIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { workspaceRoutes } from "@/lib/routes/workspace-tools"
import {
  getAuthorizedActiveToolInstallations,
  getWorkspaceIdentity,
} from "@/lib/workspaces/workspace-access"
import { mapToolIcon } from "@/components/tools/tool-catalog-card"
import { getCurrentArcItems } from "@/lib/dashboard/current-arcs"
import { CurrentArcGrid } from "@/components/dashboard/current-arc-grid"

export default async function WorkspaceHome({
  params,
}: {
  params: Promise<{ workspaceSlug: string }>
}) {
  const { workspaceSlug } = await params
  const workspace = await getWorkspaceIdentity(workspaceSlug)
  const installations =
    await getAuthorizedActiveToolInstallations(workspaceSlug)
  const currentArcs = await getCurrentArcItems({
    workspaceId: workspace.id,
    workspaceSlug,
    installations,
  })

  return (
    <main className="max-w-6xl mx-auto px-4 md:px-6 xl:px-12 pt-24 pb-8 sm:pb-10">
      <div className="mb-8 flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-semibold tracking-tight lg:text-4xl">
            {workspace.name}
          </h1>
          <Badge variant="outline" className="capitalize">
            {workspace.kind.toLowerCase()} workspace
          </Badge>
        </div>
        <p className="text-lg text-muted-foreground">
          Your private workspace context.
        </p>
      </div>

      {currentArcs.length > 0 ? (
        <section aria-labelledby="recent-work-title" className="mb-10">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Keep moving
              </p>
              <h2
                id="recent-work-title"
                className="mt-1 font-heading text-xl font-semibold"
              >
                Recent work
              </h2>
            </div>
          </div>
          <CurrentArcGrid items={currentArcs.slice(0, 3)} workspaceSlug={workspaceSlug} />
        </section>
      ) : null}

      {installations.length === 0 ? (
        <Empty className="mt-8">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <BlocksIcon aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle>No tools installed</EmptyTitle>
            <EmptyDescription>
              Install tools to start working in this workspace.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button render={<Link href="/tools" />} className="min-h-[44px]">
              Browse Catalog
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {installations.map((inst) => {
            const def = inst.toolDefinition
            const Icon = mapToolIcon(def.icon) || WrenchIcon
            const toolHome = workspaceRoutes.toolHome(workspaceSlug, def.key)
            if (toolHome) {
              return (
                <Link
                  key={inst.id}
                  href={toolHome}
                  className="group flex cursor-pointer flex-col gap-2 rounded-xl border bg-card p-6 shadow-sm transition-all hover:border-brand-neon-line hover:shadow-md"
                >
                  <div className="flex items-center gap-3">
                    <div className="group-hover:bg-brand-neon-bg flex size-10 items-center justify-center rounded-lg bg-muted text-muted-foreground group-hover:text-brand-neon-line">
                      <Icon className="size-5" aria-hidden="true" />
                    </div>
                    <h3 className="font-medium text-foreground">{def.name}</h3>
                  </div>
                  {def.description && (
                    <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                      {def.description}
                    </p>
                  )}
                  <div className="mt-4 flex items-center text-sm font-medium text-foreground">
                    Open Tool{" "}
                    <ArrowRightIcon
                      className="ml-1 size-3.5"
                      aria-hidden="true"
                    />
                  </div>
                </Link>
              )
            }

            return (
              <div
                key={inst.id}
                className="group flex flex-col gap-2 rounded-xl border bg-card p-6 shadow-sm transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="group-hover:bg-brand-neon-bg flex size-10 items-center justify-center rounded-lg bg-muted text-muted-foreground group-hover:text-brand-neon-line">
                    <Icon className="size-5" aria-hidden="true" />
                  </div>
                  <h3 className="font-medium text-foreground">{def.name}</h3>
                </div>
                {def.description && (
                  <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                    {def.description}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      )}
    </main>
  )
}
