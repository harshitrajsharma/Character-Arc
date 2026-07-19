export const focusRingTokens = {
  base: "outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
  subtle:
    "outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background",
  inset: "outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
  danger:
    "outline-none focus-visible:ring-2 focus-visible:ring-destructive focus-visible:ring-offset-2 focus-visible:ring-offset-background",
} as const

export const surfaceTokens = {
  page: "bg-background text-foreground",
  canvas: "bg-muted/30 text-foreground",
  default: "rounded-lg border bg-card text-card-foreground shadow-sm",
  muted: "rounded-lg border bg-muted/50 text-foreground",
  elevated: "rounded-lg border bg-card text-card-foreground shadow-md",
  inset: "rounded-md border bg-background text-foreground shadow-inner",
  glass:
    "rounded-lg border border-white/20 bg-white/10 text-foreground shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-black/10",
  interactive:
    "rounded-lg border bg-card text-card-foreground shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground",
} as const

export const typographyTokens = {
  display:
    "scroll-m-20 text-4xl font-semibold tracking-normal text-foreground lg:text-5xl",
  pageTitle:
    "scroll-m-20 text-3xl font-semibold tracking-normal text-foreground",
  sectionTitle:
    "scroll-m-20 text-2xl font-semibold tracking-normal text-foreground",
  subsectionTitle: "text-lg font-semibold tracking-normal text-foreground",
  label: "text-sm font-medium leading-none text-foreground",
  body: "text-sm leading-6 text-foreground",
  bodyMuted: "text-sm leading-6 text-muted-foreground",
  caption: "text-xs leading-5 text-muted-foreground",
  eyebrow:
    "text-xs font-semibold uppercase leading-none tracking-normal text-muted-foreground",
  metric: "text-2xl font-semibold tabular-nums tracking-normal text-foreground",
} as const

export const statusTokens = {
  neutral: {
    badge:
      "border-border bg-muted text-muted-foreground hover:bg-muted/80",
    surface: "border-border bg-muted/50 text-muted-foreground",
    text: "text-muted-foreground",
    dot: "bg-muted-foreground",
    progress: "bg-muted-foreground",
  },
  info: {
    badge:
      "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-300",
    surface:
      "border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-100",
    text: "text-blue-700 dark:text-blue-300",
    dot: "bg-blue-500",
    progress: "bg-blue-500",
  },
  success: {
    badge:
      "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300",
    surface:
      "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-100",
    text: "text-emerald-700 dark:text-emerald-300",
    dot: "bg-emerald-500",
    progress: "bg-emerald-500",
  },
  warning: {
    badge:
      "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300",
    surface:
      "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100",
    text: "text-amber-700 dark:text-amber-300",
    dot: "bg-amber-500",
    progress: "bg-amber-500",
  },
  danger: {
    badge:
      "border-destructive/20 bg-destructive/10 text-destructive hover:bg-destructive/15",
    surface: "border-destructive/20 bg-destructive/10 text-destructive",
    text: "text-destructive",
    dot: "bg-destructive",
    progress: "bg-destructive",
  },
} as const

export const progressModeTokens = {
  learning: {
    label: "Learning",
    text: "text-blue-500",
    textStrong: "text-blue-600 dark:text-blue-300",
    bg: "bg-blue-500",
    bgSoft: "bg-blue-500/10",
    border: "border-blue-500/30",
    ring: "ring-blue-500/20",
    dataChecked:
      "data-[state=checked]:border-blue-500 data-[state=checked]:bg-blue-500",
  },
  revision: {
    label: "Revision",
    text: "text-green-500",
    textStrong: "text-green-600 dark:text-green-300",
    bg: "bg-green-500",
    bgSoft: "bg-green-500/10",
    border: "border-green-500/30",
    ring: "ring-green-500/20",
    dataChecked:
      "data-[state=checked]:border-green-500 data-[state=checked]:bg-green-500",
  },
  practice: {
    label: "Practice",
    text: "text-amber-500",
    textStrong: "text-amber-600 dark:text-amber-300",
    bg: "bg-amber-500",
    bgSoft: "bg-amber-500/10",
    border: "border-amber-500/30",
    ring: "ring-amber-500/20",
    dataChecked:
      "data-[state=checked]:border-amber-500 data-[state=checked]:bg-amber-500",
  },
  test: {
    label: "Test",
    text: "text-purple-500",
    textStrong: "text-purple-600 dark:text-purple-300",
    bg: "bg-purple-500",
    bgSoft: "bg-purple-500/10",
    border: "border-purple-500/30",
    ring: "ring-purple-500/20",
    dataChecked:
      "data-[state=checked]:border-purple-500 data-[state=checked]:bg-purple-500",
  },
} as const

export const foundationTokens = {
  Beginner: {
    label: "Beginner",
    text: "text-violet-500",
    textStrong: "text-violet-600 dark:text-violet-300",
    bg: "bg-violet-500",
    bgSoft: "bg-violet-500/10",
    border: "border-violet-500/30",
  },
  Moderate: {
    label: "Moderate",
    text: "text-orange-500",
    textStrong: "text-orange-600 dark:text-orange-300",
    bg: "bg-orange-500",
    bgSoft: "bg-orange-500/10",
    border: "border-orange-500/30",
  },
  Advanced: {
    label: "Advanced",
    text: "text-rose-500",
    textStrong: "text-rose-600 dark:text-rose-300",
    bg: "bg-rose-500",
    bgSoft: "bg-rose-500/10",
    border: "border-rose-500/30",
  },
} as const

export const progressTokens = {
  track: "bg-muted",
  trackStrong: "bg-muted-foreground/20",
  indicator: "bg-primary",
  indicatorMuted: "bg-muted-foreground",
  indicatorInfo: statusTokens.info.progress,
  indicatorSuccess: statusTokens.success.progress,
  indicatorWarning: statusTokens.warning.progress,
  indicatorDanger: statusTokens.danger.progress,
  label: "text-xs font-medium tabular-nums text-muted-foreground",
} as const

export const sectionHeadingTokens = {
  root: "flex min-w-0 items-start justify-between gap-4",
  content: "min-w-0 space-y-1",
  title: typographyTokens.sectionTitle,
  description: typographyTokens.bodyMuted,
  actions: "flex shrink-0 items-center gap-2",
} as const

export const layoutSpacingTokens = {
  page: "mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8",
  pageCompact: "mx-auto w-full max-w-7xl px-4 py-4 sm:px-6 lg:px-8",
  section: "space-y-6",
  sectionCompact: "space-y-4",
  stack: "space-y-4",
  stackTight: "space-y-2",
  cluster: "flex flex-wrap items-center gap-2",
  split: "flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between",
  gridCards: "grid gap-4 sm:grid-cols-2 lg:grid-cols-3",
  gridDense: "grid gap-3 sm:grid-cols-2 lg:grid-cols-4",
} as const

export type FocusRingToken = keyof typeof focusRingTokens
export type SurfaceToken = keyof typeof surfaceTokens
export type TypographyToken = keyof typeof typographyTokens
export type StatusToken = keyof typeof statusTokens
export type ProgressModeToken = keyof typeof progressModeTokens
export type FoundationToken = keyof typeof foundationTokens
export type ProgressToken = keyof typeof progressTokens
export type SectionHeadingToken = keyof typeof sectionHeadingTokens
export type LayoutSpacingToken = keyof typeof layoutSpacingTokens
