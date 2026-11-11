"use client"
import { useId } from "react"
import { Field, FieldLabel } from "@/components/ui/field"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectGroup,
  SelectItem,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
export function FilterSelectField({
  id: providedId,
  label,
  value,
  items,
  onChange,
  disabled = false,
  density = "comfortable",
}: {
  id?: string
  label: string
  value: string
  items: { value: string; label: string }[]
  onChange: (value: string) => void
  disabled?: boolean
  density?: "comfortable" | "compact"
}) {
  const generatedId = useId(),
    id = providedId ?? generatedId
  return (
    <Field data-disabled={disabled} className="min-w-0 gap-1.5">
      <FieldLabel htmlFor={id} className="text-xs text-muted-foreground">
        {label}
      </FieldLabel>
      <Select
        items={items}
        value={value}
        disabled={disabled}
        onValueChange={(next) => {
          if (next !== null) onChange(next)
        }}
      >
        <SelectTrigger
          id={id}
          className={cn(
            "h-11! w-full min-w-0 rounded-lg",
            density === "compact" && "sm:h-9!"
          )}
        >
          <SelectValue className="min-w-0 truncate" />
        </SelectTrigger>
        <SelectContent alignItemWithTrigger={false}>
          <SelectGroup>
            {items.map((item) => (
              <SelectItem
                key={item.value}
                value={item.value}
                className={cn(
                  "min-h-11",
                  density === "compact" && "sm:min-h-0"
                )}
              >
                {item.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </Field>
  )
}
