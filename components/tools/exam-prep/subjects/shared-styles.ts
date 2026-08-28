export const progressVariants = {
  learning: {
    low: "bg-destructive",
    medium: "bg-brand-amber",
    high: "bg-brand-violet",
    text: "text-brand-violet-ink",
    badge: "bg-brand-violet-soft text-brand-violet-ink hover:bg-brand-violet-line",
  },
  revision: {
    low: "bg-destructive",
    medium: "bg-brand-amber",
    high: "bg-brand-violet",
    text: "text-brand-violet-ink",
    badge: "bg-brand-violet-soft text-brand-violet-ink hover:bg-brand-violet-line",
  },
  practice: {
    low: "bg-destructive",
    medium: "bg-brand-amber",
    high: "bg-brand-amber",
    text: "text-brand-amber-ink",
    badge: "bg-brand-amber-soft text-brand-amber-ink hover:bg-brand-amber-line",
  },
  test: {
    low: "bg-destructive",
    medium: "bg-brand-amber",
    high: "bg-brand-violet",
    text: "text-brand-violet-ink",
    badge:
      "bg-brand-violet-soft text-brand-violet-ink hover:bg-brand-violet-line",
  },
}

export const stageActiveVariants = {
  learning:
    "aria-pressed:!bg-brand-violet aria-pressed:!text-brand-violet-foreground",
  revision:
    "aria-pressed:!bg-brand-violet aria-pressed:!text-brand-violet-foreground",
  practice:
    "aria-pressed:!bg-brand-amber aria-pressed:!text-brand-amber-foreground",
  test: "aria-pressed:!bg-brand-violet aria-pressed:!text-brand-violet-foreground",
}

export const highYieldBadgeClass =
  "border-brand-amber-line bg-brand-amber-soft text-brand-amber-ink hover:bg-brand-amber-soft"

export const getFoundationLevelColor = (level: string) => {
  switch (level.toLowerCase()) {
    case "beginner":
      return "text-muted-foreground"
    case "moderate":
      return "text-brand-amber-ink"
    case "advanced":
      return "text-success-ink"
    default:
      return "text-muted-foreground"
  }
}

export const getFoundationLevelBG = (level: string) => {
  switch (level.toLowerCase()) {
    case "beginner":
      return "bg-muted-foreground"
    case "moderate":
      return "bg-brand-amber"
    case "advanced":
      return "bg-success"
    default:
      return "bg-muted"
  }
}

export const categoryVariants = {
  "not-started": {
    badge: "bg-muted text-muted-foreground",
    cardHover: "hover:bg-muted/50 bg-muted/20",
  },
  "in-progress": {
    badge: "bg-brand-violet-soft text-brand-violet-ink",
    cardHover: "hover:bg-brand-violet-soft/50 bg-brand-violet-soft/20",
  },
  completed: {
    badge: "bg-success-soft text-success-ink",
    cardHover: "hover:bg-success-soft/50 bg-success-soft/20",
  },
}
