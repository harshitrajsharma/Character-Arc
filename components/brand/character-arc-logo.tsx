import { cn } from "@/lib/utils"

type CharacterArcLogoProps = {
  className?: string
}

export function CharacterArcLogo({ className }: CharacterArcLogoProps) {
  return (
    <span
      className={cn(
        "inline-flex items-baseline text-sm text-muted-foreground",
        className
      )}
      aria-label="Character Arc"
    >
      <span aria-hidden="true">Ch. Arc</span>
    </span>
  )
}
