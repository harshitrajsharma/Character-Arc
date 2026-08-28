import type { Metadata } from "next"
import Link from "next/link"
import {
  BookOpenTextIcon,
  FilePenLineIcon,
  ListChecksIcon,
  PlusIcon,
  SlidersHorizontalIcon,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ToolPageHeader } from "@/components/tools/tool-page-header"
import {
  getMockTestsOverview,
  getQuestionBank,
} from "@/lib/tools/definitions/mock-tests/repository"
import { workspaceRoutes } from "@/lib/routes/workspace-tools"
import {
  getWorkspaceIdentity,
  requireActiveToolInstallation,
} from "@/lib/workspaces/workspace-access"
import { formatNumber } from "@/lib/tools/mock-tests/kind-labels"
import { cn } from "@/lib/utils"

export const metadata: Metadata = { title: "Authoring Suite — Mock Tests" }

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  draft: {
    label: "Draft",
    className: "border-muted-foreground/30 bg-muted/40 text-muted-foreground",
  },
  published: {
    label: "Published",
    className:
      "border-brand-neon-line/40 bg-brand-neon-soft text-brand-neon-ink font-semibold",
  },
  archived: {
    label: "Archived",
    className: "border-brand-amber-line bg-brand-amber-soft text-brand-amber-ink",
  },
}

export default async function AuthoringSuitePage({
  params,
}: {
  params: Promise<{ workspaceSlug: string }>
}) {
  const { workspaceSlug } = await params
  const workspace = await getWorkspaceIdentity(workspaceSlug)
  const installation = await requireActiveToolInstallation(
    workspaceSlug,
    "core.mock-tests"
  )

  const [overview, bank] = await Promise.all([
    getMockTestsOverview(workspace.id, workspaceSlug, installation.id),
    getQuestionBank(workspace.id),
  ])

  const canWrite = workspace.role !== "VIEWER"

  const publishedCount = overview.assessments.filter((a) => a.status === "published").length
  const draftsCount = overview.assessments.filter((a) => a.status === "draft").length

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pt-24 pb-8 sm:pb-10 md:px-6 xl:px-10 space-y-6">
      <ToolPageHeader
        eyebrow="Authoring Suite"
        title="Test Management Hub"
        description="Design test blueprints, author rich Tiptap + KaTeX questions, configure sections, and publish mock papers for your students."
        icon={<FilePenLineIcon aria-hidden="true" />}
        iconClassName="bg-brand-violet-soft text-brand-violet-ink"
        backHref={workspaceRoutes.mockTests.home(workspaceSlug)}
        primaryAction={
          canWrite ? (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-9 gap-1.5 text-xs font-medium"
                render={<Link href={workspaceRoutes.mockTests.questions(workspaceSlug)} />}
              >
                <BookOpenTextIcon className="size-3.5 text-brand-cyan-ink" aria-hidden="true" />
                Question Bank ({bank.length})
              </Button>
              <Button
                size="sm"
                className="h-9 gap-1.5 text-xs font-semibold"
                render={<Link href={workspaceRoutes.mockTests.new(workspaceSlug)} />}
              >
                <PlusIcon className="size-3.5" aria-hidden="true" />
                New Test Blueprint
              </Button>
            </div>
          ) : null
        }
      />

      {/* Authoring Stat Cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4 shadow-xs border-border/80 bg-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Draft Papers</span>
            <span className="flex size-7 items-center justify-center rounded-lg bg-brand-amber-soft text-brand-amber-ink">
              <FilePenLineIcon className="size-3.5" aria-hidden="true" />
            </span>
          </div>
          <div className="mt-2 font-heading text-2xl font-bold tracking-tight text-foreground">
            {draftsCount}
          </div>
          <p className="mt-0.5 text-[11px] text-muted-foreground">In progress or editing</p>
        </Card>

        <Card className="p-4 shadow-xs border-border/80 bg-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Published Papers</span>
            <span className="flex size-7 items-center justify-center rounded-lg bg-success-soft text-success-ink">
              <ListChecksIcon className="size-3.5" aria-hidden="true" />
            </span>
          </div>
          <div className="mt-2 font-heading text-2xl font-bold tracking-tight text-foreground">
            {publishedCount}
          </div>
          <p className="mt-0.5 text-[11px] text-muted-foreground">Live for student attempts</p>
        </Card>

        <Card className="p-4 shadow-xs border-border/80 bg-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Question Repository</span>
            <span className="flex size-7 items-center justify-center rounded-lg bg-brand-cyan-soft text-brand-cyan-ink">
              <BookOpenTextIcon className="size-3.5" aria-hidden="true" />
            </span>
          </div>
          <div className="mt-2 font-heading text-2xl font-bold tracking-tight text-foreground">
            {bank.length} <span className="text-xs font-normal text-muted-foreground font-sans">questions</span>
          </div>
          <p className="mt-0.5 text-[11px] text-muted-foreground">Reusable across blueprints</p>
        </Card>

        <Card className="p-4 shadow-xs border-border/80 bg-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Total Blueprints</span>
            <span className="flex size-7 items-center justify-center rounded-lg bg-brand-violet-soft text-brand-violet-ink">
              <SlidersHorizontalIcon className="size-3.5" aria-hidden="true" />
            </span>
          </div>
          <div className="mt-2 font-heading text-2xl font-bold tracking-tight text-foreground">
            {overview.assessments.length}
          </div>
          <p className="mt-0.5 text-[11px] text-muted-foreground">Managed test configurations</p>
        </Card>
      </div>

      {/* Blueprint Roster Data Table */}
      <section aria-labelledby="author-roster-title" className="space-y-3">
        <div className="flex items-center justify-between border-b border-border pb-2.5">
          <h2 id="author-roster-title" className="font-heading text-lg font-bold text-foreground">
            Managed Test Papers ({overview.assessments.length})
          </h2>
          <span className="text-xs text-muted-foreground">Author & Blueprint Controls</span>
        </div>

        {overview.assessments.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center space-y-3">
            <FilePenLineIcon className="size-8 mx-auto text-muted-foreground/40" />
            <div>
              <p className="text-sm font-semibold text-foreground">No Test Blueprints Created Yet</p>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">
                Create your first test blueprint to configure duration, total marks, and add questions from your question bank.
              </p>
            </div>
            {canWrite ? (
              <Button
                size="sm"
                className="h-8 text-xs font-semibold"
                render={<Link href={workspaceRoutes.mockTests.new(workspaceSlug)} />}
              >
                Create First Blueprint
              </Button>
            ) : null}
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
            <div className="hidden border-b border-border bg-muted/40 px-4 py-2.5 text-xs font-semibold text-muted-foreground sm:grid sm:grid-cols-[1fr_100px_140px_100px_150px] sm:items-center sm:gap-3">
              <span>Paper Title</span>
              <span>Status</span>
              <span>Specs</span>
              <span className="text-right">Attempts</span>
              <span className="text-right">Actions</span>
            </div>

            <div className="divide-y divide-border">
              {overview.assessments.map((item) => {
                const status = STATUS_BADGE[item.status] ?? STATUS_BADGE.draft

                return (
                  <div
                    key={item.id}
                    className="grid gap-2 p-3.5 text-xs sm:grid-cols-[1fr_100px_140px_100px_150px] sm:items-center sm:gap-3 hover:bg-muted/20 transition-colors"
                  >
                    <div className="min-w-0 space-y-0.5">
                      <p className="font-semibold text-foreground truncate">{item.title}</p>
                      <p className="text-[11px] text-muted-foreground font-mono">
                        {item.questionCount} Qs · {item.durationMinutes ? `${item.durationMinutes} min` : "Untimed"}
                      </p>
                    </div>

                    <div>
                      <Badge variant="outline" className={cn("text-[10px]", status.className)}>
                        {status.label}
                      </Badge>
                    </div>

                    <div className="text-xs text-muted-foreground font-mono">
                      {item.totalMarks !== null ? `${formatNumber(item.totalMarks)} Marks` : "No marks set"}
                    </div>

                    <div className="sm:text-right font-mono font-medium text-muted-foreground">
                      {item.attemptsCount} {item.attemptsCount === 1 ? "attempt" : "attempts"}
                    </div>

                    <div className="flex items-center justify-end gap-1.5">
                      {canWrite ? (
                        <Button
                          variant="outline"
                          size="xs"
                          className="h-7 text-xs font-medium"
                          render={<Link href={workspaceRoutes.mockTests.edit(workspaceSlug, item.id)} />}
                        >
                          Edit
                        </Button>
                      ) : null}

                      <Button
                        variant="ghost"
                        size="xs"
                        className="h-7 text-xs text-muted-foreground hover:text-foreground"
                        render={<Link href={workspaceRoutes.mockTests.detail(workspaceSlug, item.id)} />}
                      >
                        Details
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </section>
    </main>
  )
}
