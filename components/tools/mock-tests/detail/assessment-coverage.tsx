import Link from "next/link"
import { Button } from "@/components/ui/button"
import { UrlPagination } from "@/components/shared/url-pagination"
import { workspaceRoutes } from "@/lib/routes/workspace-tools"
import type { AssessmentOverview } from "@/lib/tools/mock-tests/assessment-overview-model"

export function AssessmentCoverage({
  assessment,
  workspaceSlug,
  canEdit,
}: {
  assessment: AssessmentOverview
  workspaceSlug: string
  canEdit: boolean
}) {
  const { coverage } = assessment
  return (
    <section className="min-w-0" aria-labelledby="assessment-coverage-heading">
      <div className="flex flex-col gap-2 p-4 sm:p-6">
        <h3
          id="assessment-coverage-heading"
          tabIndex={-1}
          className="scroll-mt-24 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Syllabus coverage
        </h3>
        <p className="text-xs text-muted-foreground">
          Areas linked to this assessment’s questions. A question can cover more
          than one area.
        </p>
        {coverage.unmapped ? (
          <p className="text-sm">
            {coverage.unmapped} of {assessment.questionCount} questions have no
            linked syllabus area.
          </p>
        ) : assessment.questionCount ? (
          <p className="text-sm">
            All questions have linked syllabus coverage.
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            Add questions to define coverage.
          </p>
        )}
        {canEdit && coverage.unmapped ? (
          <Button
            variant="outline"
            className="h-11 self-start"
            render={
              <Link
                href={workspaceRoutes.mockTests.edit(
                  workspaceSlug,
                  assessment.id
                )}
              />
            }
          >
            Edit coverage in builder
          </Button>
        ) : null}
      </div>
      {coverage.items.length ? (
        <ul className="divide-y divide-border border-t border-border">
          {coverage.items.map((target) => (
            <li
              key={target.id}
              className="flex min-w-0 flex-wrap items-center justify-between gap-2 px-4 py-3 sm:px-6"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium break-words">
                  {target.subject ? (
                    <Link
                      className="inline-flex min-h-11 items-center rounded-lg underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
                      href={workspaceRoutes.examPrep.subject(
                        workspaceSlug,
                        target.subject.examId,
                        target.subject.id
                      )}
                    >
                      {target.title}
                    </Link>
                  ) : (
                    target.title
                  )}
                </p>
                {target.context ? (
                  <p className="mt-1 text-xs break-words text-muted-foreground">
                    {target.context}
                  </p>
                ) : null}
                <p className="mt-1 text-xs text-muted-foreground">
                  {target.type.split(".").pop()}
                </p>
              </div>
              <span className="text-xs text-muted-foreground">
                {target.questionCount}{" "}
                {target.questionCount === 1 ? "question" : "questions"}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
      <UrlPagination
        pagination={coverage}
        pathname={workspaceRoutes.mockTests.detail(
          workspaceSlug,
          assessment.id
        )}
        queryKey="coveragePage"
        unit="areas"
        headingId="assessment-coverage-heading"
      />
    </section>
  )
}
