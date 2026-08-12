"use client"

import * as React from "react"
import { format } from "date-fns"
import {
  CalendarIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

type DatePickerView = "day" | "month" | "year"

type DatePickerProps = {
  id?: string
  value?: Date
  onValueChange: (date?: Date) => void
  placeholder?: string
  displayFormat?: string
  startMonth?: Date
  endMonth?: Date
  disabled?: boolean
  invalid?: boolean
  ariaDescribedBy?: string
  ariaLabelledBy?: string
  align?: "start" | "center" | "end"
  className?: string
  renderTrigger?: (date?: Date) => React.ReactNode
}

const monthIndexes = Array.from({ length: 12 }, (_, index) => index)
const DEFAULT_START_YEAR = 1900
const DEFAULT_END_YEAR = 9999
const YEAR_COLUMNS = 3
const YEAR_ROW_HEIGHT = 48
const YEAR_VIEWPORT_HEIGHT = 280
const YEAR_OVERSCAN_ROWS = 3

function createLocalDate(year: number, month: number, day = 1) {
  const date = new Date(0)
  date.setHours(0, 0, 0, 0)
  date.setFullYear(year, month, day)
  return date
}

function firstDayOfMonth(date: Date) {
  return createLocalDate(date.getFullYear(), date.getMonth())
}

function lastDayOfMonth(date: Date) {
  return createLocalDate(date.getFullYear(), date.getMonth() + 1, 0)
}

function monthValue(date: Date) {
  return date.getFullYear() * 12 + date.getMonth()
}

function clampMonth(date: Date, startMonth: Date, endMonth: Date) {
  if (monthValue(date) < monthValue(startMonth)) return startMonth
  if (monthValue(date) > monthValue(endMonth)) return endMonth
  return date
}

function DatePicker({
  id,
  value,
  onValueChange,
  placeholder = "Choose a date",
  displayFormat = "MMM d, yyyy",
  startMonth: startMonthProp,
  endMonth: endMonthProp,
  disabled = false,
  invalid = false,
  ariaDescribedBy,
  ariaLabelledBy,
  align = "start",
  className,
  renderTrigger,
}: DatePickerProps) {
  const today = new Date()
  const startMonth = firstDayOfMonth(
    startMonthProp ?? createLocalDate(DEFAULT_START_YEAR, 0)
  )
  const endMonth = firstDayOfMonth(
    endMonthProp ?? createLocalDate(DEFAULT_END_YEAR, 11)
  )
  const initialMonth = clampMonth(
    firstDayOfMonth(value ?? today),
    startMonth,
    endMonth
  )

  const [open, setOpen] = React.useState(false)
  const [view, setView] = React.useState<DatePickerView>("day")
  const [visibleMonth, setVisibleMonth] = React.useState(initialMonth)
  const [yearScrollTop, setYearScrollTop] = React.useState(0)
  const activeYearRef = React.useRef<HTMLButtonElement>(null)
  const yearViewportRef = React.useRef<HTMLDivElement>(null)

  const startYear = startMonth.getFullYear()
  const endYear = endMonth.getFullYear()
  const totalYearRows = Math.ceil((endYear - startYear + 1) / YEAR_COLUMNS)
  const firstVisibleYearRow = Math.max(
    0,
    Math.floor(yearScrollTop / YEAR_ROW_HEIGHT) - YEAR_OVERSCAN_ROWS
  )
  const visibleYearRowCount =
    Math.ceil(YEAR_VIEWPORT_HEIGHT / YEAR_ROW_HEIGHT) + YEAR_OVERSCAN_ROWS * 2
  const lastVisibleYearRow = Math.min(
    totalYearRows,
    firstVisibleYearRow + visibleYearRowCount
  )
  const visibleYearRows = Array.from(
    { length: lastVisibleYearRow - firstVisibleYearRow },
    (_, index) => firstVisibleYearRow + index
  )

  React.useEffect(() => {
    if (view !== "year") return
    const activeRow = Math.floor(
      (visibleMonth.getFullYear() - startYear) / YEAR_COLUMNS
    )
    const nextScrollTop = Math.max(
      0,
      activeRow * YEAR_ROW_HEIGHT - (YEAR_VIEWPORT_HEIGHT - YEAR_ROW_HEIGHT) / 2
    )
    if (yearViewportRef.current) {
      yearViewportRef.current.scrollTop = nextScrollTop
    }
    const frame = window.requestAnimationFrame(() => {
      setYearScrollTop(nextScrollTop)
      activeYearRef.current?.focus({ preventScroll: true })
    })
    return () => window.cancelAnimationFrame(frame)
  }, [startYear, view, visibleMonth])

  function changeVisibleMonth(nextMonth: Date) {
    setVisibleMonth(
      clampMonth(firstDayOfMonth(nextMonth), startMonth, endMonth)
    )
  }

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      setVisibleMonth(
        clampMonth(firstDayOfMonth(value ?? new Date()), startMonth, endMonth)
      )
      setView("day")
    }
    setOpen(nextOpen)
  }

  function selectDate(date?: Date) {
    onValueChange(date)
    if (date) setVisibleMonth(firstDayOfMonth(date))
    setOpen(false)
  }

  function selectMonth(month: number) {
    changeVisibleMonth(createLocalDate(visibleMonth.getFullYear(), month))
    setView("day")
  }

  function selectYear(year: number) {
    changeVisibleMonth(createLocalDate(year, visibleMonth.getMonth()))
    setView("month")
  }

  const previousMonth = createLocalDate(
    visibleMonth.getFullYear(),
    visibleMonth.getMonth() - 1
  )
  const nextMonth = createLocalDate(
    visibleMonth.getFullYear(),
    visibleMonth.getMonth() + 1
  )
  const canGoPrevious = monthValue(previousMonth) >= monthValue(startMonth)
  const canGoNext = monthValue(nextMonth) <= monthValue(endMonth)

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger
        disabled={disabled}
        render={
          <Button
            id={id}
            type="button"
            variant="outline"
            aria-invalid={invalid || undefined}
            aria-describedby={ariaDescribedBy}
            aria-labelledby={ariaLabelledBy}
            disabled={disabled}
            className={cn(
              "h-11 w-full justify-start gap-2 px-3 text-left font-normal sm:h-9",
              className
            )}
          />
        }
      >
        {renderTrigger ? (
          renderTrigger(value)
        ) : (
          <>
            <CalendarIcon
              data-icon="inline-start"
              className="text-muted-foreground"
            />
            <span
              className={cn(
                "flex-1 truncate text-sm",
                !value && "text-muted-foreground"
              )}
            >
              {value ? format(value, displayFormat) : placeholder}
            </span>
            <ChevronDownIcon
              data-icon="inline-end"
              className="text-muted-foreground opacity-50"
            />
          </>
        )}
      </PopoverTrigger>

      <PopoverContent
        align={align}
        className="w-[min(22rem,calc(100vw-2rem))] gap-0 rounded-2xl p-0"
      >
        {view === "day" && (
          <>
            <div className="flex h-12 items-center justify-between border-b border-border px-2">
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                disabled={!canGoPrevious}
                onClick={() => changeVisibleMonth(previousMonth)}
                aria-label="Previous month"
              >
                <ChevronLeftIcon />
              </Button>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setView("month")}
                  aria-label={`Choose month, currently ${format(visibleMonth, "MMMM")}`}
                >
                  {format(visibleMonth, "MMMM")}
                  <ChevronDownIcon data-icon="inline-end" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setView("year")}
                  aria-label={`Choose year, currently ${visibleMonth.getFullYear()}`}
                >
                  {visibleMonth.getFullYear()}
                  <ChevronDownIcon data-icon="inline-end" />
                </Button>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                disabled={!canGoNext}
                onClick={() => changeVisibleMonth(nextMonth)}
                aria-label="Next month"
              >
                <ChevronRightIcon />
              </Button>
            </div>
            <Calendar
              mode="single"
              selected={value}
              month={visibleMonth}
              onMonthChange={changeVisibleMonth}
              onSelect={selectDate}
              startMonth={startMonth}
              endMonth={endMonth}
              disabled={[
                { before: startMonth },
                { after: lastDayOfMonth(endMonth) },
              ]}
              hideNavigation
              fixedWeeks
              showOutsideDays
              autoFocus
              className="w-full p-3 [&_button[data-selected-single=true]]:bg-brand-neon [&_button[data-selected-single=true]]:text-brand-neon-foreground [&_button[data-selected-single=true]]:hover:bg-brand-neon"
              classNames={{
                root: "w-full",
                months: "w-full",
                month: "w-full",
                month_caption: "hidden",
              }}
            />
          </>
        )}

        {view === "month" && (
          <>
            <div className="flex h-12 items-center justify-between border-b border-border px-2">
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                disabled={
                  visibleMonth.getFullYear() <= startMonth.getFullYear()
                }
                onClick={() =>
                  changeVisibleMonth(
                    createLocalDate(
                      visibleMonth.getFullYear() - 1,
                      visibleMonth.getMonth()
                    )
                  )
                }
                aria-label="Previous year"
              >
                <ChevronLeftIcon />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setView("year")}
              >
                {visibleMonth.getFullYear()}
                <ChevronDownIcon data-icon="inline-end" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                disabled={visibleMonth.getFullYear() >= endMonth.getFullYear()}
                onClick={() =>
                  changeVisibleMonth(
                    createLocalDate(
                      visibleMonth.getFullYear() + 1,
                      visibleMonth.getMonth()
                    )
                  )
                }
                aria-label="Next year"
              >
                <ChevronRightIcon />
              </Button>
            </div>
            <div
              className="grid min-h-70 grid-cols-3 gap-2 p-3"
              role="grid"
              aria-label={`Choose a month in ${visibleMonth.getFullYear()}`}
            >
              {monthIndexes.map((month) => {
                const monthDate = createLocalDate(
                  visibleMonth.getFullYear(),
                  month
                )
                const unavailable =
                  monthValue(monthDate) < monthValue(startMonth) ||
                  monthValue(monthDate) > monthValue(endMonth)
                const active = month === visibleMonth.getMonth()

                return (
                  <Button
                    key={month}
                    type="button"
                    variant={active ? "default" : "ghost"}
                    disabled={unavailable}
                    aria-pressed={active}
                    onClick={() => selectMonth(month)}
                    className={cn(
                      "h-12 rounded-lg",
                      active &&
                        "bg-brand-neon text-brand-neon-foreground hover:bg-brand-neon/90"
                    )}
                  >
                    {format(monthDate, "MMM")}
                  </Button>
                )
              })}
            </div>
          </>
        )}

        {view === "year" && (
          <>
            <div className="flex h-12 items-center border-b border-border px-2">
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => setView("day")}
                aria-label="Back to calendar"
              >
                <ChevronLeftIcon />
              </Button>
              <p className="flex-1 pr-8 text-center text-sm font-medium">
                Choose year
              </p>
            </div>
            <ScrollArea
              className="h-70"
              aria-label={`Choose a year from ${startYear} to ${endYear}`}
              viewportRef={yearViewportRef}
              onViewportScroll={(event) =>
                setYearScrollTop(event.currentTarget.scrollTop)
              }
            >
              <div
                className="relative"
                style={{ height: totalYearRows * YEAR_ROW_HEIGHT + 24 }}
              >
                {visibleYearRows.map((row) => (
                  <div
                    key={row}
                    className="absolute inset-x-0 grid grid-cols-3 gap-2 px-3"
                    style={{ top: row * YEAR_ROW_HEIGHT + 12 }}
                  >
                    {Array.from({ length: YEAR_COLUMNS }, (_, column) => {
                      const year = startYear + row * YEAR_COLUMNS + column
                      if (year > endYear) return null

                      const active = year === visibleMonth.getFullYear()
                      return (
                        <Button
                          key={year}
                          ref={active ? activeYearRef : undefined}
                          type="button"
                          variant={active ? "default" : "ghost"}
                          aria-pressed={active}
                          onClick={() => selectYear(year)}
                          className={cn(
                            "h-10 rounded-lg",
                            active &&
                              "bg-brand-neon text-brand-neon-foreground hover:bg-brand-neon/90"
                          )}
                        >
                          {year}
                        </Button>
                      )
                    })}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </>
        )}

        <div className="flex items-center justify-between border-t border-border bg-muted/20 p-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={!value}
            onClick={() => selectDate(undefined)}
          >
            Clear date
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={
              monthValue(today) < monthValue(startMonth) ||
              monthValue(today) > monthValue(endMonth)
            }
            onClick={() => selectDate(today)}
          >
            Today
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}

export { DatePicker }
export type { DatePickerProps }
