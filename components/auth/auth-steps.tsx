import { cn } from "@/lib/utils"

type AuthStepsProps = {
  current: number
  total: number
  className?: string
}

export function AuthSteps({ current, total, className }: AuthStepsProps) {
  const steps = Array.from({ length: total }, (_unused, index) => index + 1)

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <span
        className="text-xs font-medium text-muted-foreground"
        aria-hidden="true"
      >
        {current} / {total}
      </span>
      <ol className="flex flex-1 gap-1.5">
        {steps.map((step) => (
          <li
            key={step}
            className="flex-1"
            aria-current={step === current ? "step" : undefined}
          >
            <span className="sr-only">
              Step {step} of {total}
            </span>
            <span
              aria-hidden="true"
              className={cn(
                "block h-1 rounded-full",
                step <= current ? "bg-brand-neon" : "bg-border"
              )}
            />
          </li>
        ))}
      </ol>
    </div>
  )
}
