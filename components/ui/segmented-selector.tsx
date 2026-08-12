"use client"

import type { LucideIcon } from "lucide-react"

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { cn } from "@/lib/utils"

export type SegmentedSelectorOption<Value extends string> = {
  value: Value
  label: string
  icon?: LucideIcon
  disabled?: boolean
  activeClassName?: string
}

type SegmentedSelectorProps<Value extends string> = {
  value: Value
  options: readonly SegmentedSelectorOption<Value>[]
  onValueChange: (value: Value) => void
  ariaLabel: string
  className?: string
  itemClassName?: string
  collapsedLabelsOnMobile?: boolean
}

export function SegmentedSelector<Value extends string>({
  value,
  options,
  onValueChange,
  ariaLabel,
  className,
  itemClassName,
  collapsedLabelsOnMobile = false,
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
      className={cn(
        "w-full max-w-full scrollbar-none overflow-x-auto [-ms-overflow-style:none] sm:w-fit [&::-webkit-scrollbar]:hidden",
        className
      )}
    >
      {options.map((option) => {
        const Icon = option.icon
        const isSelected = option.value === value

        return (
          <ToggleGroupItem
            key={option.value}
            value={option.value}
            disabled={option.disabled}
            aria-label={option.label}
            className={cn(
              "justify-center transition-all sm:flex-none",
              collapsedLabelsOnMobile
                ? isSelected
                  ? "max-sm:flex-1"
                  : "max-sm:w-14 max-sm:flex-none"
                : "max-sm:flex-1",
              isSelected && option.activeClassName,
              itemClassName
            )}
          >
            {Icon ? (
              <Icon
                data-icon="inline-start"
                aria-hidden="true"
                className={cn(
                  "shrink-0",
                  collapsedLabelsOnMobile && !isSelected && "max-sm:mr-0"
                )}
              />
            ) : null}
            <span
              className={cn(
                collapsedLabelsOnMobile && Icon && !isSelected
                  ? "hidden sm:inline"
                  : ""
              )}
            >
              {option.label}
            </span>
          </ToggleGroupItem>
        )
      })}
    </ToggleGroup>
  )
}
