"use client"

import { format } from "date-fns"
import { CalendarDaysIcon, ChevronDownIcon } from "lucide-react"

import { DatePicker } from "@/components/ui/date-picker"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { formatIsoLocalDate, parseIsoLocalDate } from "@/lib/dates/local-date"
import { toFieldErrorItems } from "@/lib/forms/field-errors"
import { cn } from "@/lib/utils"

type DatePickerFieldProps = {
  id: string
  name: string
  label: string
  value: string
  onChange: (value: string) => void
  errors?: readonly string[]
  placeholder?: string
  className?: string
}

export function DatePickerField({
  id,
  name,
  label,
  value,
  onChange,
  errors,
  placeholder = "No date selected",
  className,
}: DatePickerFieldProps) {
  const selectedDate = parseIsoLocalDate(value)
  const invalid = Boolean(errors?.length)

  function selectDate(date?: Date) {
    onChange(date ? formatIsoLocalDate(date) : "")
  }

  return (
    <Field data-invalid={invalid}>
      <FieldLabel id={`${id}-label`} htmlFor={id} className="sr-only">
        {label}
      </FieldLabel>
      <input id={id} type="hidden" name={name} value={value} />

      <DatePicker
        id={`${id}-trigger`}
        value={selectedDate}
        onValueChange={selectDate}
        invalid={invalid}
        ariaLabelledBy={`${id}-label ${id}-value`}
        align="end"
        className={cn(
          "h-12 rounded-lg px-4 font-normal sm:h-12 sm:px-5",
          className
        )}
        renderTrigger={(date) => (
          <>
            <CalendarDaysIcon
              className="text-brand-amber-ink"
              aria-hidden="true"
            />
            <span className="font-medium text-foreground">{label}</span>
            <span
              id={`${id}-value`}
              className={cn(
                "ml-auto min-w-0 truncate text-right text-muted-foreground",
                date && "text-foreground"
              )}
            >
              {date ? format(date, "PPP") : placeholder}
            </span>
            <ChevronDownIcon
              className="ml-1 text-muted-foreground"
              aria-hidden="true"
            />
          </>
        )}
      />

      <FieldError errors={toFieldErrorItems(errors)} />
    </Field>
  )
}
