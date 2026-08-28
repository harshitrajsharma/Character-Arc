import type { Metadata } from "next"
import {
  CalendarIcon,
  CheckCircle2Icon,
  CircleAlertIcon,
  CircleDashedIcon,
  Clock3Icon,
  GraduationCapIcon,
  PauseCircleIcon,
  PlusIcon,
  type LucideIcon,
} from "lucide-react"

import { ToolListRow } from "@/components/tools/tool-list-row"
import { ToolPageHeader } from "@/components/tools/tool-page-header"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import {
  getWorkspaceIdentity,
  requireActiveToolInstallation,
} from "@/lib/workspaces/workspace-access"
import { getExamsOverview } from "@/lib/tools/definitions/exam-prep/repository"
import { cn } from "@/lib/utils"
import {
  CreateExamDialogWrapper,
  CreateExamDialogTriggerButton,
} from "@/components/tools/exam-prep/create-exam-dialog"
import { ExamListActions } from "@/components/tools/exam-prep/exam-list-actions"

import { workspaceRoutes } from "@/lib/routes/workspace-tools"

export const metadata: Metadata = { title: "Exam Prep" }

const EXAM_GROUPS: Array<{
  key: "active" | "not_started" | "paused" | "completed"
  label: string
  icon: LucideIcon
  markerClassName: string
}> = [
  {
    key: "active",
    label: "In progress",
    icon: Clock3Icon,
    markerClassName: "bg-brand-violet",
  },
  {
    key: "not_started",
    label: "Not started",
    icon: CircleDashedIcon,
    markerClassName: "bg-muted-foreground",
  },
  {
    key: "paused",
    label: "Paused",
    icon: PauseCircleIcon,
    markerClassName: "bg-brand-amber",
  },
  {
    key: "completed",
    label: "Completed",
    icon: CheckCircle2Icon,
    markerClassName: "bg-success",
  },
]

export default async function ExamPrepPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string }>
}) {
  const { workspaceSlug } = await params
  const workspace = await getWorkspaceIdentity(workspaceSlug)
  const installation = await requireActiveToolInstallation(
    workspaceSlug,
    "core.exam-prep"
  )

  const overview = await getExamsOverview(
    workspace.id,
    workspaceSlug,
    installation.id
  )
  const examGroups = EXAM_GROUPS.map((group) => ({
    ...group,
    exams: overview.exams.filter((exam) => exam.lifecycleStatus === group.key),
  })).filter((group) => group.exams.length > 0)

  return (
    <CreateExamDialogWrapper workspaceSlug={workspaceSlug}>
      <main className="mx-auto w-full max-w-6xl px-4 pt-24 pb-8 sm:pb-10 md:px-6 xl:px-10">
        <ToolPageHeader
          eyebrow="Structured learning"
          title="Exam Prep"
          description="Track subjects, chapters, and topics through four study stages: Learn, Revise, Practice, and Test. Spaced repetition made simple."
          icon={<GraduationCapIcon aria-hidden="true" />}
          iconClassName="bg-brand-violet-soft text-brand-violet-ink"
          primaryAction={
            <CreateExamDialogTriggerButton>
              <PlusIcon data-icon="inline-start" aria-hidden="true" />
              New exam
            </CreateExamDialogTriggerButton>
          }
        />

        {overview.issue ? (
          <Alert variant="destructive" className="mt-6">
            <CircleAlertIcon aria-hidden="true" />
            <AlertTitle>Your exams are temporarily unavailable</AlertTitle>
            <AlertDescription>
              Your saved workspace data remains private. Refresh after the
              latest workspace setup has completed.
            </AlertDescription>
          </Alert>
        ) : null}

        {!overview.issue && overview.exams.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia
                variant="icon"
                className="bg-brand-violet-soft text-brand-violet-ink"
              >
                <GraduationCapIcon aria-hidden="true" />
              </EmptyMedia>
              <EmptyTitle>Start your first exam prep</EmptyTitle>
              <EmptyDescription>
                Add an exam and break down the syllabus into subjects, chapters,
                and topics.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <CreateExamDialogTriggerButton>
                <PlusIcon data-icon="inline-start" aria-hidden="true" />
                Track an exam
              </CreateExamDialogTriggerButton>
            </EmptyContent>
          </Empty>
        ) : (
          <section aria-labelledby="exams-title" className="mt-8">
            <div className="flex items-end justify-between gap-4 border-b border-border pb-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Your structured learning
                </p>
                <h2
                  id="exams-title"
                  className="mt-1 font-heading text-xl font-semibold"
                >
                  Current exams
                </h2>
              </div>
              <Badge variant="outline">{overview.exams.length} total</Badge>
            </div>

            <div className="mt-4 overflow-hidden rounded-lg border bg-card">
              {examGroups.map((group, index) => {
                const GroupIcon = group.icon

                return (
                  <section
                    key={group.key}
                    aria-labelledby={`exam-group-${group.key}`}
                    className={cn(index > 0 && "border-t border-border")}
                  >
                    <header className="flex h-11 items-center gap-2 border-b border-border bg-muted/50 px-4 text-sm font-medium text-muted-foreground">
                      <span
                        className={cn(
                          "h-1.5 w-5 rounded-full",
                          group.markerClassName
                        )}
                        aria-hidden="true"
                      />
                      <GroupIcon className="size-4" aria-hidden="true" />
                      <h3 id={`exam-group-${group.key}`}>{group.label}</h3>
                      <span className="ml-auto font-mono text-xs">
                        {group.exams.length}
                      </span>
                    </header>

                    <div>
                      {group.exams.map((exam) => (
                        <ToolListRow
                          key={exam.id}
                          href={workspaceRoutes.examPrep.exam(
                            workspaceSlug,
                            exam.id
                          )}
                          title={exam.title}
                          summary={exam.summary}
                          icon={GraduationCapIcon}
                          iconClassName={
                            exam.progressPercent === 100
                              ? "bg-brand-violet text-brand-violet-foreground"
                              : "bg-brand-violet-soft text-brand-violet-ink group-hover:bg-brand-violet group-hover:text-brand-violet-foreground"
                          }
                          progressClassName={
                            exam.progressPercent === 100
                              ? "bg-brand-violet"
                              : "bg-brand-violet-soft"
                          }
                          progressContainerClassName="bg-muted"
                          progressPercent={exam.progressPercent}
                          timelineLabel={
                            exam.expectedStartDate ? (
                              <span className="flex items-center gap-1.5 lg:justify-end">
                                <CalendarIcon
                                  className="size-3.5 shrink-0"
                                  aria-hidden="true"
                                />
                                <span className="truncate">
                                  Expected: {" "}
                                  {exam.expectedStartDate
                                    .split("-")
                                    .reverse()
                                    .join("-")}
                                </span>
                              </span>
                              ) : undefined
                          }
                          trailingAction={
                            <ExamListActions
                              workspaceSlug={workspaceSlug}
                              examId={exam.id}
                              title={exam.title}
                              summary={exam.summary}
                              expectedStartDate={exam.expectedStartDate}
                              targetMarks={exam.targetMarks}
                            />
                          }
                        />
                      ))}
                    </div>
                  </section>
                )
              })}
            </div>
          </section>
        )}
      </main>
    </CreateExamDialogWrapper>
  )
}
