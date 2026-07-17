import { CircleAlertIcon, CircleCheckIcon } from "lucide-react"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { cn } from "@/lib/utils"

export function AuthFeedback({
  error,
  notice,
  className,
}: {
  error?: string
  notice?: string
  className?: string
}) {
  if (!error && !notice) {
    return null
  }

  return (
    <Alert
      variant={error ? "destructive" : "default"}
      className={cn(
        "rounded-lg border-border bg-brand-neon-soft text-foreground *:data-[slot=alert-description]:text-muted-foreground",
        error &&
          "text-destructive *:data-[slot=alert-description]:text-destructive/90",
        className
      )}
    >
      {error ? <CircleAlertIcon /> : <CircleCheckIcon />}
      <AlertDescription>{error ?? notice}</AlertDescription>
    </Alert>
  )
}
