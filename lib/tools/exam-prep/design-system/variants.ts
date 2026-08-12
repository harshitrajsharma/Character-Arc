import { cva, type VariantProps } from "class-variance-authority"

import {
  focusRingTokens,
  progressModeTokens,
  layoutSpacingTokens,
  progressTokens,
  sectionHeadingTokens,
  statusTokens,
  surfaceTokens,
  typographyTokens,
} from "./tokens"

export const focusRingVariants = cva("outline-none", {
  variants: {
    ring: {
      default: focusRingTokens.base,
      subtle: focusRingTokens.subtle,
      inset: focusRingTokens.inset,
      danger: focusRingTokens.danger,
      none: "",
    },
  },
  defaultVariants: {
    ring: "default",
  },
})

export const surfaceVariants = cva("transition-colors", {
  variants: {
    variant: {
      page: surfaceTokens.page,
      canvas: surfaceTokens.canvas,
      default: surfaceTokens.default,
      muted: surfaceTokens.muted,
      elevated: surfaceTokens.elevated,
      inset: surfaceTokens.inset,
      glass: surfaceTokens.glass,
      interactive: surfaceTokens.interactive,
    },
    padding: {
      none: "",
      xs: "p-2",
      sm: "p-3",
      md: "p-4",
      lg: "p-6",
    },
    radius: {
      none: "rounded-none",
      sm: "rounded-sm",
      md: "rounded-md",
      lg: "rounded-lg",
      xl: "rounded-xl",
      full: "rounded-full",
    },
  },
  defaultVariants: {
    variant: "default",
    padding: "md",
    radius: "lg",
  },
})

export const typographyVariants = cva("", {
  variants: {
    variant: {
      display: typographyTokens.display,
      pageTitle: typographyTokens.pageTitle,
      sectionTitle: typographyTokens.sectionTitle,
      subsectionTitle: typographyTokens.subsectionTitle,
      label: typographyTokens.label,
      body: typographyTokens.body,
      bodyMuted: typographyTokens.bodyMuted,
      caption: typographyTokens.caption,
      eyebrow: typographyTokens.eyebrow,
      metric: typographyTokens.metric,
    },
    wrap: {
      default: "",
      balance: "text-balance",
      truncate: "truncate",
    },
  },
  defaultVariants: {
    variant: "body",
    wrap: "default",
  },
})

export const statusVariants = cva(
  "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      intent: {
        neutral: statusTokens.neutral.badge,
        info: statusTokens.info.badge,
        success: statusTokens.success.badge,
        warning: statusTokens.warning.badge,
        danger: statusTokens.danger.badge,
      },
      size: {
        sm: "px-2 py-0.5 text-xs",
        md: "px-2.5 py-1 text-xs",
        lg: "px-3 py-1 text-sm",
      },
    },
    defaultVariants: {
      intent: "neutral",
      size: "sm",
    },
  }
)

export const statusSurfaceVariants = cva("rounded-lg border", {
  variants: {
    intent: {
      neutral: statusTokens.neutral.surface,
      info: statusTokens.info.surface,
      success: statusTokens.success.surface,
      warning: statusTokens.warning.surface,
      danger: statusTokens.danger.surface,
    },
    padding: {
      sm: "p-3",
      md: "p-4",
      lg: "p-6",
    },
  },
  defaultVariants: {
    intent: "neutral",
    padding: "md",
  },
})

export const appSurfaceVariants = cva("transition-all", {
  variants: {
    variant: {
      header:
        "border-b border-black/20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 dark:border-white/20",
      footer:
        "border-t border-black/20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 dark:border-white/20",
      dropdown:
        "rounded-xl border border-black/20 bg-background/80 shadow-2xl backdrop-blur-md supports-[backdrop-filter]:bg-background/60 dark:border-white/20",
      glass:
        "border border-white/20 bg-white/10 shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-black/10",
      panel: "rounded-xl border bg-background/95 shadow-lg backdrop-blur-sm",
      tile: "rounded-lg border bg-muted/30 transition-colors hover:bg-muted/50",
    },
    padding: {
      none: "",
      sm: "p-2",
      md: "p-3",
      lg: "p-4",
      xl: "p-6",
    },
  },
  defaultVariants: {
    variant: "panel",
    padding: "md",
  },
})

export const metricTileVariants = cva(
  "relative overflow-hidden rounded-lg transition-colors",
  {
    variants: {
      variant: {
        neutral: "border border-border bg-muted/30 text-foreground",
        subtle: "bg-black/5 text-foreground dark:bg-white/5",
        success:
          "border border-emerald-500/10 bg-emerald-500/5 text-emerald-600 hover:bg-emerald-500/10 dark:bg-emerald-500/10 dark:text-emerald-400",
        warning:
          "border border-amber-500/10 bg-amber-500/5 text-amber-600 hover:bg-amber-500/10 dark:bg-amber-500/10 dark:text-amber-400",
        learning: `${progressModeTokens.learning.bgSoft} ${progressModeTokens.learning.textStrong} ${progressModeTokens.learning.border}`,
        revision: `${progressModeTokens.revision.bgSoft} ${progressModeTokens.revision.textStrong} ${progressModeTokens.revision.border}`,
        practice: `${progressModeTokens.practice.bgSoft} ${progressModeTokens.practice.textStrong} ${progressModeTokens.practice.border}`,
        test: `${progressModeTokens.test.bgSoft} ${progressModeTokens.test.textStrong} ${progressModeTokens.test.border}`,
      },
      padding: {
        none: "",
        sm: "p-2",
        md: "p-2.5",
        lg: "p-3",
        xl: "p-4",
      },
      interactive: {
        true: "hover:scale-[1.02] hover:shadow-md",
        false: "",
      },
    },
    defaultVariants: {
      variant: "neutral",
      padding: "md",
      interactive: false,
    },
  }
)

export const iconFrameVariants = cva(
  "inline-flex shrink-0 items-center justify-center rounded-lg transition-colors",
  {
    variants: {
      variant: {
        neutral: "bg-muted/50 text-muted-foreground",
        primary: "bg-primary/10 text-primary",
        learning: `${progressModeTokens.learning.bgSoft} ${progressModeTokens.learning.text}`,
        revision: `${progressModeTokens.revision.bgSoft} ${progressModeTokens.revision.text}`,
        practice: `${progressModeTokens.practice.bgSoft} ${progressModeTokens.practice.text}`,
        test: `${progressModeTokens.test.bgSoft} ${progressModeTokens.test.text}`,
        glass: "bg-background/50 text-foreground shadow-sm backdrop-blur-md",
      },
      size: {
        sm: "h-7 w-7 p-1",
        md: "h-8 w-8 p-1.5",
        lg: "h-10 w-10 p-2",
      },
    },
    defaultVariants: {
      variant: "neutral",
      size: "md",
    },
  }
)

export const meterTrackVariants = cva(
  "relative w-full overflow-hidden rounded-full border border-black/5 bg-secondary/30 shadow-inner backdrop-blur-md dark:border-white/5",
  {
    variants: {
      size: {
        sm: "h-1.5",
        md: "h-2",
        lg: "h-2.5",
        xl: "h-3.5",
        responsive: "h-2.5 sm:h-4",
      },
    },
    defaultVariants: {
      size: "md",
    },
  }
)

export const skeletonBlockVariants = cva("animate-pulse rounded-lg bg-muted", {
  variants: {
    height: {
      sm: "h-8",
      md: "h-12",
      lg: "h-16",
      xl: "h-24",
      "2xl": "h-32",
      "3xl": "h-40",
    },
    width: {
      full: "w-full",
      sm: "w-24",
      md: "w-40",
      lg: "w-56",
    },
  },
  defaultVariants: {
    height: "md",
    width: "full",
  },
})

export const progressTrackVariants = cva(
  "relative w-full overflow-hidden rounded-full",
  {
    variants: {
      tone: {
        default: progressTokens.track,
        strong: progressTokens.trackStrong,
      },
      size: {
        sm: "h-1.5",
        md: "h-2",
        lg: "h-3",
      },
    },
    defaultVariants: {
      tone: "default",
      size: "md",
    },
  }
)

export const progressIndicatorVariants = cva(
  "h-full w-full flex-1 transform-gpu transition-transform duration-500 ease-out",
  {
    variants: {
      intent: {
        default: progressTokens.indicator,
        muted: progressTokens.indicatorMuted,
        info: progressTokens.indicatorInfo,
        success: progressTokens.indicatorSuccess,
        warning: progressTokens.indicatorWarning,
        danger: progressTokens.indicatorDanger,
      },
    },
    defaultVariants: {
      intent: "default",
    },
  }
)

export const sectionHeadingVariants = cva(sectionHeadingTokens.root, {
  variants: {
    size: {
      sm: "",
      md: "",
      lg: "",
    },
    align: {
      start: "items-start",
      center: "items-center",
    },
    spacing: {
      tight: "mb-3",
      default: "mb-4",
      loose: "mb-6",
      none: "",
    },
  },
  defaultVariants: {
    size: "md",
    align: "start",
    spacing: "default",
  },
})

export const sectionHeadingTitleVariants = cva("", {
  variants: {
    size: {
      sm: typographyTokens.subsectionTitle,
      md: typographyTokens.sectionTitle,
      lg: typographyTokens.pageTitle,
    },
  },
  defaultVariants: {
    size: "md",
  },
})

export const layoutVariants = cva("", {
  variants: {
    variant: {
      page: layoutSpacingTokens.page,
      pageCompact: layoutSpacingTokens.pageCompact,
      section: layoutSpacingTokens.section,
      sectionCompact: layoutSpacingTokens.sectionCompact,
      stack: layoutSpacingTokens.stack,
      stackTight: layoutSpacingTokens.stackTight,
      cluster: layoutSpacingTokens.cluster,
      split: layoutSpacingTokens.split,
      gridCards: layoutSpacingTokens.gridCards,
      gridDense: layoutSpacingTokens.gridDense,
    },
  },
  defaultVariants: {
    variant: "section",
  },
})

export type FocusRingVariants = VariantProps<typeof focusRingVariants>
export type SurfaceVariants = VariantProps<typeof surfaceVariants>
export type TypographyVariants = VariantProps<typeof typographyVariants>
export type StatusVariants = VariantProps<typeof statusVariants>
export type StatusSurfaceVariants = VariantProps<typeof statusSurfaceVariants>
export type AppSurfaceVariants = VariantProps<typeof appSurfaceVariants>
export type MetricTileVariants = VariantProps<typeof metricTileVariants>
export type IconFrameVariants = VariantProps<typeof iconFrameVariants>
export type MeterTrackVariants = VariantProps<typeof meterTrackVariants>
export type SkeletonBlockVariants = VariantProps<typeof skeletonBlockVariants>
export type ProgressTrackVariants = VariantProps<typeof progressTrackVariants>
export type ProgressIndicatorVariants = VariantProps<
  typeof progressIndicatorVariants
>
export type SectionHeadingVariants = VariantProps<typeof sectionHeadingVariants>
export type SectionHeadingTitleVariants = VariantProps<
  typeof sectionHeadingTitleVariants
>
export type LayoutVariants = VariantProps<typeof layoutVariants>
