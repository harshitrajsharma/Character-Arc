import { cn } from "@/lib/utils"
import { Category, CATEGORIES } from "@/types/progressapp/progress"
import { motion } from "framer-motion"
import { meterTrackVariants } from "@/lib/tools/exam-prep/design-system"

interface ProgressIndicatorProps {
  label: string
  value: number
  category: Category
  size?: "sm" | "md"
}

export function ProgressIndicator({
  label,
  value,
  category,
  size = "sm",
}: ProgressIndicatorProps) {
  const config = CATEGORIES[category]

  // Dynamic color logic for 'overall' category
  const getOverallColor = (val: number) => {
    if (val <= 25) return { text: "text-red-500", bg: "bg-red-500" }
    if (val <= 50) return { text: "text-amber-500", bg: "bg-amber-500" }
    if (val <= 75) return { text: "text-purple-500", bg: "bg-purple-500" }
    return {
      text: "text-slate-700 dark:text-white",
      bg: "bg-slate-700 dark:bg-white",
    }
  }

  const dynamicColor = category === "overall" ? getOverallColor(value) : null

  // Use dynamic color if applicable, otherwise use config color
  const textColor = dynamicColor ? dynamicColor.text : config.color
  const progressColor = dynamicColor ? dynamicColor.bg : config.progressColor

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className={cn("font-medium", textColor)}>{label}</span>
        <span className={cn("font-bold", textColor)}>{Math.round(value)}%</span>
      </div>

      <div
        className={meterTrackVariants({ size: size === "sm" ? "lg" : "xl" })}
      >
        {/* Tick marks */}
        <div className="pointer-events-none absolute inset-0 z-10 flex justify-between px-[25%]">
          <div className="h-full w-px bg-black/10 dark:bg-white/10" />
          <div className="h-full w-px bg-black/10 dark:bg-white/10" />
          <div className="h-full w-px bg-black/10 dark:bg-white/10" />
        </div>

        <motion.div
          className={cn(
            "relative h-full overflow-hidden rounded-full shadow-sm",
            progressColor
          )}
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          {/* Shimmer effect */}
          <div
            className="animate-shimmer absolute inset-0 -skew-x-12 bg-gradient-to-r from-transparent via-white/20 to-transparent"
            style={{ backgroundSize: "200% 100%" }}
          />
          {/* Subtle overlay for depth */}
          <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent" />
        </motion.div>
      </div>
    </div>
  )
}
