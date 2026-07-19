import Link from "next/link"
import { BlocksIcon, WrenchIcon, ArrowRightIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
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

export default async function WorkspaceHome({
  params,
}: {
  params: Promise<{ workspaceSlug: string }>
}) {
  const { workspaceSlug } = await params
  const workspace = await getWorkspaceIdentity(workspaceSlug)
  const installations = await getAuthorizedActiveToolInstallations(workspaceSlug)

  return (
    <main className="container mx-auto py-8 lg:py-12 px-4 md:px-8">
      <div className="mb-8 flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight lg:text-4xl">
          {workspace.name}
        </h1>
        <p className="text-muted-foreground text-lg">
          Your private workspace context.
        </p>
      </div>

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
            const toolHome = workspaceRoutes.toolHome(workspaceSlug, def.key)
            if (toolHome) {
              return (
                <Link
                  key={inst.id}
                  href={toolHome}
                  className="group flex flex-col gap-2 rounded-xl border bg-card p-6 shadow-sm transition-all hover:border-brand-neon-line hover:shadow-md cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-lg bg-muted text-muted-foreground group-hover:bg-brand-neon-bg group-hover:text-brand-neon-line">
                      <WrenchIcon className="size-5" aria-hidden="true" />
                    </div>
                    <h3 className="font-medium text-foreground">{def.name}</h3>
                  </div>
                  {def.description && (
                    <p className="line-clamp-2 text-sm text-muted-foreground mt-2">
                      {def.description}
                    </p>
                  )}
                  <div className="mt-4 flex items-center text-sm font-medium text-foreground">
                    Open Tool <ArrowRightIcon className="ml-1 size-3.5" aria-hidden="true" />
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
                  <div className="flex size-10 items-center justify-center rounded-lg bg-muted text-muted-foreground group-hover:bg-brand-neon-bg group-hover:text-brand-neon-line">
                    <WrenchIcon className="size-5" aria-hidden="true" />
                  </div>
                  <h3 className="font-medium text-foreground">{def.name}</h3>
                </div>
                {def.description && (
                  <p className="line-clamp-2 text-sm text-muted-foreground mt-2">
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
