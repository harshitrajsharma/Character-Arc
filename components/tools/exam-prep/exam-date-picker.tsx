"use client"

import { useState } from "react"

import { DatePicker } from "@/components/ui/date-picker"
import { formatIsoLocalDate, parseIsoLocalDate } from "@/lib/dates/local-date"

interface ExamDatePickerProps {
  id: string
  name: string
  defaultValue?: string
  placeholder?: string
  className?: string
  hasError?: boolean
  ariaDescribedBy?: string
}

export function ExamDatePicker({
  id,
  name,
  defaultValue = "",
  placeholder = "Choose an expected date",
  className,
  hasError = false,
  ariaDescribedBy,
}: ExamDatePickerProps) {
  return (
    <ExamDatePickerInput
      key={defaultValue}
      id={id}
      name={name}
      defaultValue={defaultValue}
      placeholder={placeholder}
      className={className}
      hasError={hasError}
      ariaDescribedBy={ariaDescribedBy}
    />
  )
}

function ExamDatePickerInput({
  id,
  name,
  defaultValue = "",
  placeholder = "Choose an expected date",
  className,
  hasError = false,
  ariaDescribedBy,
}: ExamDatePickerProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(() =>
    parseIsoLocalDate(defaultValue)
  )

  const formattedValue = selectedDate ? formatIsoLocalDate(selectedDate) : ""

  return (
    <div className="w-full min-w-0">
      <input
        id={`${id}-value`}
        type="hidden"
        name={name}
        value={formattedValue}
      />
      <DatePicker
        id={id}
        value={selectedDate}
        onValueChange={setSelectedDate}
        invalid={hasError}
        ariaDescribedBy={ariaDescribedBy}
        placeholder={placeholder}
        className={className}
      />
    </div>
  )
}
