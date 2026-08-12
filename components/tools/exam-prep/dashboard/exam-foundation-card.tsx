import React, { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Sparkles,
  TrendingUp,
  Target,
  BookOpen,
  Star,
  Trophy,
  Brain,
  Rocket,
  GraduationCap,
  ChevronUp,
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  iconFrameVariants,
  meterTrackVariants,
  metricTileVariants,
  progressModeTokens,
} from "@/lib/tools/exam-prep/design-system"

interface Level {
  level: number
  title: string
  description: string
  requirements: Record<string, number>
}

interface ExamResult {
  currentLevel: Level
  nextLevel: Level | null
  progressToNextLevel: number
  strengths: string[]
  areasToImprove: string[]
  overallProgress: number
}

interface ExamFoundationCardProps {
  result: ExamResult
  examName: string
  className?: string
}

type StatType = "learning" | "revision" | "practice" | "test"

const getLevelColor = (level: number): string => {
  if (level <= 2) return "text-red-600"
  if (level <= 4) return "text-orange-600"
  if (level <= 6) return "text-yellow-600"
  if (level <= 8) return "text-emerald-600"
  return "text-purple-600"
}

const getLevelBgColor = (level: number): string => {
  if (level <= 2)
    return "bg-gradient-to-r from-red-600/40 via-red-600/20 dark:from-red-600/20 dark:via-red-600/10 to-transparent"
  if (level <= 4)
    return "bg-gradient-to-r from-orange-600/40 via-orange-600/20 dark:from-orange-600/20 dark:via-orange-600/10 to-transparent"
  if (level <= 6)
    return "bg-gradient-to-r from-yellow-600/40 via-yellow-600/20 dark:from-yellow-600/20 dark:via-yellow-600/10 to-transparent"
  if (level <= 8)
    return "bg-gradient-to-r from-emerald-600/40 via-emerald-600/20 dark:from-emerald-600/20 dark:via-emerald-600/10 to-transparent"
  return "bg-gradient-to-r from-purple-600/20 via-purple-600/10 to-transparent"
}

const getLevelBorderColor = (level: number): string => {
  if (level <= 2) return "border-red-600/20"
  if (level <= 4) return "border-orange-600/20"
  if (level <= 6) return "border-yellow-600/20"
  if (level <= 8) return "border-emerald-600/20"
  return "border-purple-600/20"
}

const LEVEL_ICONS: Record<number, React.ElementType> = {
  1: Brain,
  2: Brain,
  3: Star,
  4: Star,
  5: Rocket,
  6: Rocket,
  7: GraduationCap,
  8: GraduationCap,
  9: Trophy,
  10: Trophy,
}

const getStatMode = (statType: string): StatType | null => {
  return statType === "learning" ||
    statType === "revision" ||
    statType === "practice" ||
    statType === "test"
    ? statType
    : null
}

export function ExamFoundationCard({
  result,
  examName,
  className,
}: ExamFoundationCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [currentProgress, setCurrentProgress] = useState(0)
  const [nextLevelProgress, setNextLevelProgress] = useState(0)
  const {
    currentLevel,
    nextLevel,
    progressToNextLevel,
    strengths,
    areasToImprove,
    overallProgress,
  } = result
  const levelColor = getLevelColor(currentLevel.level)
  const levelBgColor = getLevelBgColor(currentLevel.level)
  const levelBorderColor = getLevelBorderColor(currentLevel.level)
  const LevelIcon = LEVEL_ICONS[currentLevel.level] ?? Trophy

  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentProgress(overallProgress)
      setNextLevelProgress(progressToNextLevel)
    }, 100)
    return () => clearTimeout(timer)
  }, [overallProgress, progressToNextLevel])

  return (
    <Card
      className={cn(
        "group relative col-span-4 overflow-hidden shadow-lg",
        className
      )}
    >
      {/* Glassmorphism Background Effects */}
      <div className="absolute inset-0 z-0 bg-gradient-to-br from-background/90 via-background/80 to-background/70 backdrop-blur-xl backdrop-saturate-150" />
      <div className="absolute inset-0 z-0 bg-gradient-to-br from-background/20 to-background/10" />
      <div
        className={cn(
          "absolute inset-0 z-0 opacity-15 transition-opacity duration-500 group-hover:opacity-25",
          levelBgColor
        )}
      />

      {/* Animated Border Effect */}
      <div className="absolute inset-0 z-0 rounded-lg border border-white/10 backdrop-blur-3xl" />

      {/* Content Container */}
      <div className="relative z-10">
        <CardHeader className="pb-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start"
          >
            <div className="space-y-1.5">
              <CardTitle className="flex items-center gap-2.5 text-base font-bold sm:gap-3 sm:text-2xl">
                <div
                  className={cn(
                    iconFrameVariants({ variant: "glass", size: "lg" }),
                    levelColor
                  )}
                >
                  <Target className="h-4 w-4 sm:h-6 sm:w-6" />
                </div>
                <span className="bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                  Foundation Level
                </span>
              </CardTitle>
              <CardDescription className="pl-1 text-xs text-muted-foreground/90 sm:text-sm">
                Your current preparation level for {examName}
              </CardDescription>
            </div>

            <motion.div
              layout
              className="flex flex-col items-start gap-2 sm:items-end"
            >
              <Badge
                variant="outline"
                className={cn(
                  "flex items-center gap-2 px-3 py-1 text-sm font-bold shadow-sm backdrop-blur-md sm:px-4 sm:py-1.5 sm:text-lg",
                  levelColor,
                  levelBorderColor,
                  "bg-background/40"
                )}
              >
                <LevelIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                Level {currentLevel.level}
              </Badge>
              <span className="text-xs font-medium text-muted-foreground sm:text-sm">
                {Math.round(overallProgress)}% Complete
              </span>
            </motion.div>
          </motion.div>
        </CardHeader>

        <CardContent className="space-y-6">
          <motion.div
            layout
            className={cn(
              "relative overflow-hidden rounded-xl border p-4 shadow-sm backdrop-blur-lg",
              levelBgColor,
              levelBorderColor
            )}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-white/5 to-transparent opacity-50" />
            <div className="relative z-10 space-y-2">
              <div className="flex items-center gap-2">
                <h3
                  className={cn(
                    "text-base font-bold tracking-tight sm:text-xl",
                    levelColor
                  )}
                >
                  {currentLevel.title}
                </h3>
                {currentLevel.level === 10 && (
                  <motion.div
                    animate={{ rotate: [0, 10, -10, 0] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                  >
                    <Sparkles className="h-4 w-4 text-purple-600 sm:h-5 sm:w-5" />
                  </motion.div>
                )}
              </div>
              <p className="text-xs leading-relaxed font-medium text-muted-foreground/90 sm:text-sm">
                {currentLevel.description}
              </p>
            </div>
          </motion.div>

          <motion.div layout className="space-y-6">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="group/btn flex w-full items-center justify-between text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground sm:text-sm"
            >
              <span className="flex items-center gap-2">
                Detailed Progress
                <div className="h-px w-12 bg-border transition-all group-hover/btn:w-20" />
              </span>
              <motion.div
                animate={{ rotate: isExpanded ? 0 : 180 }}
                transition={{ duration: 0.2 }}
                className="rounded-full p-1 hover:bg-muted/50"
              >
                <ChevronUp className="h-4 w-4" />
              </motion.div>
            </button>

            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-8 overflow-hidden pt-2"
                >
                  <div className="space-y-5">
                    <h4 className="flex items-center gap-2 text-base font-semibold text-foreground/90">
                      <TrendingUp className={cn("h-4 w-4", levelColor)} />
                      Progress Tracking
                    </h4>

                    <div className="space-y-6">
                      {/* Overall Mastery Progress Bar */}
                      <div className="space-y-2.5">
                        <div className="flex justify-between text-xs sm:text-sm">
                          <span className="font-medium text-muted-foreground">
                            Overall Mastery
                          </span>
                          <span className="font-bold text-foreground">
                            {Math.round(overallProgress)}%
                          </span>
                        </div>
                        <div
                          className={meterTrackVariants({ size: "responsive" })}
                        >
                          {/* Tick marks */}
                          <div className="pointer-events-none absolute inset-0 z-10 flex justify-between px-[25%]">
                            <div className="h-full w-px bg-black/20 dark:bg-white/20" />
                            <div className="h-full w-px bg-black/20 dark:bg-white/20" />
                            <div className="h-full w-px bg-black/20 dark:bg-white/20" />
                          </div>

                          <motion.div
                            className={cn(
                              "relative h-full overflow-hidden rounded-full shadow-[0_0_10px_rgba(0,0,0,0.1)]",
                              levelBgColor
                            )}
                            initial={{ width: 0 }}
                            animate={{ width: `${currentProgress}%` }}
                            transition={{ duration: 0.8, ease: "easeOut" }}
                          >
                            {/* Shimmer effect */}
                            <div
                              className="animate-shimmer absolute inset-0 -skew-x-12 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                              style={{ backgroundSize: "200% 100%" }}
                            />
                            {/* Solid color overlay for better visibility */}
                            <div
                              className={cn(
                                "absolute inset-0 opacity-40 mix-blend-overlay",
                                levelColor.replace("text-", "bg-")
                              )}
                            />
                          </motion.div>
                        </div>
                      </div>

                      {nextLevel && (
                        <div className="space-y-2.5">
                          <div className="flex justify-between text-xs sm:text-sm">
                            <span className="font-medium text-muted-foreground">
                              Progress to Level {nextLevel.level}
                            </span>
                            <span className="font-bold text-foreground">
                              {Math.round(progressToNextLevel)}%
                            </span>
                          </div>
                          <div
                            className={meterTrackVariants({
                              size: "responsive",
                            })}
                          >
                            {/* Tick marks */}
                            <div className="pointer-events-none absolute inset-0 z-10 flex justify-between px-[25%]">
                              <div className="h-full w-px bg-black/20 dark:bg-white/20" />
                              <div className="h-full w-px bg-black/20 dark:bg-white/20" />
                              <div className="h-full w-px bg-black/20 dark:bg-white/20" />
                            </div>

                            <motion.div
                              className={cn(
                                "relative h-full overflow-hidden rounded-full shadow-[0_0_10px_rgba(0,0,0,0.1)]",
                                levelBgColor
                              )}
                              initial={{ width: 0 }}
                              animate={{ width: `${nextLevelProgress}%` }}
                              transition={{ duration: 0.8, ease: "easeOut" }}
                            >
                              {/* Shimmer effect */}
                              <div
                                className="animate-shimmer absolute inset-0 -skew-x-12 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                                style={{ backgroundSize: "200% 100%" }}
                              />
                              {/* Solid color overlay for better visibility */}
                              <div
                                className={cn(
                                  "absolute inset-0 opacity-40 mix-blend-overlay",
                                  levelColor.replace("text-", "bg-")
                                )}
                              />
                            </motion.div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    {(strengths.length > 0 || areasToImprove.length > 0) && (
                      <div>
                        <h4 className="mb-4 flex items-center gap-2 text-base font-semibold text-foreground/90">
                          <Star className={cn("h-4 w-4", levelColor)} />
                          Performance Insights
                        </h4>
                        <div className="space-y-2 sm:space-y-3">
                          {strengths.map((strength: string, index: number) => (
                            <motion.div
                              key={index}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ duration: 0.3, delay: index * 0.1 }}
                              className="flex items-center gap-2 rounded-lg border border-emerald-500/10 bg-emerald-500/5 p-2 text-emerald-600 backdrop-blur-sm transition-colors hover:bg-emerald-500/10 sm:gap-3 sm:p-2.5 dark:bg-emerald-500/10 dark:text-emerald-400"
                            >
                              <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)] sm:h-2 sm:w-2" />
                              <span className="text-xs font-medium sm:text-sm">
                                {strength}
                              </span>
                            </motion.div>
                          ))}
                          {areasToImprove.map((area: string, index: number) => (
                            <motion.div
                              key={index}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{
                                duration: 0.3,
                                delay: (strengths.length + index) * 0.1,
                              }}
                              className="flex items-center gap-2 rounded-lg border border-amber-500/10 bg-amber-500/5 p-2 text-amber-600 backdrop-blur-sm transition-colors hover:bg-amber-500/10 sm:gap-3 sm:p-2.5 dark:bg-amber-500/10 dark:text-amber-400"
                            >
                              <div className="h-1.5 w-1.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)] sm:h-2 sm:w-2" />
                              <span className="text-xs font-medium sm:text-sm">
                                {area}
                              </span>
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div>
                      <h4 className="mb-4 flex items-center gap-2 text-base font-semibold text-foreground/90">
                        <BookOpen className={cn("h-4 w-4", levelColor)} />
                        {nextLevel
                          ? `Requirements for Level ${nextLevel.level}`
                          : "Current Requirements"}
                      </h4>
                      <div className="grid grid-cols-2 gap-2 sm:gap-3">
                        {Object.entries(
                          nextLevel
                            ? nextLevel.requirements
                            : currentLevel.requirements
                        ).map(([key, value], index) => {
                          const statMode = getStatMode(key)
                          const statText = statMode
                            ? progressModeTokens[statMode].textStrong
                            : "text-muted-foreground"
                          return (
                            <motion.div
                              key={key}
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.3, delay: index * 0.1 }}
                              className={cn(
                                metricTileVariants({
                                  variant: statMode ?? "neutral",
                                  padding: "lg",
                                  interactive: true,
                                }),
                                "group/stat",
                                "transition-all duration-300 hover:scale-[1.02] hover:shadow-md"
                              )}
                            >
                              {/* Glassmorphism overlay */}
                              <div className="absolute inset-0 mix-blend-soft-light backdrop-blur-lg backdrop-saturate-150" />

                              <div className="relative z-10">
                                <span
                                  className={cn(
                                    "text-[10px] font-semibold tracking-wider uppercase opacity-80 sm:text-xs",
                                    statText
                                  )}
                                >
                                  {key}
                                </span>
                                <div
                                  className={cn(
                                    "mt-0.5 text-lg font-bold tracking-tight sm:mt-1 sm:text-2xl",
                                    statText
                                  )}
                                >
                                  {value}%
                                </div>
                              </div>

                              {/* Decorative gradient */}
                              <div
                                className={cn(
                                  "absolute inset-0 opacity-0 transition-opacity duration-500 group-hover/stat:opacity-20",
                                  "bg-gradient-to-br from-white/40 to-transparent"
                                )}
                              />
                            </motion.div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </CardContent>
      </div>

      {/* Additional decorative elements */}
      <div className="absolute top-0 right-0 -z-10 h-64 w-64 rounded-full bg-gradient-to-b from-white/5 to-transparent opacity-50 blur-3xl" />
      <div className="absolute bottom-0 left-0 -z-10 h-48 w-48 rounded-full bg-gradient-to-t from-white/5 to-transparent opacity-50 blur-2xl" />
    </Card>
  )
}
