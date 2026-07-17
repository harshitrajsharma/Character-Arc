"use client"

import { useState } from "react"
import { format } from "date-fns"
import { CalendarDaysIcon, ChevronDownIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
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
  const [open, setOpen] = useState(false)
  const selectedDate = parseIsoLocalDate(value)
  const invalid = Boolean(errors?.length)

  function selectDate(date?: Date) {
    if (!date) {
      return
    }

    onChange(formatIsoLocalDate(date))
    setOpen(false)
  }

  return (
    <Field data-invalid={invalid}>
      <FieldLabel id={`${id}-label`} htmlFor={id} className="sr-only">
        {label}
      </FieldLabel>
      <input id={id} type="hidden" name={name} value={value} />

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <Button
              type="button"
              variant="outline"
              aria-labelledby={`${id}-label ${id}-value`}
              aria-invalid={invalid || undefined}
              className={cn(
                "h-12 w-full justify-start gap-2 rounded-lg px-4 font-normal sm:px-5",
                className
              )}
            />
          }
        >
          <CalendarDaysIcon
            className="text-brand-amber-ink"
            aria-hidden="true"
          />
          <span className="font-medium text-foreground">{label}</span>
          <span
            id={`${id}-value`}
            className={cn(
              "ml-auto min-w-0 truncate text-right text-muted-foreground",
              selectedDate && "text-foreground"
            )}
          >
            {selectedDate ? format(selectedDate, "PPP") : placeholder}
          </span>
          <ChevronDownIcon
            className="ml-1 text-muted-foreground"
            aria-hidden="true"
          />
        </PopoverTrigger>

        <PopoverContent align="end" className="w-auto gap-0 rounded-lg p-0">
          <Calendar
            mode="single"
            selected={selectedDate}
            defaultMonth={selectedDate}
            onSelect={selectDate}
            fixedWeeks
            showOutsideDays
            autoFocus
          />
          <div className="flex items-center justify-between border-t border-border p-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={!selectedDate}
              onClick={() => {
                onChange("")
                setOpen(false)
              }}
            >
              Clear date
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => selectDate(new Date())}
            >
              Today
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      <FieldError errors={toFieldErrorItems(errors)} />
    </Field>
  )
}
