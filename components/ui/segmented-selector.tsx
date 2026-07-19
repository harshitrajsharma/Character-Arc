"use client"

import type { LucideIcon } from "lucide-react"

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { cn } from "@/lib/utils"

export type SegmentedSelectorOption<Value extends string> = {
  value: Value
  label: string
  icon?: LucideIcon
  activeClassName?: string
}

type SegmentedSelectorProps<Value extends string> = {
  value: Value
  options: readonly SegmentedSelectorOption<Value>[]
  onValueChange: (value: Value) => void
  ariaLabel: string
  className?: string
  itemClassName?: string
}

export function SegmentedSelector<Value extends string>({
  value,
  options,
  onValueChange,
  ariaLabel,
  className,
  itemClassName,
}: SegmentedSelectorProps<Value>) {
  return (
    <ToggleGroup
      value={[value]}
      onValueChange={(selectedValues) => {
        const nextValue = selectedValues[0] as Value | undefined
        if (nextValue) onValueChange(nextValue)
      }}
      variant="outline"
      spacing={0}
      aria-label={ariaLabel}
      className={cn("w-full max-w-full overflow-x-auto sm:w-fit", className)}
    >
      {options.map((option) => {
        const Icon = option.icon

        return (
          <ToggleGroupItem
            key={option.value}
            value={option.value}
            aria-label={option.label}
            className={cn(
              "flex-1 justify-center sm:flex-none",
              option.activeClassName,
              itemClassName
            )}
          >
            {Icon ? <Icon data-icon="inline-start" aria-hidden="true" /> : null}
            {option.label}
          </ToggleGroupItem>
        )
      })}
    </ToggleGroup>
  )
}
