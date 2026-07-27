"use client"

import { useState, type MouseEvent } from "react"
import { format } from "date-fns"
import { CalendarIcon, ChevronDownIcon, XIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { formatIsoLocalDate, parseIsoLocalDate } from "@/lib/dates/local-date"
import { cn } from "@/lib/utils"

interface ExamDatePickerProps {
  id: string
  name: string
  defaultValue?: string
  className?: string
  hasError?: boolean
  ariaDescribedBy?: string
}

export function ExamDatePicker({
  id,
  name,
  defaultValue = "",
  className,
  hasError = false,
  ariaDescribedBy,
}: ExamDatePickerProps) {
  const [open, setOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(() =>
    parseIsoLocalDate(defaultValue)
  )

  const handleSelectDate = (date?: Date) => {
    setSelectedDate(date)
    setOpen(false)
  }

  const handleClearDate = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    setSelectedDate(undefined)
  }

  const formattedValue = selectedDate ? formatIsoLocalDate(selectedDate) : ""

  return (
    <div className="flex w-full items-center gap-2">
      <input id={`${id}-value`} type="hidden" name={name} value={formattedValue} />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <Button
              id={id}
              type="button"
              variant="outline"
              aria-invalid={hasError || undefined}
              aria-describedby={ariaDescribedBy}
              className={cn(
                "h-11 w-full justify-start gap-2 px-3 text-left font-normal sm:h-9",
                "focus-visible:border-brand-violet-line focus-visible:ring-brand-violet-line/30",
                className
              )}
            />
          }
        >
          <CalendarIcon data-icon="inline-start" className="text-muted-foreground" />
          <span className="flex-1 truncate text-sm">
            {selectedDate ? (
              <span className="text-foreground">{format(selectedDate, "PPP")}</span>
            ) : (
              <span className="text-muted-foreground">Choose a target date</span>
            )}
          </span>
          <ChevronDownIcon data-icon="inline-end" className="shrink-0 text-muted-foreground opacity-50" />
        </PopoverTrigger>

        <PopoverContent align="start" className="w-auto gap-0 rounded-2xl p-0">
          <Calendar
            mode="single"
            selected={selectedDate}
            defaultMonth={selectedDate ?? new Date()}
            onSelect={handleSelectDate}
            fixedWeeks
            showOutsideDays
            autoFocus
            className="[&_button[data-selected-single=true]]:bg-brand-violet [&_button[data-selected-single=true]]:text-brand-violet-foreground [&_button[data-selected-single=true]]:hover:bg-brand-violet"
          />
          <div className="flex items-center justify-between border-t border-border p-2 bg-muted/20">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={!selectedDate}
              onClick={() => {
                setSelectedDate(undefined)
                setOpen(false)
              }}
              className="text-xs focus-visible:border-brand-violet-line focus-visible:ring-brand-violet-line/30"
            >
              Clear date
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => handleSelectDate(new Date())}
              className="text-xs focus-visible:border-brand-violet-line focus-visible:ring-brand-violet-line/30"
            >
              Today
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      {selectedDate && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={handleClearDate}
          aria-label="Clear target date"
          className="size-11 shrink-0 text-muted-foreground hover:text-foreground focus-visible:border-brand-violet-line focus-visible:ring-brand-violet-line/30 sm:size-9"
        >
          <XIcon />
        </Button>
      )}
    </div>
  )
}
