import {
  BookOpenIcon,
  LayersIcon,
  ListChecksIcon,
  SlidersHorizontalIcon,
  SparklesIcon,
} from "lucide-react"

export type PaperType =
  "full_length" | "multi_subject" | "subject_wise" | "topic_wise" | "pyq"

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
    activePillClass:
      "border-sky-500 bg-sky-500 text-white dark:text-zinc-900 shadow-xs",
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
    pillClass:
      "border-teal-500/30 bg-teal-500/10 text-teal-700 dark:text-teal-300",
    activePillClass:
      "border-teal-500 bg-teal-500 text-white dark:text-zinc-900 shadow-xs",
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
    pillClass:
      "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    activePillClass:
      "border-emerald-500 bg-emerald-500 text-white dark:text-zinc-900 shadow-xs",
    activeCardClass:
      "border-emerald-500/60 bg-emerald-500/[0.05] ring-1 ring-emerald-500/30",
    iconContainerClass:
      "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
    dotColorClass: "bg-emerald-500",
    description:
      "Targeted module evaluating mastery across a specific discipline",
    icon: BookOpenIcon,
  },
  {
    id: "topic_wise",
    label: "Topic Drill",
    shortLabel: "Concept Drill",
    badgeVariantClass:
      "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
    pillClass:
      "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
    activePillClass:
      "border-amber-500 bg-amber-500 text-white dark:text-zinc-900 shadow-xs",
    activeCardClass:
      "border-amber-500/60 bg-amber-500/[0.05] ring-1 ring-amber-500/30",
    iconContainerClass: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
    dotColorClass: "bg-amber-500",
    description:
      "Focused practice on high-yield concepts and specific problem types",
    icon: SlidersHorizontalIcon,
  },
  {
    id: "pyq",
    label: "Past Paper (PYQ)",
    shortLabel: "PYQ Archive",
    badgeVariantClass:
      "border-cyan-500/30 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300",
    pillClass:
      "border-cyan-500/30 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300",
    activePillClass:
      "border-cyan-500 bg-cyan-500 text-white dark:text-zinc-900 shadow-xs",
    activeCardClass:
      "border-cyan-500/60 bg-cyan-500/[0.05] ring-1 ring-cyan-500/30",
    iconContainerClass: "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400",
    dotColorClass: "bg-cyan-500",
    description:
      "Authentic previous year exam questions calibrated to official standards",
    icon: SparklesIcon,
  },
]
