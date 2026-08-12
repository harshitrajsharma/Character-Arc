import { Card } from "@/components/ui/card"
import { Info, BookOpen, Target, TrendingUp } from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { surfaceVariants } from "@/lib/tools/exam-prep/design-system"

interface StatsCardProps {
  title: string
  value: number | string
  total?: number
  tooltipText: string
  suffix?: string
  badge?: {
    value: number
    icon: React.ReactNode
    tooltipText: string
  }
  className?: string
}

export function StatsCard({
  title,
  value,
  total,
  tooltipText,
  suffix = "",
  badge,
  className,
}: StatsCardProps) {
  // Determine icon based on title
  const getIcon = () => {
    if (title.toLowerCase().includes("subject"))
      return <BookOpen className="h-4 w-4" />
    if (title.toLowerCase().includes("mark"))
      return <Target className="h-4 w-4" />
    return <TrendingUp className="h-4 w-4" />
  }

  // Determine color theme based on title
  const getTheme = () => {
    if (title.toLowerCase().includes("subject")) {
      return {
        iconBg: "bg-blue-500/10",
        iconColor: "text-blue-500",
        textColor: "text-blue-500",
        badgeBg: "bg-blue-500/10",
        badgeText: "text-blue-500",
        badgeBorder: "border-blue-500/20",
      }
    }
    if (title.toLowerCase().includes("mark")) {
      return {
        iconBg: "bg-emerald-500/10",
        iconColor: "text-emerald-500",
        textColor: "text-emerald-500",
        badgeBg: "bg-emerald-500/10",
        badgeText: "text-emerald-500",
        badgeBorder: "border-emerald-500/20",
      }
    }
    return {
      iconBg: "bg-primary/10",
      iconColor: "text-primary",
      textColor: "text-primary",
      badgeBg: "bg-primary/5",
      badgeText: "text-primary",
      badgeBorder: "border-primary/10",
    }
  }

  const theme = getTheme()

  return (
    <Card
      className={cn(
        surfaceVariants({ variant: "default", padding: "sm" }),
        "relative bg-card/50 backdrop-blur-sm md:p-4",
        "transition-all duration-300 hover:border-primary/20 hover:shadow-md",
        className
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 md:gap-2">
          <div
            className={cn(
              "rounded-lg p-1.5 transition-colors",
              theme.iconBg,
              theme.iconColor
            )}
          >
            {getIcon()}
          </div>
          <h2 className="md:text-md bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-sm font-semibold text-transparent">
            {title}
          </h2>
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <Info className="h-4 w-4 text-muted-foreground/70 transition-colors hover:text-foreground" />
            </TooltipTrigger>
            <TooltipContent>
              <p>{tooltipText}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <div className="flex flex-col gap-0.5">
        <div className="mt-1 ml-6 flex items-baseline gap-1 md:mt-0">
          <span
            className={cn(
              "text-xl font-bold tracking-tight transition-colors sm:text-2xl md:text-3xl",
              theme.textColor
            )}
          >
            {value}
          </span>
          {total !== undefined ? (
            <span className="text-sm font-medium text-muted-foreground/60 md:text-base">
              / {total}
            </span>
          ) : null}
        </div>
        <span className="ml-6 text-[10px] font-medium text-muted-foreground md:text-sm">
          {suffix}
        </span>
      </div>

      {badge && (
        <div className="absolute right-4 bottom-4">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Badge
                  variant="secondary"
                  className={cn(
                    "flex items-center gap-1 px-2 py-0.5 text-[10px] transition-colors",
                    theme.badgeBg,
                    theme.badgeText,
                    theme.badgeBorder
                  )}
                >
                  {badge.icon}
                  <span className="font-semibold">{badge.value}</span>
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p>{badge.tooltipText}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      )}
    </Card>
  )
}
