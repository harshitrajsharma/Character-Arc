import type { Metadata } from "next"
import Link from "next/link"
import {
  WrenchIcon,
  CompassIcon,
  ArrowRightIcon,
  BlocksIcon,
  PlusIcon,
} from "lucide-react"

import { requireVerifiedClaims } from "@/lib/auth/session"
import { prisma } from "@/lib/prisma"
import { workspaceRoutes } from "@/lib/routes/workspace-tools"
import { mapToolIcon } from "@/components/tools/tool-catalog-card"
import { getDashboardData } from "@/lib/dashboard/current-arcs"
import { DashboardHero } from "@/components/dashboard/dashboard-hero"
import { DashboardMetrics } from "@/components/dashboard/dashboard-metrics"
import { DashboardQuickActions } from "@/components/dashboard/dashboard-quick-actions"
import { CurrentArcGrid } from "@/components/dashboard/current-arc-grid"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Character Arc Daily Progress & Momentum Cockpit",
}

function getFirstName(displayName: string | null | undefined, email: unknown) {
  if (displayName?.trim()) {
    return displayName.trim().split(" ")[0]
  }
  return typeof email === "string" ? email.split("@")[0] : "Friend"
}

export default async function DashboardPage() {
  const claims = await requireVerifiedClaims()

  const [profile, membership] = await Promise.all([
    prisma.profile.findUnique({
      where: { id: claims.sub },
      select: {
        displayName: true,
        avatarUrl: true,
        timezone: true,
        locale: true,
      },
    }),
    prisma.workspaceMember.findFirst({
      where: { userId: claims.sub },
      select: { workspaceId: true, role: true },
    }),
  ])

  const [workspace, mcpTokenCount] = await Promise.all([
    membership
      ? prisma.workspace.findUnique({
          where: { id: membership.workspaceId },
          select: {
            id: true,
            name: true,
            slug: true,
            kind: true,
            createdAt: true,
            toolInstallations: {
              where: {
                status: "ACTIVE",
              },
              select: {
                id: true,
                toolDefinition: {
                  select: {
                    key: true,
                    name: true,
                    description: true,
                    icon: true,
                  },
                },
              },
            },
          },
        })
      : null,
    membership
      ? prisma.mcpToken
          .count({
            where: { workspaceId: membership.workspaceId, revokedAt: null },
          })
          .catch(() => 0)
      : Promise.resolve(0),
  ])

  const userName = getFirstName(profile?.displayName, claims.email)

  if (!workspace) {
    return (
      <main className="mx-auto w-full max-w-6xl px-4 sm:px-6 xl:px-10 pt-20 pb-16 space-y-8">
        <section
          aria-labelledby="onboarding-title"
          className="rounded-3xl border border-dashed border-border/60 bg-muted/10 p-8 text-center sm:p-12"
        >
          <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <BlocksIcon className="size-6" aria-hidden="true" />
          </span>
          <h1
            id="onboarding-title"
            className="mt-4 text-xl font-bold tracking-tight text-foreground sm:text-2xl"
          >
            Create your first workspace
          </h1>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
            Your workspace is where goals, exams, and AI agent memory live.
            Install a tool from the catalog to get started.
          </p>
          <div className="mt-6 flex justify-center gap-2">
            <Button render={<Link href="/tools" />}>
              <PlusIcon className="size-4" aria-hidden="true" />
              <span>Explore the tool catalog</span>
            </Button>
          </div>
        </section>
      </main>
    )
  }

  const workspaceSlug = workspace.slug
  const workspaceName = workspace.name
  const workspaceKind = workspace.kind

  const { items, metrics } = await getDashboardData({
    workspaceId: workspace.id,
    workspaceSlug: workspace.slug,
    installations: workspace.toolInstallations,
  })

  return (
    <main className="mx-auto w-full max-w-6xl px-4 sm:px-6 xl:px-10 pt-20 pb-16 space-y-8">
      {/* 1. Atmospheric Day Pulse Hero */}
      <DashboardHero
        userName={userName}
        workspaceName={workspaceName}
        workspaceKind={workspaceKind}
        timezone={profile?.timezone}
      />

      {/* 2. Momentum & Key Pulse Metrics (4 Cards) */}
      <DashboardMetrics
        metrics={metrics}
        workspaceSlug={workspaceSlug}
        mcpConnected={mcpTokenCount > 0}
      />

      {/* 3. Quick Action Command Bar */}
      <DashboardQuickActions workspaceSlug={workspaceSlug} />

      {/* 4. Active Focus & Arcs (Unified Feed) */}
      <section aria-labelledby="focus-arcs-title" className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Current Momentum
            </p>
            <h2 id="focus-arcs-title" className="text-xl font-bold tracking-tight text-foreground">
              Today&apos;s Focus &amp; Active Arcs
            </h2>
          </div>
          {items.length > 0 && (
            <Link
              href={`/workspace/${encodeURIComponent(workspaceSlug)}`}
              className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1"
            >
              All workspace items <ArrowRightIcon className="size-3" />
            </Link>
          )}
        </div>

        <CurrentArcGrid items={items} workspaceSlug={workspaceSlug} />
      </section>

      {/* 5. Installed Contexts & Tools Ecosystem */}
      <section aria-labelledby="tools-ecosystem-title" className="space-y-4 pt-2">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Capabilities
            </p>
            <h2 id="tools-ecosystem-title" className="text-xl font-bold tracking-tight text-foreground">
              Installed Tools &amp; Contexts
            </h2>
          </div>
          <Button
            size="sm"
            variant="ghost"
            className="text-xs rounded-full gap-1"
            render={<Link href="/tools" />}
          >
            <PlusIcon className="size-3.5" />
            <span>Explore Catalog</span>
          </Button>
        </div>

        {workspace.toolInstallations.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {workspace.toolInstallations.map((inst) => {
              const def = inst.toolDefinition
              const Icon = mapToolIcon(def.icon) || WrenchIcon
              const toolHome = workspaceRoutes.toolHome(workspace.slug, def.key) || "#"

              return (
                <Link
                  key={inst.id}
                  href={toolHome}
                  className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-border/60 bg-muted/15 p-5 transition-all duration-200 hover:border-primary/40 hover:bg-muted/25 hover:shadow-xs"
                >
                  <div className="flex items-start gap-3.5">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-transform group-hover:scale-105">
                      <Icon className="size-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-heading text-sm font-bold text-foreground truncate">
                          {def.name}
                        </h3>
                        <Badge variant="outline" className="text-[10px] rounded-full px-2 py-0 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 font-normal">
                          Active
                        </Badge>
                      </div>
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground leading-relaxed">
                        {def.description}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-border/30 flex items-center justify-between text-xs text-muted-foreground">
                    <span className="font-mono text-[11px]">Installed Context</span>
                    <span className="font-semibold text-primary inline-flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                      Launch <ArrowRightIcon className="size-3" />
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-border/60 bg-muted/10 p-8 text-center">
            <CompassIcon className="size-6 mx-auto mb-2 text-muted-foreground opacity-50" />
            <p className="text-xs text-muted-foreground">
              No tools installed yet. Visit the catalog to add Exam Prep, Goals, or Mock Tests.
            </p>
          </div>
        )}
      </section>
    </main>
  )
}
