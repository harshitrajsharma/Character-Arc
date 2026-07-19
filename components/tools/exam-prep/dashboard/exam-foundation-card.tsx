import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, TrendingUp, Target, BookOpen, Star, Trophy, Brain, Rocket, GraduationCap, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  iconFrameVariants,
  meterTrackVariants,
  metricTileVariants,
  progressModeTokens,
} from "@/lib/tools/exam-prep/design-system";

interface Level {
  level: number;
  title: string;
  description: string;
  requirements: Record<string, number>;
}

interface ExamResult {
  currentLevel: Level;
  nextLevel: Level | null;
  progressToNextLevel: number;
  strengths: string[];
  areasToImprove: string[];
  overallProgress: number;
}

interface ExamFoundationCardProps {
  result: ExamResult;
  examName: string;
  className?: string;
}

type StatType = 'learning' | 'revision' | 'practice' | 'test';

const getLevelColor = (level: number): string => {
  if (level <= 2) return "text-red-600";
  if (level <= 4) return "text-orange-600";
  if (level <= 6) return "text-yellow-600";
  if (level <= 8) return "text-emerald-600";
  return "text-purple-600";
};

const getLevelBgColor = (level: number): string => {
  if (level <= 2) return "bg-gradient-to-r from-red-600/40 via-red-600/20 dark:from-red-600/20 dark:via-red-600/10 to-transparent";
  if (level <= 4) return "bg-gradient-to-r from-orange-600/40 via-orange-600/20 dark:from-orange-600/20 dark:via-orange-600/10 to-transparent";
  if (level <= 6) return "bg-gradient-to-r from-yellow-600/40 via-yellow-600/20 dark:from-yellow-600/20 dark:via-yellow-600/10 to-transparent";
  if (level <= 8) return "bg-gradient-to-r from-emerald-600/40 via-emerald-600/20 dark:from-emerald-600/20 dark:via-emerald-600/10 to-transparent";
  return "bg-gradient-to-r from-purple-600/20 via-purple-600/10 to-transparent";
};

const getLevelBorderColor = (level: number): string => {
  if (level <= 2) return "border-red-600/20";
  if (level <= 4) return "border-orange-600/20";
  if (level <= 6) return "border-yellow-600/20";
  if (level <= 8) return "border-emerald-600/20";
  return "border-purple-600/20";
};

const getLevelIcon = (level: number): React.ElementType => {
  if (level <= 2) return Brain;
  if (level <= 4) return Star;
  if (level <= 6) return Rocket;
  if (level <= 8) return GraduationCap;
  return Trophy;
};

const getStatMode = (statType: string): StatType | null => {
  return statType === "learning" ||
    statType === "revision" ||
    statType === "practice" ||
    statType === "test"
    ? statType
    : null;
}

export function ExamFoundationCard({ result, examName, className }: ExamFoundationCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [currentProgress, setCurrentProgress] = useState(0);
  const [nextLevelProgress, setNextLevelProgress] = useState(0);
  const { currentLevel, nextLevel, progressToNextLevel, strengths, areasToImprove, overallProgress } = result;
  const levelColor = getLevelColor(currentLevel.level);
  const levelBgColor = getLevelBgColor(currentLevel.level);
  const levelBorderColor = getLevelBorderColor(currentLevel.level);
  const LevelIcon = getLevelIcon(currentLevel.level);

  useEffect(() => {
    setCurrentProgress(0);
    setNextLevelProgress(0);
    const timer = setTimeout(() => {
      setCurrentProgress(overallProgress);
      setNextLevelProgress(progressToNextLevel);
    }, 100);
    return () => clearTimeout(timer);
  }, [overallProgress, progressToNextLevel]);

  return (
    <Card className={cn("col-span-4 relative overflow-hidden shadow-lg group", className)}>
      {/* Glassmorphism Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-background/90 via-background/80 to-background/70 backdrop-blur-xl backdrop-saturate-150 z-0" />
      <div className="absolute inset-0 bg-gradient-to-br from-background/20 to-background/10 z-0" />
      <div className={cn("absolute inset-0 opacity-15 z-0 transition-opacity duration-500 group-hover:opacity-25", levelBgColor)} />

      {/* Animated Border Effect */}
      <div className="absolute inset-0 rounded-lg border border-white/10 backdrop-blur-3xl z-0" />

      {/* Content Container */}
      <div className="relative z-10">
        <CardHeader className="pb-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col sm:flex-row sm:items-start justify-between gap-4"
          >
            <div className="space-y-1.5">
              <CardTitle className="text-base sm:text-2xl font-bold flex items-center gap-2.5 sm:gap-3">
                <div className={cn(iconFrameVariants({ variant: "glass", size: "lg" }), levelColor)}>
                  <Target className="h-4 sm:h-6 w-4 sm:w-6" />
                </div>
                <span className="bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                  Foundation Level
                </span>
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm text-muted-foreground/90 pl-1">
                Your current preparation level for {examName}
              </CardDescription>
            </div>

            <motion.div
              layout
              className="flex flex-col items-start sm:items-end gap-2"
            >
              <Badge
                variant="outline"
                className={cn(
                  "text-sm sm:text-lg px-3 sm:px-4 py-1 sm:py-1.5 font-bold flex items-center gap-2 backdrop-blur-md shadow-sm",
                  levelColor,
                  levelBorderColor,
                  "bg-background/40"
                )}
              >
                <LevelIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                Level {currentLevel.level}
              </Badge>
              <span className="text-xs sm:text-sm font-medium text-muted-foreground">
                {Math.round(overallProgress)}% Complete
              </span>
            </motion.div>
          </motion.div>
        </CardHeader>

        <CardContent className="space-y-6">
          <motion.div
            layout
            className={cn(
              "p-4 rounded-xl border backdrop-blur-lg shadow-sm relative overflow-hidden",
              levelBgColor,
              levelBorderColor
            )}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-white/5 to-transparent opacity-50" />
            <div className="space-y-2 relative z-10">
              <div className="flex items-center gap-2">
                <h3 className={cn("text-base sm:text-xl font-bold tracking-tight", levelColor)}>
                  {currentLevel.title}
                </h3>
                {currentLevel.level === 10 && (
                  <motion.div
                    animate={{ rotate: [0, 10, -10, 0] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                  >
                    <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600" />
                  </motion.div>
                )}
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground/90 font-medium leading-relaxed">{currentLevel.description}</p>
            </div>
          </motion.div>

          <motion.div layout className="space-y-6">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="w-full flex items-center justify-between text-xs sm:text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors group/btn"
            >
              <span className="flex items-center gap-2">
                Detailed Progress
                <div className="h-px w-12 bg-border group-hover/btn:w-20 transition-all" />
              </span>
              <motion.div
                animate={{ rotate: isExpanded ? 0 : 180 }}
                transition={{ duration: 0.2 }}
                className="p-1 rounded-full hover:bg-muted/50"
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
                    <h4 className="text-base font-semibold flex items-center gap-2 text-foreground/90">
                      <TrendingUp className={cn("h-4 w-4", levelColor)} />
                      Progress Tracking
                    </h4>

                    <div className="space-y-6">
                      {/* Overall Mastery Progress Bar */}
                      <div className="space-y-2.5">
                        <div className="flex justify-between text-xs sm:text-sm">
                          <span className="text-muted-foreground font-medium">Overall Mastery</span>
                          <span className="font-bold text-foreground">{Math.round(overallProgress)}%</span>
                        </div>
                        <div className={meterTrackVariants({ size: "responsive" })}>
                          {/* Tick marks */}
                          <div className="absolute inset-0 flex justify-between px-[25%] pointer-events-none z-10">
                            <div className="w-px h-full bg-black/20 dark:bg-white/20" />
                            <div className="w-px h-full bg-black/20 dark:bg-white/20" />
                            <div className="w-px h-full bg-black/20 dark:bg-white/20" />
                          </div>

                          <motion.div
                            className={cn("h-full rounded-full relative overflow-hidden shadow-[0_0_10px_rgba(0,0,0,0.1)]", levelBgColor)}
                            initial={{ width: 0 }}
                            animate={{ width: `${currentProgress}%` }}
                            transition={{ duration: 0.8, ease: "easeOut" }}
                          >
                            {/* Shimmer effect */}
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 animate-shimmer" style={{ backgroundSize: '200% 100%' }} />
                            {/* Solid color overlay for better visibility */}
                            <div className={cn("absolute inset-0 opacity-40 mix-blend-overlay", levelColor.replace('text-', 'bg-'))} />
                          </motion.div>
                        </div>
                      </div>

                      {nextLevel && (
                        <div className="space-y-2.5">
                          <div className="flex justify-between text-xs sm:text-sm">
                            <span className="text-muted-foreground font-medium">Progress to Level {nextLevel.level}</span>
                            <span className="font-bold text-foreground">{Math.round(progressToNextLevel)}%</span>
                          </div>
                          <div className={meterTrackVariants({ size: "responsive" })}>
                            {/* Tick marks */}
                            <div className="absolute inset-0 flex justify-between px-[25%] pointer-events-none z-10">
                              <div className="w-px h-full bg-black/20 dark:bg-white/20" />
                              <div className="w-px h-full bg-black/20 dark:bg-white/20" />
                              <div className="w-px h-full bg-black/20 dark:bg-white/20" />
                            </div>

                            <motion.div
                              className={cn("h-full rounded-full relative overflow-hidden shadow-[0_0_10px_rgba(0,0,0,0.1)]", levelBgColor)}
                              initial={{ width: 0 }}
                              animate={{ width: `${nextLevelProgress}%` }}
                              transition={{ duration: 0.8, ease: "easeOut" }}
                            >
                              {/* Shimmer effect */}
                              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 animate-shimmer" style={{ backgroundSize: '200% 100%' }} />
                              {/* Solid color overlay for better visibility */}
                              <div className={cn("absolute inset-0 opacity-40 mix-blend-overlay", levelColor.replace('text-', 'bg-'))} />
                            </motion.div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {(strengths.length > 0 || areasToImprove.length > 0) && (
                      <div>
                        <h4 className="text-base font-semibold mb-4 flex items-center gap-2 text-foreground/90">
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
                              className="flex items-center gap-2 sm:gap-3 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5 dark:bg-emerald-500/10 backdrop-blur-sm p-2 sm:p-2.5 rounded-lg border border-emerald-500/10 hover:bg-emerald-500/10 transition-colors"
                            >
                              <div className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
                              <span className="text-xs sm:text-sm font-medium">{strength}</span>
                            </motion.div>
                          ))}
                          {areasToImprove.map((area: string, index: number) => (
                            <motion.div
                              key={index}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ duration: 0.3, delay: (strengths.length + index) * 0.1 }}
                              className="flex items-center gap-2 sm:gap-3 text-amber-600 dark:text-amber-400 bg-amber-500/5 dark:bg-amber-500/10 backdrop-blur-sm p-2 sm:p-2.5 rounded-lg border border-amber-500/10 hover:bg-amber-500/10 transition-colors"
                            >
                              <div className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]" />
                              <span className="text-xs sm:text-sm font-medium">{area}</span>
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div>
                      <h4 className="text-base font-semibold mb-4 flex items-center gap-2 text-foreground/90">
                        <BookOpen className={cn("h-4 w-4", levelColor)} />
                        {nextLevel ? `Requirements for Level ${nextLevel.level}` : 'Current Requirements'}
                      </h4>
                      <div className="grid grid-cols-2 gap-2 sm:gap-3">
                        {Object.entries(nextLevel ? nextLevel.requirements : currentLevel.requirements).map(([key, value], index) => {
                          const statMode = getStatMode(key);
                          const statText = statMode
                            ? progressModeTokens[statMode].textStrong
                            : "text-muted-foreground";
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
                                "transition-all duration-300 hover:scale-[1.02] hover:shadow-md",
                              )}
                            >
                              {/* Glassmorphism overlay */}
                              <div className="absolute inset-0 backdrop-blur-lg backdrop-saturate-150 mix-blend-soft-light" />

                              <div className="relative z-10">
                                <span className={cn(
                                  "text-[10px] sm:text-xs font-semibold uppercase tracking-wider opacity-80",
                                  statText
                                )}>
                                  {key}
                                </span>
                                <div className={cn(
                                  "text-lg sm:text-2xl font-bold mt-0.5 sm:mt-1 tracking-tight",
                                  statText
                                )}>
                                  {value}%
                                </div>
                              </div>

                              {/* Decorative gradient */}
                              <div className={cn(
                                "absolute inset-0 opacity-0 group-hover/stat:opacity-20 transition-opacity duration-500",
                                "bg-gradient-to-br from-white/40 to-transparent"
                              )} />
                            </motion.div>
                          );
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
      <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-b from-white/5 to-transparent rounded-full blur-3xl -z-10 opacity-50" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-t from-white/5 to-transparent rounded-full blur-2xl -z-10 opacity-50" />
    </Card>
  );
}
