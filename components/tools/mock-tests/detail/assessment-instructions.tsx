import { formatNumber } from "@/lib/tools/mock-tests/kind-labels"
import type { AssessmentOverview } from "@/lib/tools/mock-tests/assessment-overview-model"
import { RichContent } from "../editor/rich-content"
import { AssessmentPanel } from "./assessment-panel"
import { AssessmentCoverage } from "./assessment-coverage"

export function AssessmentInstructions({
  assessment,
  workspaceSlug,
  canEdit,
}: {
  assessment: AssessmentOverview
  workspaceSlug: string
  canEdit: boolean
}) {
  const penalty = !assessment.questionCount
    ? "Not configured"
    : assessment.penalty.minimum === 0
      ? "No penalty"
      : assessment.penalty.minimum === assessment.penalty.maximum
        ? `${formatNumber(assessment.penalty.minimum)} marks`
        : "Varies by question"
  return (
    <AssessmentPanel aria-labelledby="assessment-details-heading">
      <h2
        id="assessment-details-heading"
        className="border-b border-border p-4 font-heading text-base font-semibold sm:px-6"
      >
        Instructions and structure
      </h2>
      <section
        aria-labelledby="candidate-instructions-heading"
        className="flex min-w-0 flex-col gap-3 border-b border-border p-4 sm:px-6"
      >
        <h3
          id="candidate-instructions-heading"
          className="text-sm font-semibold"
        >
          Candidate instructions
        </h3>
        {assessment.instructions?.trim() ? (
          <RichContent
            html={assessment.instructions}
            className="text-sm leading-relaxed"
          />
        ) : (
          <p className="text-sm text-muted-foreground">
            No candidate instructions have been added.
          </p>
        )}
      </section>
      <section
        aria-labelledby="assessment-marking-heading"
        className="flex flex-col gap-4 border-b border-border p-4 sm:px-6"
      >
        <h3 id="assessment-marking-heading" className="text-sm font-semibold">
          Marking and targets
        </h3>
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-[2fr_1fr_1fr]">
          <div className="col-span-2 min-w-0 sm:col-span-1">
            <dt className="text-xs text-muted-foreground">Incorrect answer</dt>
            <dd className="mt-1 text-xl font-semibold tabular-nums">
              {penalty}
            </dd>
            {assessment.penalty.minimum !== assessment.penalty.maximum ? (
              <dd className="mt-1 text-xs text-muted-foreground">
                Check each question’s marking rules.
              </dd>
            ) : null}
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Passing target</dt>
            <dd className="mt-1 text-xl font-semibold tabular-nums">
              {assessment.passingBenchmark}%
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">
              Distinction target
            </dt>
            <dd className="mt-1 text-xl font-semibold tabular-nums">
              {assessment.distinctionBenchmark}%
            </dd>
          </div>
        </dl>
        <p className="text-xs text-muted-foreground">
          Targets are set for this assessment, not official exam cut-offs.
        </p>
      </section>
      <div className="grid min-w-0 lg:grid-cols-2">
        <section
          className="flex min-w-0 flex-col gap-4 border-b border-border p-4 sm:p-6 lg:border-r lg:border-b-0"
          aria-labelledby="assessment-sections-heading"
        >
          <div className="flex flex-col gap-2">
            <h3
              id="assessment-sections-heading"
              className="text-sm font-semibold"
            >
              Sections
            </h3>
            <p className="text-xs text-muted-foreground">
              Question and mark allocations in this assessment.
            </p>
          </div>
          {assessment.sections.length ? (
            <ul className="flex flex-col gap-4">
              {assessment.sections.map((section) => (
                <li key={section.key} className="flex flex-col gap-1">
                  <p className="text-sm font-medium break-words">
                    {section.title}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {section.questionCount}{" "}
                    {section.questionCount === 1 ? "question" : "questions"} ·{" "}
                    {formatNumber(section.marks)} marks
                  </p>
                  {section.description ? (
                    <p className="text-sm whitespace-pre-wrap text-muted-foreground">
                      {section.description}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              No sections. Questions appear in one continuous paper.
            </p>
          )}
          {assessment.sections.length > 0 &&
          assessment.unsectioned.questionCount > 0 ? (
            <p className="text-xs text-muted-foreground">
              Unassigned: {assessment.unsectioned.questionCount} questions ·{" "}
              {formatNumber(assessment.unsectioned.marks)} marks
            </p>
          ) : null}
        </section>
        <AssessmentCoverage
          assessment={assessment}
          workspaceSlug={workspaceSlug}
          canEdit={canEdit}
        />
      </div>
    </AssessmentPanel>
  )
}
