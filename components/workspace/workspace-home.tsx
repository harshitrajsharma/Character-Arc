import Link from "next/link"
import {
  ArrowRightIcon,
  BookOpenIcon,
  FileCheckIcon,
  HistoryIcon,
  LibraryIcon,
  PlusIcon,
  UsersIcon,
} from "lucide-react"
import type { ReactNode } from "react"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty"
import {
  AttemptAction,
  AttemptScoreValue,
  AttemptStatusBadge,
} from "@/components/tools/mock-tests/attempt-presentation"
import { workspaceRoutes } from "@/lib/routes/workspace-tools"
import { subjectTestsHref } from "@/lib/tools/exam-prep/assessment-study-context"
import { formatAttemptDate } from "@/lib/dates/attempt-date"
import { cn } from "@/lib/utils"
import type { WorkspaceHomeData } from "@/lib/workspaces/workspace-home"

const textLink =
  "inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full px-3 text-sm font-medium outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
const rowLink =
  "flex min-h-24 min-w-0 items-center gap-3 p-4 outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"

function HomeSection({
  id,
  title,
  description,
  href,
  action,
  children,
}: {
  id: string
  title: string
  description: string
  href: string
  action: string
  children: ReactNode
}) {
  return (
    <section aria-labelledby={id} className="min-w-0">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <h2 id={id} className="font-heading text-lg font-semibold">
            {title}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
        <Link href={href} className={textLink}>
          {action}
          <ArrowRightIcon className="size-4" aria-hidden="true" />
        </Link>
      </div>
      {children}
    </section>
  )
}

function NoRecentItems({ children }: { children: ReactNode }) {
  return (
    <Empty variant="compact" className="rounded-none border-y border-border">
      <EmptyDescription>{children}</EmptyDescription>
    </Empty>
  )
}

export function WorkspaceHomeView({ data }: { data: WorkspaceHomeData }) {
  const {
    workspace,
    hasExamPrep,
    hasAssessments,
    exams,
    papers,
    attempts,
    activeAttempt,
  } = data
  const slug = workspace.slug
  const canCreate = workspace.role !== "VIEWER"
  const paperHome = workspaceRoutes.mockTests.home(slug)
  const links = [
    ...(hasExamPrep
      ? [
          {
            label: "Exam Prep",
            description: "Exams, subjects and syllabus",
            href: workspaceRoutes.examPrep.home(slug),
            icon: BookOpenIcon,
          },
        ]
      : []),
    ...(hasAssessments
      ? [
          {
            label: "My assessments",
            description: "Build and manage papers",
            href: paperHome,
            icon: FileCheckIcon,
          },
          {
            label: "Question bank",
            description: "Create and reuse questions",
            href: workspaceRoutes.mockTests.questions(slug),
            icon: LibraryIcon,
          },
          {
            label: "Community",
            description: "Discover shared assessments",
            href: `${paperHome}?tab=community`,
            icon: UsersIcon,
          },
          {
            label: "Attempt history",
            description: "Review your results",
            href: `${paperHome}?tab=attempts`,
            icon: HistoryIcon,
          },
        ]
      : []),
  ]

  return (
    <main className="mx-auto flex w-full max-w-7xl min-w-0 flex-col gap-8 px-4 pt-24 pb-8 sm:px-6 sm:pb-12 lg:px-10">
      <header className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="mb-2 text-sm text-muted-foreground">{workspace.name}</p>
          <h1 className="font-heading text-3xl font-semibold">Workspace</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Your exams, subjects and assessments, together.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {hasExamPrep && canCreate ? (
            <Button
              variant="outline"
              className="h-11"
              render={<Link href={workspaceRoutes.examPrep.new(slug)} />}
            >
              <PlusIcon aria-hidden="true" />
              New exam
            </Button>
          ) : null}
          {hasAssessments && canCreate ? (
            <Button
              className="h-11"
              render={<Link href={workspaceRoutes.mockTests.new(slug)} />}
            >
              <PlusIcon aria-hidden="true" />
              Create assessment
            </Button>
          ) : null}
        </div>
      </header>

      {activeAttempt ? (
        <Alert
          role="region"
          aria-label="Continue assessment"
          className="flex min-w-0 flex-wrap items-center justify-between gap-4"
        >
          <div className="min-w-0 flex-1 basis-56">
            <AlertTitle>Test in progress</AlertTitle>
            <AlertDescription>
              <p className="mt-1 wrap-anywhere text-foreground">
                {activeAttempt.title}
              </p>
              <p className="mt-1 text-xs">
                {canCreate
                  ? "The timer continues. Use a tablet or laptop with a large enough screen."
                  : "Your workspace access is read-only. Ask an owner to restore editing access before resuming."}
              </p>
            </AlertDescription>
          </div>
          {canCreate ? (
            <AttemptAction
              href={workspaceRoutes.mockTests.attempt(slug, activeAttempt.id)}
              action="resume"
              accessibleLabel={`Resume ${activeAttempt.title}`}
            />
          ) : null}
        </Alert>
      ) : null}

      {links.length ? (
        <nav
          aria-label="Workspace shortcuts"
          className={cn(
            "grid min-w-0 grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border",
            links.length === 5 ? "lg:grid-cols-5" : "lg:grid-cols-4",
            links.length === 1 && "grid-cols-1 lg:grid-cols-1"
          )}
        >
          {links.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className={cn(
                "flex min-h-16 min-w-0 items-center gap-2 bg-card px-3 py-3 outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset sm:min-h-24 sm:items-start sm:gap-3 sm:p-4",
                links.length > 1 &&
                  links.length % 2 === 1 &&
                  "last:col-span-2 lg:last:col-span-1"
              )}
            >
              <link.icon
                className="size-4 shrink-0 text-muted-foreground sm:mt-0.5 sm:size-5"
                aria-hidden="true"
              />
              <span className="min-w-0">
                <span className="block text-sm font-semibold wrap-anywhere">
                  {link.label}
                </span>
                <span className="mt-1 hidden text-xs leading-5 text-muted-foreground sm:block">
                  {link.description}
                </span>
              </span>
            </Link>
          ))}
        </nav>
      ) : (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>Set up your learning workspace</EmptyTitle>
            <EmptyDescription>
              Add Exam Prep and Assessments to organize subjects, build tests
              and track your practice.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button className="mt-4 h-11" render={<Link href="/tools" />}>
              Browse tools
              <ArrowRightIcon aria-hidden="true" />
            </Button>
          </EmptyContent>
        </Empty>
      )}

      {hasExamPrep ? (
        <HomeSection
          id="home-exams"
          title="Exams & subjects"
          description="Open a subject to study its syllabus or take a subject test."
          href={workspaceRoutes.examPrep.home(slug)}
          action="All exams"
        >
          {exams.length ? (
            <ul
              className={cn(
                "grid min-w-0 gap-4",
                exams.length === 2 ? "lg:grid-cols-2" : "lg:grid-cols-3"
              )}
            >
              {exams.map((exam) => (
                <li
                  key={exam.id}
                  className="min-w-0 overflow-hidden rounded-lg border border-border bg-card"
                >
                  <Link
                    href={workspaceRoutes.examPrep.exam(slug, exam.id)}
                    className={rowLink}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block text-base font-semibold wrap-anywhere">
                        {exam.title}
                      </span>
                      {exam.code ? (
                        <span className="mt-1 block text-xs text-muted-foreground">
                          {exam.code}
                        </span>
                      ) : null}
                    </span>
                    <ArrowRightIcon
                      className="size-4 shrink-0 text-muted-foreground"
                      aria-hidden="true"
                    />
                  </Link>
                  <div className="border-t border-border px-4 py-2">
                    <p className="py-2 text-xs font-medium text-muted-foreground">
                      Subjects
                    </p>
                    {exam.subjects.length ? (
                      <ul className="min-w-0">
                        {exam.subjects.map((subject) => (
                          <li
                            key={subject.id}
                            className="flex min-w-0 items-center gap-1"
                          >
                            <Link
                              href={workspaceRoutes.examPrep.subject(
                                slug,
                                exam.id,
                                subject.id
                              )}
                              className="flex min-h-11 min-w-0 flex-1 items-center justify-between gap-3 rounded-lg px-2 text-sm outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
                            >
                              <span className="wrap-anywhere">
                                {subject.title}
                              </span>
                              <ArrowRightIcon
                                className="size-3.5 shrink-0 text-muted-foreground"
                                aria-hidden="true"
                              />
                            </Link>
                            <Link
                              href={subjectTestsHref(slug, {
                                examId: exam.id,
                                subjectId: subject.id,
                              })}
                              aria-label={`Tests for ${subject.title} in ${exam.title}`}
                              className="inline-flex min-h-11 shrink-0 items-center rounded-full px-3 text-xs font-medium outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
                            >
                              Tests
                            </Link>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="py-3 text-sm leading-6 text-muted-foreground">
                        No subjects linked to this exam yet.
                      </p>
                    )}
                    <Link
                      href={workspaceRoutes.examPrep.exam(slug, exam.id)}
                      className="mt-1 inline-flex min-h-11 items-center text-xs font-medium text-muted-foreground underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      View exam &amp; all subjects
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <NoRecentItems>
              Your exams will appear here. Start with an exam, then add its
              subjects and syllabus.
            </NoRecentItems>
          )}
        </HomeSection>
      ) : null}

      {hasAssessments ? (
        <div className="grid min-w-0 gap-8 xl:grid-cols-2">
          <HomeSection
            id="home-assessments"
            title="Recent assessments"
            description="Continue a draft or open a published paper."
            href={paperHome}
            action="All papers"
          >
            {papers.length ? (
              <ul className="min-w-0 divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
                {papers.map((paper) => (
                  <li key={paper.id}>
                    <Link
                      href={
                        paper.status === "DRAFT" && canCreate
                          ? workspaceRoutes.mockTests.edit(slug, paper.id)
                          : workspaceRoutes.mockTests.detail(slug, paper.id)
                      }
                      className={rowLink}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold wrap-anywhere">
                          {paper.title}
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                          <Badge variant="secondary">
                            {paper.status === "DRAFT" ? "Draft" : "Published"}
                          </Badge>
                          <span>{paper.questionCount} questions</span>
                          <span>
                            {paper.durationMinutes === null
                              ? "Untimed"
                              : `${paper.durationMinutes} min`}
                          </span>
                        </div>
                      </div>
                      <ArrowRightIcon
                        className="size-4 shrink-0 text-muted-foreground"
                        aria-hidden="true"
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <NoRecentItems>
                No assessments yet. Create a paper or discover one in Community.
              </NoRecentItems>
            )}
          </HomeSection>
          <HomeSection
            id="home-attempts"
            title="Your recent attempts"
            description="Resume an active test or review a result."
            href={`${paperHome}?tab=attempts`}
            action="Full history"
          >
            {attempts.length ? (
              <ul className="min-w-0 divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
                {attempts.map((attempt) => (
                  <li
                    key={attempt.id}
                    className="flex min-h-24 min-w-0 flex-wrap items-center gap-3 p-4"
                  >
                    <div className="min-w-0 flex-1 basis-48">
                      <p className="text-sm font-semibold wrap-anywhere">
                        {attempt.title}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        <AttemptStatusBadge status={attempt.status} />
                        <span>{formatAttemptDate(attempt.startedAt)}</span>
                        {attempt.status === "evaluated" &&
                        attempt.score !== null ? (
                          <span className="font-medium text-foreground">
                            <AttemptScoreValue
                              score={attempt.score}
                              maxScore={attempt.maxScore}
                            />
                          </span>
                        ) : null}
                      </div>
                    </div>
                    {attempt.status === "evaluated" ||
                    (attempt.status === "in_progress" && canCreate) ? (
                      <AttemptAction
                        href={
                          attempt.status === "in_progress"
                            ? workspaceRoutes.mockTests.attempt(
                                slug,
                                attempt.id
                              )
                            : workspaceRoutes.mockTests.analysis(
                                slug,
                                attempt.id
                              )
                        }
                        action={
                          attempt.status === "in_progress" ? "resume" : "review"
                        }
                        accessibleLabel={`${attempt.status === "in_progress" ? "Resume" : "Review"} ${attempt.title}`}
                      />
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        {attempt.status === "submitted"
                          ? "Awaiting evaluation"
                          : attempt.status === "abandoned"
                            ? "Not completed"
                            : "Read-only access"}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <NoRecentItems>
                Your attempts and results will appear here after you take a
                test.
              </NoRecentItems>
            )}
          </HomeSection>
        </div>
      ) : null}

      {(!hasExamPrep || !hasAssessments) && links.length ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5">
          <p className="text-sm text-muted-foreground">
            {!hasExamPrep
              ? "Add Exam Prep to organize exams and subjects."
              : "Add Assessments to create papers, take tests and review results."}
          </p>
          <Button
            variant="outline"
            className="h-11"
            render={<Link href="/tools" />}
          >
            Browse tools
          </Button>
        </div>
      ) : null}
    </main>
  )
}
