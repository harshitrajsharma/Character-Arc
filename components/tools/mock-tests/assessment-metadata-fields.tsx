"use client"
import dynamic from "next/dynamic"
import { Input } from "@/components/ui/input"
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldDescription,
  FieldError,
} from "@/components/ui/field"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectGroup,
  SelectItem,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { RichTextEditorSkeleton } from "./editor/rich-text-editor-skeleton"
import { PAPER_TYPES } from "./assessment-paper-types"
import type {
  AssessmentMetadataValues,
  AssessmentMetadataKey,
  AssessmentMetadataErrors,
} from "./assessment-metadata-model"
const RichTextEditor = dynamic(
  () => import("./editor/rich-text-editor").then((m) => m.RichTextEditor),
  { ssr: false, loading: () => <RichTextEditorSkeleton minHeight="140px" /> }
)
const paperTypes = PAPER_TYPES.map((type) => ({
  value: type.id,
  label: type.label,
}))
export type AssessmentFieldProps = {
  values: AssessmentMetadataValues
  errors?: AssessmentMetadataErrors
  id: (key: AssessmentMetadataKey) => string
  onChange: <K extends AssessmentMetadataKey>(
    key: K,
    value: AssessmentMetadataValues[K]
  ) => void
}
function description(props: AssessmentFieldProps, key: AssessmentMetadataKey) {
  return (
    props.id(key) +
    "-hint" +
    (props.errors?.[key] ? " " + props.id(key) + "-error" : "")
  )
}
function TextField({
  name,
  label,
  hint,
  options,
  autoFocus,
  ...props
}: AssessmentFieldProps & {
  name: Exclude<
    AssessmentMetadataKey,
    "paperType" | "instructions" | "calculatorAllowed"
  >
  label: string
  hint: string
  options?: {
    type?: string
    min?: number
    max?: number
    maxLength?: number
    step?: string
    placeholder?: string
  }
  autoFocus?: boolean
}) {
  const error = props.errors?.[name],
    id = props.id(name)
  return (
    <Field data-invalid={!!error} className="gap-2">
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input
        {...options}
        id={id}
        name={name}
        value={props.values[name]}
        onChange={(event) => props.onChange(name, event.target.value)}
        autoFocus={autoFocus}
        autoComplete="off"
        required={name === "title"}
        className="h-11 scroll-mt-24 rounded-lg"
        aria-invalid={!!error}
        aria-describedby={description(props, name)}
        inputMode={
          options?.type === "number"
            ? name === "totalMarks"
              ? "decimal"
              : "numeric"
            : undefined
        }
      />
      <FieldDescription id={id + "-hint"}>{hint}</FieldDescription>
      {error ? (
        <FieldError id={id + "-error"} role="alert">
          {error}
        </FieldError>
      ) : null}
    </Field>
  )
}
export function AssessmentTitleField(
  props: AssessmentFieldProps & { autoFocus?: boolean }
) {
  return (
    <TextField
      {...props}
      name="title"
      label="Assessment title"
      hint="Required. Choose a name you'll recognize in your library."
      options={{ maxLength: 200, placeholder: "Enter an assessment title" }}
    />
  )
}
export function AssessmentLabelFields(props: AssessmentFieldProps) {
  return (
    <FieldGroup>
      <Field className="gap-2">
        <FieldLabel htmlFor={props.id("paperType")}>Assessment type</FieldLabel>
        <Select
          items={paperTypes}
          value={props.values.paperType}
          onValueChange={(value) => {
            if (value) props.onChange("paperType", value)
          }}
        >
          <SelectTrigger
            id={props.id("paperType")}
            className="h-11! w-full rounded-lg"
            aria-describedby={description(props, "paperType")}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {paperTypes.map((item) => (
                <SelectItem
                  key={item.value}
                  value={item.value}
                  className="min-h-11"
                >
                  {item.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
        <FieldDescription id={props.id("paperType") + "-hint"}>
          Choose how this assessment is categorized.
        </FieldDescription>
      </Field>
      <FieldGroup className="grid min-w-0 gap-5 sm:grid-cols-2">
        <TextField
          {...props}
          name="examTag"
          label="Exam label (optional)"
          hint="An exam or course label for this assessment."
          options={{
            maxLength: 60,
            placeholder: "Enter an exam or course label",
          }}
        />
        <TextField
          {...props}
          name="subjects"
          label="Subjects (optional)"
          hint="Separate subject names with commas."
          options={{
            maxLength: 180,
            placeholder: "Enter subjects, separated by commas",
          }}
        />
      </FieldGroup>
    </FieldGroup>
  )
}
export function AssessmentTimingFields(props: AssessmentFieldProps) {
  return (
    <FieldGroup>
      <FieldGroup className="grid min-w-0 gap-5 sm:grid-cols-2">
        <TextField
          {...props}
          name="durationMinutes"
          label="Duration (minutes)"
          hint="Optional. Leave blank for an untimed test."
          options={{
            type: "number",
            min: 1,
            max: 1440,
            step: "1",
            placeholder: "Untimed",
          }}
        />
        <TextField
          {...props}
          name="totalMarks"
          label="Target marks"
          hint="Optional. Leave blank to calculate from question marks."
          options={{
            type: "number",
            min: 0.01,
            max: 999999.99,
            step: "0.01",
            placeholder: "Calculated from questions",
          }}
        />
      </FieldGroup>
      <Field
        orientation="horizontal"
        className="min-h-11 items-center justify-between gap-4"
      >
        <div className="flex min-w-0 flex-col gap-1">
          <FieldLabel htmlFor={props.id("calculatorAllowed")}>
            On-screen calculator
          </FieldLabel>
          <FieldDescription id={props.id("calculatorAllowed") + "-hint"}>
            Allow a scientific calculator during the test.
          </FieldDescription>
        </div>
        <Switch
          id={props.id("calculatorAllowed")}
          name="calculatorAllowed"
          checked={props.values.calculatorAllowed}
          onCheckedChange={(value) =>
            props.onChange("calculatorAllowed", value)
          }
          aria-describedby={description(props, "calculatorAllowed")}
          className="after:-inset-y-3"
        />
      </Field>
    </FieldGroup>
  )
}
export function AssessmentInstructionsField(props: AssessmentFieldProps) {
  const id = props.id("instructions"),
    error = props.errors?.instructions
  return (
    <Field data-invalid={!!error} className="gap-2">
      <FieldLabel
        id={id + "-label"}
        htmlFor={id}
        onClick={() =>
          document
            .getElementById(id)
            ?.querySelector<HTMLElement>("[contenteditable=true]")
            ?.focus()
        }
      >
        Candidate instructions
      </FieldLabel>
      <RichTextEditor
        id={id}
        ariaLabelledBy={id + "-label"}
        ariaDescribedBy={description(props, "instructions")}
        value={props.values.instructions}
        onChange={(value) => props.onChange("instructions", value)}
        placeholder="Add instructions for candidates..."
        minHeight="140px"
        invalid={!!error}
      />
      <FieldDescription id={id + "-hint"}>
        Up to 20,000 characters, including formatting.
      </FieldDescription>
      {error ? (
        <FieldError id={id + "-error"} role="alert">
          {error}
        </FieldError>
      ) : null}
    </Field>
  )
}
export function AssessmentBenchmarkFields(props: AssessmentFieldProps) {
  return (
    <FieldGroup>
      <p className="text-xs text-muted-foreground">
        These are your assessment targets, not official exam cutoffs.
      </p>
      <FieldGroup className="grid min-w-0 gap-5 sm:grid-cols-2">
        <TextField
          {...props}
          name="passingBenchmark"
          label="Passing benchmark (%)"
          hint="A whole percentage from 1 to 100."
          options={{ type: "number", min: 1, max: 100, step: "1" }}
        />
        <TextField
          {...props}
          name="distinctionBenchmark"
          label="Distinction benchmark (%)"
          hint="Must be higher than the passing benchmark."
          options={{ type: "number", min: 1, max: 100, step: "1" }}
        />
      </FieldGroup>
    </FieldGroup>
  )
}
