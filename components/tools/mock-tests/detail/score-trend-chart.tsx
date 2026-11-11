"use client"

import {
  createContext,
  memo,
  useContext,
  useId,
  useRef,
  type KeyboardEvent,
  type RefObject,
} from "react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  Rectangle,
  ReferenceLine,
  XAxis,
  YAxis,
  type BarShapeProps,
} from "recharts"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { formatAttemptDate, formatAttemptTime } from "@/lib/dates/attempt-date"
import { formatNumber } from "@/lib/tools/mock-tests/kind-labels"
import {
  scoreTrendScale,
  type ScoreTrendPoint,
} from "@/lib/tools/mock-tests/score-trend"

const chartConfig = {
  percentage: { label: "Score", color: "var(--brand-violet-ink)" },
} satisfies ChartConfig
const dayFormatter = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  timeZone: "Asia/Kolkata",
})
const timeFormatter = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZone: "Asia/Kolkata",
})
const plotFormatter = new Intl.NumberFormat("en", {
  maximumFractionDigits: 1,
  notation: "compact",
})

type ScoreTrendChartProps = {
  points: ScoreTrendPoint[]
  selectedId: string
  onSelect: (id: string) => void
}
const ScoreSelectionContext = createContext<Pick<
  ScoreTrendChartProps,
  "selectedId" | "onSelect"
> | null>(null)

export function ScoreTrendChart(props: ScoreTrendChartProps) {
  return (
    <ScoreSelectionContext.Provider
      value={{ selectedId: props.selectedId, onSelect: props.onSelect }}
    >
      <ScoreTrendCanvas points={props.points} onSelect={props.onSelect} />
    </ScoreSelectionContext.Provider>
  )
}

// Selection updates only the columns, preserving chart geometry and keyboard focus.
const ScoreTrendCanvas = memo(function ScoreTrendCanvas({
  points,
  onSelect,
}: Omit<ScoreTrendChartProps, "selectedId">) {
  const id = useId()
  const nodes = useRef(new Map<string, SVGGElement>())
  const scale = scoreTrendScale(points)
  function keyboard(event: KeyboardEvent<SVGGElement>, index: number) {
    const next =
      event.key === "ArrowLeft"
        ? Math.max(0, index - 1)
        : event.key === "ArrowRight"
          ? Math.min(points.length - 1, index + 1)
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? points.length - 1
              : null
    if (next !== null) {
      event.preventDefault()
      event.stopPropagation()
      nodes.current.get(points[next].id)?.focus({ preventScroll: true })
      onSelect(points[next].id)
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault()
      event.stopPropagation()
      onSelect(points[index].id)
    }
  }
  function column(props: BarShapeProps) {
    const point = points[props.index]
    return point ? (
      <ScoreColumn
        point={point}
        geometry={props}
        nodes={nodes}
        onKeyDown={keyboard}
        helpId={id}
      />
    ) : (
      <g />
    )
  }
  return (
    <>
      <p id={`${id}-help`} className="sr-only">
        One column per result, oldest to newest. Use Left and Right Arrow keys,
        Home or End to select a result. Press Enter or Space to inspect it.
      </p>
      <ChartContainer
        config={chartConfig}
        className="-mx-2 aspect-auto h-72 w-[calc(100%+1rem)] min-w-0 sm:mx-0 sm:w-full"
        role="group"
        aria-label="Recent score comparison"
        data-score-chart
      >
        <BarChart
          data={points}
          accessibilityLayer={false}
          margin={{ top: 24, right: 8, left: 0, bottom: 6 }}
        >
          <CartesianGrid
            vertical={false}
            stroke="var(--border)"
            strokeDasharray="3 3"
          />
          <XAxis
            dataKey="id"
            tickLine={false}
            axisLine={false}
            interval={0}
            height={44}
            tick={({ x, y, payload }) => {
              const point = points.find((point) => point.id === payload.value)
              if (!point) return <g />
              const date = new Date(point.startedAt)
              return (
                <text
                  x={x}
                  y={Number(y) + 12}
                  textAnchor="middle"
                  fill="var(--muted-foreground)"
                  fontSize={12}
                >
                  <tspan x={x}>{dayFormatter.format(date)}</tspan>
                  <tspan x={x} dy={16}>
                    {timeFormatter.format(date)}
                  </tspan>
                </text>
              )
            }}
          />
          <YAxis
            width={40}
            domain={[scale.minimum, scale.maximum]}
            ticks={scale.ticks}
            tickLine={false}
            axisLine={false}
            tickMargin={4}
            tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
            tickFormatter={(value) => `${plotFormatter.format(Number(value))}%`}
          />
          {scale.minimum < 0 ? (
            <ReferenceLine y={0} stroke="var(--foreground)" />
          ) : null}
          <ChartTooltip
            cursor={false}
            content={
              <ChartTooltipContent
                hideIndicator
                labelFormatter={(_label, payload) => {
                  const point = payload?.[0]?.payload as
                    ScoreTrendPoint | undefined
                  return point
                    ? `${formatAttemptDate(point.startedAt)}, ${formatAttemptTime(point.startedAt)} IST`
                    : "Result"
                }}
                formatter={(value, _name, item) => {
                  const point = item.payload as ScoreTrendPoint
                  return (
                    <span className="font-medium tabular-nums">
                      {formatNumber(Number(value))}% ·{" "}
                      {formatNumber(point.score)} /{" "}
                      {formatNumber(point.maxScore)} marks
                    </span>
                  )
                }}
              />
            }
          />
          <Bar
            dataKey="percentage"
            name="Score"
            maxBarSize={56}
            minPointSize={3}
            shape={column}
            isAnimationActive={false}
          >
            <LabelList
              dataKey="percentage"
              position="top"
              offset={10}
              fill="var(--foreground)"
              fontSize={12}
              fontWeight={600}
              formatter={(value) => `${plotFormatter.format(Number(value))}%`}
            />
          </Bar>
        </BarChart>
      </ChartContainer>
    </>
  )
})

function ScoreColumn({
  point,
  geometry,
  nodes,
  onKeyDown,
  helpId,
}: {
  point: ScoreTrendPoint
  geometry: BarShapeProps
  nodes: RefObject<Map<string, SVGGElement>>
  onKeyDown: (event: KeyboardEvent<SVGGElement>, index: number) => void
  helpId: string
}) {
  const selection = useContext(ScoreSelectionContext)
  if (!selection) throw new Error("Score columns require a selection context.")
  const selected = point.id === selection.selectedId
  return (
    <g
      ref={(node) => {
        if (node) nodes.current.set(point.id, node)
        else nodes.current.delete(point.id)
      }}
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      aria-describedby={`${helpId}-help`}
      aria-label={`Result ${geometry.index + 1} shown, ${formatAttemptDate(point.startedAt)}, ${formatAttemptTime(point.startedAt)}: ${formatNumber(point.percentage)}%, ${formatNumber(point.score)} out of ${formatNumber(point.maxScore)} marks`}
      data-score-point={point.id}
      className="group/score cursor-pointer outline-none"
      onClick={() => selection.onSelect(point.id)}
      onFocus={() => selection.onSelect(point.id)}
      onKeyDown={(event) => onKeyDown(event, geometry.index)}
    >
      <rect
        x={geometry.x + geometry.width / 2 - 22}
        y={geometry.parentViewBox.y}
        width={44}
        height={geometry.parentViewBox.height}
        rx={4}
        fill="transparent"
        stroke="transparent"
        strokeWidth={2}
        className="group-focus-visible/score:stroke-ring"
      />
      <Rectangle
        x={geometry.x}
        y={geometry.y}
        width={geometry.width}
        height={geometry.height}
        radius={4}
        fill={selected ? "var(--color-percentage)" : "var(--muted-foreground)"}
        stroke={selected ? "var(--foreground)" : "transparent"}
        strokeWidth={selected ? 2 : 0}
      />
    </g>
  )
}
