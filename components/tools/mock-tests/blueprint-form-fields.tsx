"use client"
import { cn } from "@/lib/utils"
import type { PaperType } from "./assessment-paper-types"
import {
  AssessmentTitleField,
  AssessmentLabelFields,
  AssessmentTimingFields,
  AssessmentInstructionsField,
  AssessmentBenchmarkFields,
  type AssessmentFieldProps,
} from "./assessment-metadata-fields"
export interface BlueprintFormFieldsProps {
  title: string
  setTitle: (val: string) => void
  instructions: string
  setInstructions: (val: string) => void
  paperType: PaperType
  setPaperType: (val: PaperType) => void
  examTag: string
  setExamTag: (val: string) => void
  subjects: string
  setSubjects: (val: string) => void
  durationMinutes: string
  setDurationMinutes: (val: string) => void
  totalMarks: string
  setTotalMarks: (val: string) => void
  passingBenchmark: number | ""
  setPassingBenchmark: (val: number | "") => void
  distinctionBenchmark: number | ""
  setDistinctionBenchmark: (val: number | "") => void
  calculatorAllowed: boolean
  setCalculatorAllowed: (val: boolean | ((prev: boolean) => boolean)) => void
  errors?: Record<string, string>
  autoFocusTitle?: boolean
  className?: string
}

export function BlueprintFormFields(props: BlueprintFormFieldsProps) {
  const {
    title,
    instructions,
    paperType,
    examTag,
    subjects,
    durationMinutes,
    totalMarks,
    passingBenchmark,
    distinctionBenchmark,
    calculatorAllowed,
    errors = {},
    autoFocusTitle,
    className,
  } = props
  const fields: AssessmentFieldProps = {
    values: {
      title,
      instructions,
      paperType,
      examTag,
      subjects,
      durationMinutes,
      totalMarks,
      passingBenchmark: String(passingBenchmark),
      distinctionBenchmark: String(distinctionBenchmark),
      calculatorAllowed,
    },
    id: (key) =>
      `blueprint-field-${key === "calculatorAllowed" ? "calculator" : key}`,
    errors: Object.fromEntries(
      Object.entries(errors).map(([key, value]) => [
        key.replace("blueprint-field-", ""),
        value,
      ])
    ),
    onChange: (key, value) => {
      switch (key) {
        case "title":
          props.setTitle(value as string)
          break
        case "instructions":
          props.setInstructions(value as string)
          break
        case "paperType":
          props.setPaperType(value as PaperType)
          break
        case "examTag":
          props.setExamTag(value as string)
          break
        case "subjects":
          props.setSubjects(value as string)
          break
        case "durationMinutes":
          props.setDurationMinutes(value as string)
          break
        case "totalMarks":
          props.setTotalMarks(value as string)
          break
        case "passingBenchmark":
          props.setPassingBenchmark(value === "" ? "" : Number(value))
          break
        case "distinctionBenchmark":
          props.setDistinctionBenchmark(value === "" ? "" : Number(value))
          break
        case "calculatorAllowed":
          props.setCalculatorAllowed(value as boolean)
          break
      }
    },
  }
  return (
    <div className={cn("min-w-0 divide-y divide-border", className)}>
      <section
        className="flex flex-col gap-5 px-6 py-5"
        aria-labelledby="assessment-details-heading"
      >
        <div className="pr-8">
          <h2
            id="assessment-details-heading"
            className="font-heading text-base font-semibold"
          >
            Assessment details
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Name your assessment and add candidate instructions.
          </p>
        </div>
        <AssessmentTitleField {...fields} autoFocus={autoFocusTitle} />
        <AssessmentInstructionsField {...fields} />
      </section>
      <section
        className="flex flex-col gap-5 px-6 py-5"
        aria-labelledby="assessment-labels-heading"
      >
        <h2
          id="assessment-labels-heading"
          className="font-heading text-base font-semibold"
        >
          Type and labels
        </h2>
        <AssessmentLabelFields {...fields} />
      </section>
      <section
        className="flex flex-col gap-5 px-6 py-5"
        aria-labelledby="assessment-timing-heading"
      >
        <h2
          id="assessment-timing-heading"
          className="font-heading text-base font-semibold"
        >
          Test settings
        </h2>
        <AssessmentTimingFields {...fields} />
      </section>
      <section
        className="flex flex-col gap-5 px-6 py-5"
        aria-labelledby="assessment-benchmarks-heading"
      >
        <h2
          id="assessment-benchmarks-heading"
          className="font-heading text-base font-semibold"
        >
          Score benchmarks
        </h2>
        <AssessmentBenchmarkFields {...fields} />
      </section>
    </div>
  )
}
