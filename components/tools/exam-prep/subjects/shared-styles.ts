export const progressVariants = {
  learning: {
    low: "bg-destructive",
    medium: "bg-brand-amber",
    high: "bg-brand-cyan",
    text: "text-brand-cyan-ink",
    badge: "bg-brand-cyan-soft text-brand-cyan-ink hover:bg-brand-cyan-line",
  },
  revision: {
    low: "bg-destructive",
    medium: "bg-brand-amber",
    high: "bg-brand-neon",
    text: "text-brand-neon-ink",
    badge: "bg-brand-neon-soft text-brand-neon-ink hover:bg-brand-neon-line",
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
    "aria-pressed:!bg-brand-cyan aria-pressed:!text-brand-cyan-foreground",
  revision:
    "aria-pressed:!bg-brand-neon aria-pressed:!text-brand-neon-foreground",
  practice:
    "aria-pressed:!bg-brand-amber aria-pressed:!text-brand-amber-foreground",
  test: "aria-pressed:!bg-brand-violet aria-pressed:!text-brand-violet-foreground",
}

export const highYieldBadgeClass =
  "border-brand-amber-line bg-brand-amber-soft text-brand-amber-ink hover:bg-brand-amber-soft"

export const getFoundationLevelColor = (level: string) => {
  switch (level.toLowerCase()) {
    case "beginner":
      return "text-brand-cyan-ink"
    case "moderate":
      return "text-brand-amber-ink"
    case "advanced":
      return "text-destructive"
    default:
      return "text-muted-foreground"
  }
}

export const getFoundationLevelBG = (level: string) => {
  switch (level.toLowerCase()) {
    case "beginner":
      return "bg-brand-cyan"
    case "moderate":
      return "bg-brand-amber"
    case "advanced":
      return "bg-destructive"
    default:
      return "bg-muted"
  }
}

export const categoryVariants = {
  "not-started": {
    badge: "bg-destructive/10 text-destructive",
    cardHover: "hover:bg-destructive/5 bg-destructive/[0.02]",
  },
  "in-progress": {
    badge: "bg-brand-cyan-soft text-brand-cyan-ink",
    cardHover: "hover:bg-brand-cyan/5 bg-brand-cyan/[0.02]",
  },
  completed: {
    badge: "bg-brand-neon-soft text-brand-neon-ink",
    cardHover: "hover:bg-brand-neon/5 bg-brand-neon/[0.02]",
  },
}

