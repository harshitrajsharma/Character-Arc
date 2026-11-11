"use client"
import { useId } from "react"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { FilterSelectField } from "@/components/shared/filter-select-field"

export function QuestionAllocationFields({
  sections,
  section,
  onSectionChange,
  marks,
  negativeMarks,
  onMarksChange,
  onPenaltyChange,
  error,
}: {
  sections: Array<{ key: string; title: string }>
  section: string | null
  onSectionChange: (value: string | null) => void
  marks: string
  negativeMarks: string
  onMarksChange: (value: string) => void
  onPenaltyChange: (value: string) => void
  error?: string | null
}) {
  const id = useId()
  return (
    <FieldGroup className="grid grid-cols-2 gap-4 sm:grid-cols-3">
      <div className="col-span-2 min-w-0 sm:col-span-1">
        <FilterSelectField
          label="Section"
          value={section ?? "__unassigned__"}
          onChange={(value) =>
            onSectionChange(value === "__unassigned__" ? null : value)
          }
          items={[
            { value: "__unassigned__", label: "Unassigned" },
            ...sections.map((item) => ({ value: item.key, label: item.title })),
          ]}
        />
      </div>
      <Field data-invalid={Boolean(error)}>
        <FieldLabel htmlFor={`${id}-marks`}>Marks</FieldLabel>
        <Input
          id={`${id}-marks`}
          type="number"
          min="0.01"
          max="999999.99"
          step="0.01"
          value={marks}
          onChange={(event) => onMarksChange(event.target.value)}
          className="h-11"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
        />
      </Field>
      <Field data-invalid={Boolean(error)}>
        <FieldLabel htmlFor={`${id}-penalty`}>Wrong-answer penalty</FieldLabel>
        <Input
          id={`${id}-penalty`}
          type="number"
          min="-999999.99"
          max="0"
          step="0.01"
          value={negativeMarks}
          onChange={(event) => onPenaltyChange(event.target.value)}
          className="h-11"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
        />
        <FieldDescription>Use 0 for no penalty.</FieldDescription>
      </Field>
      {error ? (
        <p
          id={`${id}-error`}
          role="alert"
          className="col-span-2 text-sm text-destructive sm:col-span-3"
        >
          {error}
        </p>
      ) : null}
    </FieldGroup>
  )
}
