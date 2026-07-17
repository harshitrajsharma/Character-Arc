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

export const metadata: Metadata = { title: "Arc" }

type ArcDetailPageProps = {
  params: Promise<{ arcId: string }>
}

export default async function ArcDetailPage({ params }: ArcDetailPageProps) {
  const { arcId } = await params
  const { arc, workspace, item, issue } = await getArcDetail(arcId)

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
    <main className="mx-auto w-full max-w-6xl px-4 pt-24 pb-12 md:px-6 xl:px-10">
      <ArcDetailHeader
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
              deleteIdempotencyKey={crypto.randomUUID()}
            />
          ) : null
        }
      />

      {item?.installationId ? (
        <ArcMobileCheckIn
          arcId={arc.id}
          workspaceId={workspace.id}
          installationId={item.installationId}
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
