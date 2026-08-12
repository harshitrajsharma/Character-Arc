import React, { useMemo, useState } from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { SubjectWithRelations } from "@/types/progressapp/domain"
import {
  BarChart,
  LineChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"
import { getProgressSummary } from "@/lib/tools/exam-prep/progress/selectors"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  BarChart2,
  LineChart as LineChartIcon,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Trophy,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface TopicWeightageAnalysisProps {
  subjects: SubjectWithRelations[]
}

interface ChartDataItem {
  name: string
  weightage: number
  preparation: number
  gap: number
  color: string
  originalProgress: number
}

type ViewMode = "bar" | "line"

interface CustomBarProps {
  x?: number
  y?: number
  width?: number
  height?: number
  type: "weightage" | "preparation"
}

interface TooltipProps {
  active?: boolean
  payload?: Array<{
    payload: ChartDataItem
  }>
}

const COLORS = {
  weightage: {
    base: "hsl(217 91% 60% / 0.8)",
    hover: "hsl(217 91% 60%)",
    line: "hsl(217 91% 60%)",
  },
  preparation: {
    base: "hsl(142 76% 36% / 0.8)",
    hover: "hsl(142 76% 36%)",
    line: "hsl(142 76% 36%)",
  },
  progress: {
    critical: "hsl(0 84% 60%)",
    warning: "hsl(38 92% 50%)",
    good: "hsl(142 76% 36%)",
  },
  gap: {
    critical: "hsl(0 84% 60%)",
    high: "hsl(25 95% 53%)",
    moderate: "hsl(38 92% 50%)",
  },
} as const

const CustomBar = ({
  x = 0,
  y = 0,
  width = 0,
  height = 0,
  type,
}: CustomBarProps) => (
  <g>
    <rect
      x={x}
      y={y}
      width={width}
      height={height}
      rx={4}
      fill={COLORS[type].base}
      className={cn(
        "transition-colors duration-200",
        "hover:fill-[var(--bar-hover)]"
      )}
      style={
        {
          "--bar-hover": COLORS[type].hover,
        } as React.CSSProperties
      }
    />
  </g>
)

const CustomTooltip = ({ active, payload }: TooltipProps) => {
  if (active && payload && payload.length > 0) {
    const data = payload[0].payload
    const gapStatus = data.gap > 0 ? "behind" : "ahead"

    return (
      <div className="rounded-xl border bg-background/95 p-3 shadow-lg backdrop-blur-sm">
        <div className="mb-2 text-sm font-semibold">{data.name}</div>
        <div className="grid gap-2">
          <div className="flex items-center justify-between gap-4">
            <span className="text-xs text-muted-foreground uppercase">
              Exam Weightage
            </span>
            <span
              className="text-sm font-bold"
              style={{ color: COLORS.weightage.hover }}
            >
              {data.weightage}%
            </span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-xs text-muted-foreground uppercase">
              Your Progress
            </span>
            <span className="text-sm font-bold" style={{ color: data.color }}>
              {data.originalProgress}%
            </span>
          </div>
          {data.gap !== 0 && (
            <div className="mt-2 border-t pt-2">
              <div className="flex items-center gap-2">
                {gapStatus === "behind" ? (
                  <AlertCircle className="h-3 w-3 text-red-500" />
                ) : (
                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                )}
                <span
                  className={cn(
                    "text-xs font-medium",
                    gapStatus === "behind" ? "text-red-500" : "text-green-500"
                  )}
                >
                  {gapStatus === "behind"
                    ? `${data.gap}% behind target`
                    : `${Math.abs(data.gap)}% ahead`}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }
  return null
}

const getGapBadgeVariant = (gap: number): { color: string; label: string } => {
  if (gap >= 15) return { color: COLORS.gap.critical, label: "Critical" }
  if (gap >= 8) return { color: COLORS.gap.high, label: "High" }
  if (gap >= 3) return { color: COLORS.gap.moderate, label: "Moderate" }
  return { color: COLORS.progress.good, label: "Low" }
}

export function TopicWeightageAnalysis({
  subjects,
}: TopicWeightageAnalysisProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("bar")

  const chartData = useMemo(() => {
    const totalWeightage = subjects.reduce(
      (sum, subject) => sum + subject.weightage,
      0
    )

    return subjects
      .map((subject) => {
        const progress = getProgressSummary(subject)
        const normalizedWeightage = (subject.weightage / totalWeightage) * 100
        const relativePreparation =
          (progress.overall * normalizedWeightage) / 100
        const preparation = Math.round(relativePreparation * 10) / 10
        const gap = Math.round((normalizedWeightage - preparation) * 10) / 10

        const ratio = progress.overall / 100
        let color: string = COLORS.progress.critical
        if (ratio >= 0.7) color = COLORS.progress.good
        else if (ratio >= 0.3) color = COLORS.progress.warning

        return {
          name: subject.name,
          weightage: Math.round(normalizedWeightage * 10) / 10,
          preparation,
          gap,
          color,
          originalProgress: Math.round(progress.overall * 10) / 10,
        }
      })
      .sort((a, b) => b.weightage - a.weightage)
  }, [subjects])

  const chartHeight = useMemo(() => {
    const baseHeight = 250
    const heightPerSubject = 35
    return Math.max(baseHeight, subjects.length * heightPerSubject)
  }, [subjects])

  const focusAreas = useMemo(() => {
    return chartData
      .filter((subject) => subject.gap > 0)
      .sort((a, b) => b.gap - a.gap)
      .slice(0, 5)
  }, [chartData])

  const renderChart = () => {
    const commonProps = {
      data: chartData,
      margin: { top: 10, right: 10, left: 0, bottom: 5 },
      height: chartHeight,
      width: 100,
    }

    if (viewMode === "bar") {
      return (
        <BarChart {...commonProps}>
          <CartesianGrid strokeDasharray="3 3" className="opacity-50" />
          <XAxis
            dataKey="name"
            tick={{ fill: "hsl(var(--muted-foreground))" }}
            tickLine={{ stroke: "hsl(var(--muted-foreground))" }}
          />
          <YAxis
            tick={{ fill: "hsl(var(--muted-foreground))" }}
            tickLine={{ stroke: "hsl(var(--muted-foreground))" }}
            label={{
              value: "Percentage (%)",
              angle: -90,
              position: "insideLeft",
              fill: "hsl(var(--muted-foreground))",
            }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Bar
            dataKey="weightage"
            name="Exam Weightage"
            shape={<CustomBar type="weightage" />}
          />
          <Bar
            dataKey="preparation"
            name="Your Preparation"
            shape={<CustomBar type="preparation" />}
          />
        </BarChart>
      )
    }

    return (
      <LineChart {...commonProps}>
        <CartesianGrid strokeDasharray="3 3" className="opacity-50" />
        <XAxis
          dataKey="name"
          tick={{ fill: "hsl(var(--muted-foreground))" }}
          tickLine={{ stroke: "hsl(var(--muted-foreground))" }}
        />
        <YAxis
          tick={{ fill: "hsl(var(--muted-foreground))" }}
          tickLine={{ stroke: "hsl(var(--muted-foreground))" }}
          label={{
            value: "Percentage (%)",
            angle: -90,
            position: "insideLeft",
            fill: "hsl(var(--muted-foreground))",
          }}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend />
        <Line
          type="monotone"
          dataKey="weightage"
          name="Exam Weightage"
          stroke={COLORS.weightage.line}
          strokeWidth={2}
          dot={{ fill: COLORS.weightage.line }}
          activeDot={{ r: 6 }}
        />
        <Line
          type="monotone"
          dataKey="preparation"
          name="Your Preparation"
          stroke={COLORS.preparation.line}
          strokeWidth={2}
          dot={{ fill: COLORS.preparation.line }}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    )
  }

  return (
    <Card className="col-span-4">
      <CardHeader className="pb-2 sm:pb-6">
        <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <CardTitle className="flex items-center gap-1.5 text-base sm:gap-2 sm:text-lg md:text-xl">
              Topic Weightage Analysis
              <TrendingUp className="h-4 w-4 text-blue-500 sm:h-5 sm:w-5" />
            </CardTitle>
            <CardDescription className="mt-1 text-xs sm:mt-1.5 sm:text-sm">
              Track your preparation progress against subject weightage
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg border p-0.5">
              <Button
                variant={viewMode === "bar" ? "secondary" : "ghost"}
                size="sm"
                className="h-8"
                onClick={() => setViewMode("bar")}
              >
                <BarChart2 className="mr-1 h-4 w-4" />
                Bar
              </Button>
              <Button
                variant={viewMode === "line" ? "secondary" : "ghost"}
                size="sm"
                className="h-8"
                onClick={() => setViewMode("line")}
              >
                <LineChartIcon className="mr-1 h-4 w-4" />
                Line
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-2 sm:p-4 md:p-6">
        <div className="w-full" style={{ height: `${chartHeight}px` }}>
          <ResponsiveContainer>{renderChart()}</ResponsiveContainer>
        </div>

        {/* Focus Areas */}
        <div className="mt-4 space-y-2 sm:mt-6 sm:space-y-3">
          <h4 className="flex items-center gap-2 text-sm font-semibold sm:text-base">
            <AlertCircle className="h-4 w-4 text-orange-500" />
            Focus Areas
            <span className="text-xs font-normal text-muted-foreground sm:text-sm">
              ({focusAreas.length}{" "}
              {focusAreas.length === 1 ? "subject" : "subjects"})
            </span>
          </h4>

          {focusAreas.length === 0 ? (
            <div className="rounded-xl border-2 border-dashed border-green-200 p-4 text-center sm:p-6 dark:border-green-900/30">
              <Trophy className="mx-auto mb-2 h-8 w-8 text-green-500 sm:mb-3 sm:h-12 sm:w-12" />
              <h3 className="mb-1 text-base font-semibold text-green-700 sm:text-lg dark:text-green-400">
                Excellent Progress! 🎉
              </h3>
              <p className="text-xs text-green-600/80 sm:text-sm dark:text-green-500/80">
                You&apos;re on track with all subjects. Keep up the great work!
              </p>
            </div>
          ) : (
            <div className="space-y-1.5 sm:space-y-2">
              {focusAreas.map((subject) => {
                const badgeInfo = getGapBadgeVariant(subject.gap)

                return (
                  <div
                    key={subject.name}
                    className="flex items-center justify-between rounded-lg border p-2 text-xs transition-colors hover:bg-muted/50 sm:p-3 sm:text-sm"
                  >
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5 sm:gap-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate font-medium">
                          {subject.name}
                        </span>
                        <Badge
                          variant="outline"
                          className="px-1.5 py-0 text-[10px] sm:text-xs"
                          style={{
                            borderColor: badgeInfo.color,
                            color: badgeInfo.color,
                            backgroundColor: `${badgeInfo.color}15`,
                          }}
                        >
                          {badgeInfo.label}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1.5 text-[0.65rem] text-muted-foreground sm:gap-2 sm:text-xs">
                        <span style={{ color: COLORS.weightage.hover }}>
                          Weightage: {subject.weightage}%
                        </span>
                        <span className="text-muted-foreground/50">|</span>
                        <span style={{ color: subject.color }}>
                          Progres: {subject.originalProgress}%
                        </span>
                      </div>
                    </div>
                    <span
                      className="ml-2 text-xs font-medium whitespace-nowrap text-red-500 sm:text-sm"
                      style={{ color: badgeInfo.color }}
                    >
                      -{subject.gap}%
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
