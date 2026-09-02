import { createIdempotencyKey } from "@/lib/forms/idempotency-key"
import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"

import { ArcCheckInForm } from "@/components/tools/goals-paths/arc-check-in-form"
import { ArcDetailActions } from "@/components/tools/goals-paths/arc-detail-actions"
import { ArcDetailHeader } from "@/components/tools/goals-paths/arc-detail-header"
import { ArcMobileCheckIn } from "@/components/tools/goals-paths/arc-mobile-check-in"
import { ArcProgressPanel } from "@/components/tools/goals-paths/arc-progress-panel"
import { ArcRouteNarrative } from "@/components/tools/goals-paths/arc-route-narrative"
import { buttonVariants } from "@/components/ui/button"
import { getArcDetail } from "@/lib/tools/definitions/goals-paths/repository"
import { SetNavbarBreadcrumbs } from "@/components/navigation/breadcrumb-context"
import { workspaceRoutes } from "@/lib/routes/workspace-tools"

export const metadata: Metadata = { title: "Arc" }

type ArcDetailPageProps = {
  params: Promise<{ workspaceSlug: string; arcId: string }>
}

export default async function ArcDetailPage({ params }: ArcDetailPageProps) {
  const { workspaceSlug, arcId } = await params
  const { arc, workspace, item, issue } = await getArcDetail(
    workspaceSlug,
    arcId
  )

  if (issue === "not_found") {
    notFound()
  }

  if (issue || !workspace) {
    throw new Error("Arc data is temporarily unavailable")
  }

  if (!arc) {
    notFound()
  }

  const checkIns = arc.evidence.map((entry) => ({
    id: entry.id,
    note: entry.note,
    progressPercent: entry.progressPercent,
    createdAt: entry.occurredAt,
  }))

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pt-20 pb-12 sm:pt-24 md:px-6 xl:px-10">
      <SetNavbarBreadcrumbs
        segments={[
          { label: "Workspace", href: `/workspace/${encodeURIComponent(workspaceSlug)}` },
          { label: "Goals & Paths", href: workspaceRoutes.goalsPaths.home(workspaceSlug) },
          { label: arc.title },
        ]}
        backHref={workspaceRoutes.goalsPaths.home(workspaceSlug)}
        backLabel="Back to Goals & Paths"
      />

      <ArcDetailHeader
        workspaceSlug={workspaceSlug}
        title={arc.title}
        summary={arc.summary}
        status={arc.lifecycleStatus}
        createdAt={arc.createdAt}
        targetDate={arc.targetDate}
        isPrivate={arc.visibility === "private"}
        allowAgentAccess={arc.allowAgentAccess}
        actions={
          item?.installationId ? (
            <ArcDetailActions
              arcId={arc.id}
              title={arc.title}
              revision={arc.revision}
              checkInCount={arc.evidence.length}
              workspaceId={workspace.id}
              installationId={item.installationId}
              workspaceSlug={workspaceSlug}
              deleteIdempotencyKey={createIdempotencyKey()}
            />
          ) : null
        }
      />

      {item?.installationId ? (
        <ArcMobileCheckIn
          arcId={arc.id}
          workspaceId={workspace.id}
          installationId={item.installationId}
          workspaceSlug={workspaceSlug}
          currentStatus={arc.lifecycleStatus}
          progressPercent={arc.progressPercent}
          checkInCount={arc.evidence.length}
        />
      ) : null}

      <div className="mt-8 grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_21rem] lg:gap-12">
        <ArcRouteNarrative
          currentReality={
            arc.currentReality || "Current reality has not been recorded yet."
          }
          objective={arc.objective || "The outcome has not been recorded yet."}
          why={arc.why}
          constraints={arc.constraints}
          checkIns={checkIns}
          progressPercent={arc.progressPercent}
        />

        <div className="hidden lg:block">
          <ArcProgressPanel
            progressPercent={arc.progressPercent}
            checkInCount={arc.evidence.length}
            lastActivityAt={arc.lastActivityAt}
          >
            {item?.installationId ? (
              <ArcCheckInForm
                key={`${arc.id}-${arc.lifecycleStatus}-${arc.progressPercent}`}
                arcId={arc.id}
                workspaceId={workspace.id}
                installationId={item.installationId}
                workspaceSlug={workspaceSlug}
                currentStatus={arc.lifecycleStatus}
                progressPercent={arc.progressPercent}
              />
            ) : (
              <div className="border-t border-border pt-5">
                <p className="text-sm leading-6 text-muted-foreground">
                  This Arc remains readable. Reinstall Goals and Paths to record
                  check-ins or change its status.
                </p>
                <Link
                  href="/tools"
                  className={buttonVariants({
                    variant: "secondary",
                    className: "mt-4 w-full",
                  })}
                >
                  Open tool catalog
                </Link>
              </div>
            )}
          </ArcProgressPanel>
        </div>
      </div>
    </main>
  )
}
