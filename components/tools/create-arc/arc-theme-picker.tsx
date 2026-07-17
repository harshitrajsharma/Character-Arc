import { ChevronDownIcon, ShuffleIcon } from "lucide-react"
import { motion, useReducedMotion } from "motion/react"

import {
  ARC_THEMES,
  getArcTheme,
  type ArcThemeKey,
} from "@/components/tools/create-arc/arc-themes"
import { buttonVariants } from "@/components/ui/button"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { FieldLegend, FieldSet } from "@/components/ui/field"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

type ArcThemePickerProps = {
  value: ArcThemeKey
  onChange: (theme: ArcThemeKey) => void
}

type ArcThemeChoicesProps = ArcThemePickerProps & {
  className?: string
  indicatorId: string
}

function ArcThemeChoices({
  value,
  onChange,
  className,
  indicatorId,
}: ArcThemeChoicesProps) {
  const reduceMotion = useReducedMotion()

  return (
    <ToggleGroup
      value={[value]}
      onValueChange={(nextValue) => {
        const selectedTheme = nextValue[0] as ArcThemeKey | undefined
        if (selectedTheme) {
          onChange(selectedTheme)
        }
      }}
      aria-label="Canvas theme"
      className={className}
    >
      {ARC_THEMES.map((theme) => {
        const selected = theme.key === value

        return (
          <ToggleGroupItem
            key={theme.key}
            value={theme.key}
            aria-label={theme.label}
            className="group relative h-auto min-w-0 flex-col gap-2 rounded-md bg-transparent p-1 hover:bg-transparent data-[state=on]:bg-transparent"
          >
            <span
              className={cn(
                "relative block aspect-[4/3] w-full overflow-hidden rounded-md border shadow-xs transition-transform duration-150 group-hover:-translate-y-0.5",
                theme.swatchClass,
                selected ? "border-foreground" : "border-border"
              )}
            >
              <span
                className={cn(
                  "absolute top-2 bottom-2 left-2 w-2 rounded-sm",
                  theme.swatchAccentClass
                )}
              />
              <span className="absolute top-2 right-2 left-6 h-1 rounded-full bg-muted-foreground/25" />
              <span className="absolute top-5 right-4 left-6 h-1 rounded-full bg-muted-foreground/15" />
              {selected ? (
                <motion.span
                  layoutId={`selected-arc-theme-${indicatorId}`}
                  className="absolute inset-0 rounded-md ring-2 ring-foreground ring-offset-2 ring-offset-background"
                  transition={{
                    duration: reduceMotion ? 0 : 0.18,
                    ease: "easeOut",
                  }}
                />
              ) : null}
            </span>
            <span
              className={cn(
                "truncate text-xs",
                selected
                  ? "font-medium text-foreground"
                  : "text-muted-foreground"
              )}
            >
              {theme.label}
            </span>
          </ToggleGroupItem>
        )
      })}
    </ToggleGroup>
  )
}

function ThemeShuffleButton({
  onClick,
  size = "icon-sm",
}: {
  onClick: () => void
  size?: "icon-sm" | "icon-lg"
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type="button"
            aria-label="Choose another theme"
            onClick={onClick}
            className={buttonVariants({
              variant: "secondary",
              size,
            })}
          />
        }
      >
        <ShuffleIcon aria-hidden="true" />
      </TooltipTrigger>
      <TooltipContent>Choose another theme</TooltipContent>
    </Tooltip>
  )
}

export function ArcThemePicker({ value, onChange }: ArcThemePickerProps) {
  const selectedTheme = getArcTheme(value)

  function chooseAnotherTheme() {
    const currentIndex = ARC_THEMES.findIndex((theme) => theme.key === value)
    const offset = 1 + Math.floor(Math.random() * (ARC_THEMES.length - 1))
    const nextTheme = ARC_THEMES[(currentIndex + offset) % ARC_THEMES.length]
    onChange(nextTheme.key)
  }

  return (
    <>
      <FieldSet className="gap-0 sm:hidden">
        <FieldLegend className="sr-only">Canvas theme</FieldLegend>
        <Collapsible>
          <div className="flex items-center gap-2">
            <CollapsibleTrigger className="group flex h-11 min-w-0 flex-1 items-center gap-3 rounded-lg border border-foreground/10 bg-foreground/[0.045] px-3 text-left transition-colors outline-none hover:bg-foreground/[0.065] focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30">
              <span
                className={cn(
                  "relative size-7 shrink-0 overflow-hidden rounded-md border border-foreground/10",
                  selectedTheme.swatchClass
                )}
              >
                <span
                  className={cn(
                    "absolute inset-y-1 left-1 w-1 rounded-sm",
                    selectedTheme.swatchAccentClass
                  )}
                />
              </span>
              <span className="min-w-0 flex-1 truncate text-sm font-medium">
                Canvas theme
              </span>
              <span className="truncate text-sm text-muted-foreground">
                {selectedTheme.label}
              </span>
              <ChevronDownIcon
                className="size-4 shrink-0 text-muted-foreground transition-transform group-aria-expanded:rotate-180"
                aria-hidden="true"
              />
            </CollapsibleTrigger>
            <ThemeShuffleButton onClick={chooseAnotherTheme} size="icon-lg" />
          </div>

          <CollapsibleContent className="pt-3 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0">
            <ArcThemeChoices
              value={value}
              onChange={onChange}
              indicatorId="mobile"
              className="grid w-full auto-cols-[4.75rem] grid-flow-col gap-2 overflow-x-auto px-1 pt-1 pb-2"
            />
          </CollapsibleContent>
        </Collapsible>
      </FieldSet>

      <FieldSet className="hidden gap-3 sm:flex">
        <div className="flex items-center justify-between gap-3">
          <FieldLegend className="mb-0">Canvas theme</FieldLegend>
          <ThemeShuffleButton onClick={chooseAnotherTheme} />
        </div>
        <ArcThemeChoices
          value={value}
          onChange={onChange}
          indicatorId="desktop"
          className="grid w-full grid-cols-5 gap-2"
        />
      </FieldSet>
    </>
  )
}
