import * as React from "react"

import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

export const authInputClassName =
  "h-11 rounded-lg border-border px-4 text-base text-foreground shadow-none placeholder:text-muted-foreground focus-visible:border-brand-neon focus-visible:ring-brand-neon-line md:text-sm"

export function AuthInput({
  className,
  ...props
}: React.ComponentProps<typeof Input>) {
  return <Input className={cn(authInputClassName, className)} {...props} />
}
