"use client"

import { ChevronDownIcon, CircleDotDashedIcon, HeartIcon } from "lucide-react"

import { MarkdownFieldEditor } from "@/components/editor/markdown-field-editor"
import { DatePickerField } from "@/components/forms/date-picker-field"
import { ARC_GLASS_INPUT_GROUP_CLASS } from "@/components/tools/create-arc/arc-form-styles"
import type {
  ArcDraft,
  ArcFieldErrors,
  UpdateArcDraft,
} from "@/components/tools/create-arc/arc-form-types"
import { buttonVariants } from "@/components/ui/button"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupText,
  InputGroupTextarea,
} from "@/components/ui/input-group"
import { toFieldErrorItems } from "@/lib/forms/field-errors"
import { cn } from "@/lib/utils"

type ArcOptionalContextProps = {
  draft: ArcDraft
  errors?: ArcFieldErrors
  open: boolean
  onOpenChange: (open: boolean) => void
  onChange: UpdateArcDraft
}

export function ArcOptionalContext({
  draft,
  errors,
  open,
  onOpenChange,
  onChange,
}: ArcOptionalContextProps) {
  return (
    <Collapsible open={open} onOpenChange={onOpenChange} className="mt-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="font-heading text-base font-semibold">
            Useful context
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Add only what will make the plan more realistic.
          </p>
        </div>
        <CollapsibleTrigger
          className={buttonVariants({ variant: "secondary", size: "sm" })}
        >
          {open ? "Hide" : "Add details"}
          <ChevronDownIcon data-icon="inline-end" aria-hidden="true" />
        </CollapsibleTrigger>
      </div>

      <CollapsibleContent className="mt-4 flex flex-col gap-3 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0">
        <MarkdownFieldEditor
          id="why"
          name="why"
          label="Why does this matter?"
          description="Capture the meaning, evidence, or people behind this arc."
          value={draft.why}
          onChange={(markdown) => onChange("why", markdown)}
          placeholder="Capture the meaning, evidence, or people behind this arc."
          emptyPreview="Add the reason you want to remember when motivation gets noisy."
          icon={HeartIcon}
          iconClassName="bg-brand-cyan-soft text-brand-cyan-ink"
          maxLength={4000}
          errors={errors?.why}
        />

        <DatePickerField
          id="targetDate"
          name="targetDate"
          label="Target date"
          value={draft.targetDate}
          onChange={(value) => onChange("targetDate", value)}
          errors={errors?.targetDate}
          placeholder="Open-ended"
          className={cn(
            ARC_GLASS_INPUT_GROUP_CLASS,
            "hover:bg-foreground/[0.065] dark:bg-foreground/[0.045]"
          )}
        />

        <Field data-invalid={Boolean(errors?.constraints)}>
          <InputGroup
            className={cn(
              ARC_GLASS_INPUT_GROUP_CLASS,
              "h-auto items-stretch rounded-lg"
            )}
          >
            <InputGroupAddon
              align="block-start"
              className="gap-2 border-b border-foreground/8 px-4 sm:px-5"
            >
              <CircleDotDashedIcon aria-hidden="true" />
              <FieldLabel htmlFor="constraints">Constraints</FieldLabel>
            </InputGroupAddon>
            <InputGroupTextarea
              id="constraints"
              name="constraints"
              value={draft.constraints}
              onChange={(event) => onChange("constraints", event.target.value)}
              maxLength={6000}
              className="min-h-16 px-4 sm:px-5"
              placeholder={"Limited budget\nTwo weeks"}
              aria-invalid={Boolean(errors?.constraints)}
            />
            <InputGroupAddon align="block-end" className="px-4 sm:px-5">
              <InputGroupText>One practical limit per line.</InputGroupText>
            </InputGroupAddon>
          </InputGroup>
          <FieldError errors={toFieldErrorItems(errors?.constraints)} />
        </Field>
      </CollapsibleContent>
    </Collapsible>
  )
}
