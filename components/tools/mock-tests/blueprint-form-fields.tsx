"use client"

import {
  BookOpenIcon,
  CalculatorIcon,
  ClockIcon,
  FilePenLineIcon,
  LayersIcon,
  ListChecksIcon,
  SlidersHorizontalIcon,
  SparklesIcon,
  TrophyIcon,
  AlertCircleIcon,
} from "lucide-react"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { RichTextEditor } from "@/components/tools/mock-tests/editor/rich-text-editor"
import { htmlTextLength } from "@/components/tools/mock-tests/editor/html-utils"
import { cn } from "@/lib/utils"

export type PaperType =
  | "full_length"
  | "multi_subject"
  | "subject_wise"
  | "topic_wise"
  | "pyq"

export const PAPER_TYPES: Array<{
  id: PaperType
  label: string
  shortLabel: string
  badgeVariantClass: string
  pillClass: string
  activePillClass: string
  activeCardClass: string
  iconContainerClass: string
  dotColorClass: string
  description: string
  icon: typeof ListChecksIcon
}> = [
  {
    id: "full_length",
    label: "Full-Length Mock",
    shortLabel: "Full Paper",
    badgeVariantClass:
      "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300",
    pillClass: "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300",
    activePillClass: "border-sky-500 bg-sky-500 text-white dark:text-zinc-900 shadow-xs",
    activeCardClass:
      "border-sky-500/60 bg-sky-500/[0.05] ring-1 ring-sky-500/30",
    iconContainerClass: "bg-sky-500/15 text-sky-600 dark:text-sky-400",
    dotColorClass: "bg-sky-500",
    description:
      "Complete paper simulating full syllabus, timing, and question distribution",
    icon: ListChecksIcon,
  },
  {
    id: "multi_subject",
    label: "Multi-Subject Test",
    shortLabel: "Multi-Subject",
    badgeVariantClass:
      "border-teal-500/30 bg-teal-500/10 text-teal-700 dark:text-teal-300",
    pillClass: "border-teal-500/30 bg-teal-500/10 text-teal-700 dark:text-teal-300",
    activePillClass: "border-teal-500 bg-teal-500 text-white dark:text-zinc-900 shadow-xs",
    activeCardClass:
      "border-teal-500/60 bg-teal-500/[0.05] ring-1 ring-teal-500/30",
    iconContainerClass: "bg-teal-500/15 text-teal-600 dark:text-teal-400",
    dotColorClass: "bg-teal-500",
    description: "Combined paper testing multiple specific subjects or modules",
    icon: LayersIcon,
  },
  {
    id: "subject_wise",
    label: "Single Subject Test",
    shortLabel: "Single Subject",
    badgeVariantClass:
      "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    pillClass: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    activePillClass: "border-emerald-500 bg-emerald-500 text-white dark:text-zinc-900 shadow-xs",
    activeCardClass:
      "border-emerald-500/60 bg-emerald-500/[0.05] ring-1 ring-emerald-500/30",
    iconContainerClass: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
    dotColorClass: "bg-emerald-500",
    description: "Targeted module evaluating mastery across a specific discipline",
    icon: BookOpenIcon,
  },
  {
    id: "topic_wise",
    label: "Topic Drill",
    shortLabel: "Concept Drill",
    badgeVariantClass:
      "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
    pillClass: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
    activePillClass: "border-amber-500 bg-amber-500 text-white dark:text-zinc-900 shadow-xs",
    activeCardClass:
      "border-amber-500/60 bg-amber-500/[0.05] ring-1 ring-amber-500/30",
    iconContainerClass: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
    dotColorClass: "bg-amber-500",
    description: "Focused practice on high-yield concepts and specific problem types",
    icon: SlidersHorizontalIcon,
  },
  {
    id: "pyq",
    label: "Past Paper (PYQ)",
    shortLabel: "PYQ Archive",
    badgeVariantClass:
      "border-cyan-500/30 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300",
    pillClass: "border-cyan-500/30 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300",
    activePillClass: "border-cyan-500 bg-cyan-500 text-white dark:text-zinc-900 shadow-xs",
    activeCardClass:
      "border-cyan-500/60 bg-cyan-500/[0.05] ring-1 ring-cyan-500/30",
    iconContainerClass: "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400",
    dotColorClass: "bg-cyan-500",
    description:
      "Authentic previous year exam questions calibrated to official standards",
    icon: SparklesIcon,
  },
]

export interface BlueprintFormFieldsProps {
  title: string
  setTitle: (val: string) => void
  instructions: string
  setInstructions: (val: string) => void
  paperType: PaperType
  setPaperType: (val: PaperType) => void
  examTag: string
  setExamTag: (val: string) => void
  subjects: string
  setSubjects: (val: string) => void
  durationMinutes: string
  setDurationMinutes: (val: string) => void
  totalMarks: string
  setTotalMarks: (val: string) => void
  passingBenchmark: number | ""
  setPassingBenchmark: (val: number | "") => void
  distinctionBenchmark: number | ""
  setDistinctionBenchmark: (val: number | "") => void
  calculatorAllowed: boolean
  setCalculatorAllowed: (val: boolean | ((prev: boolean) => boolean)) => void
  autoFocusTitle?: boolean
  className?: string
}

export function BlueprintFormFields({
  title,
  setTitle,
  instructions,
  setInstructions,
  paperType,
  setPaperType,
  examTag,
  setExamTag,
  subjects,
  setSubjects,
  durationMinutes,
  setDurationMinutes,
  totalMarks,
  setTotalMarks,
  passingBenchmark,
  setPassingBenchmark,
  distinctionBenchmark,
  setDistinctionBenchmark,
  calculatorAllowed,
  setCalculatorAllowed,
  autoFocusTitle = false,
  className,
}: BlueprintFormFieldsProps) {
  const passingNum = typeof passingBenchmark === "number" ? passingBenchmark : 33
  const distinctionNum =
    typeof distinctionBenchmark === "number" ? distinctionBenchmark : 70
  const isBenchmarkConflict =
    typeof passingBenchmark === "number" &&
    typeof distinctionBenchmark === "number" &&
    distinctionBenchmark <= passingBenchmark

  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-border bg-card shadow-xs divide-y divide-border",
        className
      )}
    >
      {/* ── Segment 1: Paper Details ── */}
      <div className="p-5 sm:p-7 space-y-5">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-xl bg-muted text-foreground">
            <FilePenLineIcon className="size-4.5" aria-hidden="true" />
          </div>
          <div>
            <h2 className="font-heading text-base sm:text-lg font-semibold text-foreground">
              Paper Details
            </h2>
            <p className="text-xs text-muted-foreground">
              Core identification, test name, and candidate instructions.
            </p>
          </div>
        </div>

        <div className="space-y-4 pt-1">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label
                htmlFor="blueprint-field-title"
                className="text-sm font-semibold text-foreground"
              >
                Title <span className="text-destructive">*</span>
              </Label>
              <span className="text-[11px] font-mono text-muted-foreground">
                {title.length}/120
              </span>
            </div>
            <Input
              id="blueprint-field-title"
              name="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Full Syllabus Mock #1"
              required
              maxLength={120}
              autoFocus={autoFocusTitle}
              className="h-10 text-sm"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label
                htmlFor="blueprint-field-instructions"
                className="text-sm font-semibold text-foreground"
              >
                Instructions (optional)
              </Label>
              <span className="text-[11px] font-mono text-muted-foreground">
                {htmlTextLength(instructions)}/20,000
              </span>
            </div>
            <RichTextEditor
              id="blueprint-field-instructions"
              value={instructions}
              onChange={setInstructions}
              placeholder="Marking scheme, section notes, or candidate guidelines..."
              minHeight="140px"
              showMathHint
            />
          </div>
        </div>
      </div>

      {/* ── Segment 2: Format & Scope ── */}
      <div className="p-5 sm:p-7 space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-xl bg-muted text-foreground">
            <LayersIcon className="size-4.5" aria-hidden="true" />
          </div>
          <div>
            <h2 className="font-heading text-base sm:text-lg font-semibold text-foreground">
              Format & Scope
            </h2>
            <p className="text-xs text-muted-foreground">
              Classification hierarchy, target syllabus, and discipline tags.
            </p>
          </div>
        </div>

        <div className="divide-y divide-border/60 pt-1">
          {/* Block Option 1: Paper Type */}
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between py-4 first:pt-1">
            <div className="space-y-0.5 max-w-sm">
              <Label
                htmlFor="blueprint-field-paperType"
                className="text-sm font-semibold text-foreground"
              >
                Paper Format
              </Label>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Determine the exam structure, timing constraints, and distribution model.
              </p>
            </div>
            <div className="sm:shrink-0 w-full sm:w-72">
              <Select
                value={paperType}
                onValueChange={(val) => setPaperType(val as PaperType)}
              >
                <SelectTrigger id="blueprint-field-paperType" className="w-full h-10">
                  <SelectValue placeholder="Select paper type" />
                </SelectTrigger>
                <SelectContent>
                  {PAPER_TYPES.map((pt) => (
                    <SelectItem key={pt.id} value={pt.id}>
                      <div className="flex items-center gap-2">
                        <span
                          className={cn("size-2 rounded-full shrink-0", pt.dotColorClass)}
                        />
                        <span className="font-medium text-xs">{pt.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Block Option 2: Target Exam */}
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between py-4">
            <div className="space-y-0.5 max-w-sm">
              <Label
                htmlFor="blueprint-field-examTag"
                className="text-sm font-semibold text-foreground"
              >
                Target Exam
              </Label>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Goal syllabus or competitive test category (optional).
              </p>
            </div>
            <div className="sm:shrink-0 w-full sm:w-72">
              <Input
                id="blueprint-field-examTag"
                name="examTag"
                value={examTag}
                onChange={(e) => setExamTag(e.target.value)}
                placeholder="e.g. Final Exam, SAT, MCAT, AWS Certified"
                maxLength={60}
                className="h-10 text-xs"
              />
            </div>
          </div>

          {/* Block Option 3: Covered Subjects */}
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between py-4 last:pb-1">
            <div className="space-y-0.5 max-w-sm">
              <Label
                htmlFor="blueprint-field-subjects"
                className="text-sm font-semibold text-foreground"
              >
                Covered Subjects
              </Label>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Comma-separated disciplines or module names (optional).
              </p>
            </div>
            <div className="sm:shrink-0 w-full sm:w-72">
              <Input
                id="blueprint-field-subjects"
                name="subjects"
                value={subjects}
                onChange={(e) => setSubjects(e.target.value)}
                placeholder="e.g. Mathematics, Chemistry, Microeconomics"
                maxLength={180}
                className="h-10 text-xs"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Segment 3: Timing & Administration ── */}
      <div className="p-5 sm:p-7 space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-xl bg-muted text-foreground">
            <ClockIcon className="size-4.5" aria-hidden="true" />
          </div>
          <div>
            <h2 className="font-heading text-base sm:text-lg font-semibold text-foreground">
              Timing & Marks
            </h2>
            <p className="text-xs text-muted-foreground">
              Pacing constraints and score evaluation limits.
            </p>
          </div>
        </div>

        <div className="divide-y divide-border/60 pt-1">
          {/* Block Option 1: Duration */}
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between py-4 first:pt-1">
            <div className="space-y-0.5 max-w-sm">
              <div className="flex items-center gap-2">
                <Label
                  htmlFor="blueprint-field-durationMinutes"
                  className="text-sm font-semibold text-foreground"
                >
                  Duration
                </Label>
                <span className="text-[11px] font-mono text-muted-foreground">
                  {durationMinutes ? `${durationMinutes}m` : "Untimed"}
                </span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Exam pacing time limit in minutes. Leave blank for untimed testing.
              </p>
            </div>
            <div className="sm:shrink-0 w-full sm:w-52">
              <div className="relative">
                <Input
                  id="blueprint-field-durationMinutes"
                  name="durationMinutes"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={1440}
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(e.target.value)}
                  placeholder="Untimed"
                  className="h-10 pr-12 text-xs font-mono [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-mono text-muted-foreground/60 select-none">
                  min
                </span>
              </div>
            </div>
          </div>

          {/* Block Option 2: Total Marks */}
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between py-4">
            <div className="space-y-0.5 max-w-sm">
              <div className="flex items-center gap-2">
                <Label
                  htmlFor="blueprint-field-totalMarks"
                  className="text-sm font-semibold text-foreground"
                >
                  Total Marks
                </Label>
                <span className="text-[11px] font-mono text-muted-foreground">
                  {totalMarks ? `${totalMarks} pts` : "Dynamic"}
                </span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Maximum achievable score ceiling. Leave blank to sum question weights.
              </p>
            </div>
            <div className="sm:shrink-0 w-full sm:w-52">
              <div className="relative">
                <Input
                  id="blueprint-field-totalMarks"
                  name="totalMarks"
                  type="number"
                  inputMode="decimal"
                  min={0.01}
                  step="any"
                  value={totalMarks}
                  onChange={(e) => setTotalMarks(e.target.value)}
                  placeholder="Dynamic"
                  className="h-10 pr-12 text-xs font-mono [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-mono text-muted-foreground/60 select-none">
                  pts
                </span>
              </div>
            </div>
          </div>

          {/* Block Option 3: Virtual Calculator */}
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between py-4 last:pb-1">
            <div className="space-y-0.5 max-w-sm">
              <div className="flex items-center gap-2">
                <Label
                  htmlFor="blueprint-field-calculator"
                  className="text-sm font-semibold text-foreground cursor-pointer"
                >
                  Virtual Calculator
                </Label>
                <span className="text-[11px] font-mono text-muted-foreground">
                  {calculatorAllowed ? "Enabled" : "Disabled"}
                </span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Provide candidates with an on-screen scientific calculator during the CBT exam.
              </p>
            </div>
            <div className="sm:shrink-0 flex sm:justify-end w-full sm:w-52">
              <div
                onClick={() => setCalculatorAllowed((prev) => !prev)}
                className={cn(
                  "flex h-10 w-full sm:w-52 items-center justify-between rounded-xl border px-3.5 transition-colors cursor-pointer select-none",
                  calculatorAllowed
                    ? "border-foreground/30 bg-muted/40 text-foreground"
                    : "border-border/80 bg-background hover:bg-muted/20 text-muted-foreground"
                )}
              >
                <div className="flex items-center gap-2">
                  <CalculatorIcon className="size-4" aria-hidden="true" />
                  <span className="text-xs font-medium text-foreground">
                    {calculatorAllowed ? "Calculator On" : "Calculator Off"}
                  </span>
                </div>
                <Switch
                  id="blueprint-field-calculator"
                  name="calculatorAllowed"
                  checked={calculatorAllowed}
                  onCheckedChange={setCalculatorAllowed}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Segment 4: Score Benchmarks ── */}
      <div className="p-5 sm:p-7 space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-xl bg-muted text-foreground">
            <TrophyIcon className="size-4.5" aria-hidden="true" />
          </div>
          <div>
            <h2 className="font-heading text-base sm:text-lg font-semibold text-foreground">
              Score Benchmarks
            </h2>
            <p className="text-xs text-muted-foreground">
              Evaluation cut-off thresholds for candidate attempt performance cards.
            </p>
          </div>
        </div>

        <div className="divide-y divide-border/60 pt-1">
          {/* Block Option 1: Passing Cut-off */}
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between py-4 first:pt-1">
            <div className="space-y-0.5 max-w-sm">
              <div className="flex items-center gap-2">
                <Label
                  htmlFor="blueprint-field-passingBenchmark"
                  className="text-sm font-semibold text-foreground"
                >
                  Passing Cut-off
                </Label>
                <span className="font-mono text-[11px] text-muted-foreground">
                  {passingBenchmark}%
                </span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Minimum score percentage required to pass the assessment.
              </p>
            </div>
            <div className="sm:shrink-0 w-full sm:w-40">
              <div className="relative">
                <Input
                  id="blueprint-field-passingBenchmark"
                  name="passingBenchmark"
                  type="number"
                  min={1}
                  max={100}
                  value={passingBenchmark}
                  onChange={(e) => {
                    const val = e.target.value
                    if (val === "") {
                      setPassingBenchmark("")
                    } else {
                      const num = parseInt(val, 10)
                      if (!isNaN(num))
                        setPassingBenchmark(Math.min(100, Math.max(0, num)))
                    }
                  }}
                  placeholder="33"
                  className="h-10 pr-9 text-xs font-mono [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-mono text-muted-foreground/60 select-none">
                  %
                </span>
              </div>
            </div>
          </div>

          {/* Block Option 2: Distinction Cut-off */}
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between py-4">
            <div className="space-y-0.5 max-w-sm">
              <div className="flex items-center gap-2">
                <Label
                  htmlFor="blueprint-field-distinctionBenchmark"
                  className="text-sm font-semibold text-foreground"
                >
                  Distinction Cut-off
                </Label>
                <span className="font-mono text-[11px] text-muted-foreground">
                  {distinctionBenchmark}%
                </span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Honor score benchmark percentage for exceptional performance.
              </p>
            </div>
            <div className="sm:shrink-0 w-full sm:w-40">
              <div className="relative">
                <Input
                  id="blueprint-field-distinctionBenchmark"
                  name="distinctionBenchmark"
                  type="number"
                  min={1}
                  max={100}
                  value={distinctionBenchmark}
                  onChange={(e) => {
                    const val = e.target.value
                    if (val === "") {
                      setDistinctionBenchmark("")
                    } else {
                      const num = parseInt(val, 10)
                      if (!isNaN(num))
                        setDistinctionBenchmark(Math.min(100, Math.max(0, num)))
                    }
                  }}
                  placeholder="70"
                  aria-invalid={isBenchmarkConflict}
                  className={cn(
                    "h-10 pr-9 text-xs font-mono [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
                    isBenchmarkConflict &&
                      "border-destructive text-destructive focus-visible:ring-destructive"
                  )}
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-mono text-muted-foreground/60 select-none">
                  %
                </span>
              </div>
              {isBenchmarkConflict && (
                <p className="text-[11px] font-medium text-destructive flex items-center gap-1 pt-1.5 sm:justify-end">
                  <AlertCircleIcon className="size-3 shrink-0" />
                  Must exceed passing ({passingBenchmark}%)
                </p>
              )}
            </div>
          </div>

          {/* Block Option 3: Calibrated Benchmark Visual Scale */}
          <div className="py-4 last:pb-1 space-y-2.5">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">
                Performance Bands Preview
              </span>
              <span className="font-mono text-[11px]">0% to 100%</span>
            </div>
            <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden flex divide-x divide-background/80">
              <div
                style={{ width: `${Math.min(100, Math.max(0, passingNum))}%` }}
                className="bg-destructive/80 transition-all duration-300"
                title={`Fail (< ${passingNum}%)`}
              />
              <div
                style={{
                  width: `${Math.max(
                    0,
                    Math.min(100, distinctionNum) - Math.min(100, passingNum)
                  )}%`,
                }}
                className="bg-amber-500/80 transition-all duration-300"
                title={`Pass (${passingNum}% - ${distinctionNum}%)`}
              />
              <div
                style={{
                  width: `${Math.max(0, 100 - Math.min(100, distinctionNum))}%`,
                }}
                className="bg-emerald-500 transition-all duration-300"
                title={`Distinction (${distinctionNum}% - 100%)`}
              />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-1.5 text-[11px] font-mono">
              <span className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs text-destructive bg-destructive/10 font-medium">
                &lt; {passingNum}% Fail
              </span>
              <span className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs text-amber-700 dark:text-amber-400 bg-amber-500/10 font-medium">
                {passingNum}%+ Pass
              </span>
              <span className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 font-medium">
                {distinctionNum}%+ Distinction
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
