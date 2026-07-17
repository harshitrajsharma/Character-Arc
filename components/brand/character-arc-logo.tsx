import { cn } from "@/lib/utils"

type CharacterArcLogoProps = {
  className?: string
}

export function CharacterArcLogo({ className }: CharacterArcLogoProps) {
  return (
    <span
      className={cn(
        "inline-flex items-baseline text-xs text-muted-foreground sm:text-sm",
        className
      )}
      aria-label="Character Arc"
    >
      <span aria-hidden="true">Ch. Arc</span>
    </span>
  )
}
