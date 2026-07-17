export const ARC_THEMES = [
  {
    key: "minimal",
    label: "Minimal",
    canvasClass: "bg-canvas-minimal",
    coverClass: "border-border bg-card text-card-foreground",
    accentClass: "bg-foreground text-background",
    softClass: "bg-muted text-muted-foreground",
    lineClass: "bg-border",
    swatchClass: "bg-canvas-minimal",
    swatchAccentClass: "bg-foreground",
  },
  {
    key: "electric",
    label: "Electric",
    canvasClass: "bg-canvas-electric",
    coverClass:
      "border-brand-neon-line bg-brand-contrast text-brand-neon-foreground",
    accentClass: "bg-brand-neon text-brand-neon-foreground",
    softClass: "bg-brand-neon-soft text-brand-neon-foreground",
    lineClass: "bg-brand-neon",
    swatchClass: "bg-canvas-electric",
    swatchAccentClass: "bg-brand-neon",
  },
  {
    key: "signal",
    label: "Signal",
    canvasClass: "bg-canvas-signal",
    coverClass:
      "border-brand-cyan-line bg-brand-contrast text-brand-neon-foreground",
    accentClass: "bg-brand-cyan text-brand-cyan-foreground",
    softClass: "bg-brand-cyan-soft text-brand-neon-foreground",
    lineClass: "bg-brand-cyan",
    swatchClass: "bg-canvas-signal",
    swatchAccentClass: "bg-brand-cyan",
  },
  {
    key: "afterglow",
    label: "Afterglow",
    canvasClass: "bg-canvas-afterglow",
    coverClass:
      "border-brand-violet-line bg-brand-contrast text-brand-neon-foreground",
    accentClass: "bg-brand-violet text-brand-violet-foreground",
    softClass: "bg-brand-violet-soft text-brand-neon-foreground",
    lineClass: "bg-brand-violet",
    swatchClass: "bg-canvas-afterglow",
    swatchAccentClass: "bg-brand-violet",
  },
  {
    key: "golden",
    label: "Golden",
    canvasClass: "bg-canvas-golden",
    coverClass:
      "border-brand-amber-line bg-brand-contrast text-brand-neon-foreground",
    accentClass: "bg-brand-amber text-brand-amber-foreground",
    softClass: "bg-brand-amber-soft text-brand-neon-foreground",
    lineClass: "bg-brand-amber",
    swatchClass: "bg-canvas-golden",
    swatchAccentClass: "bg-brand-amber",
  },
] as const

export type ArcTheme = (typeof ARC_THEMES)[number]
export type ArcThemeKey = ArcTheme["key"]

export function getArcTheme(key: ArcThemeKey) {
  return ARC_THEMES.find((theme) => theme.key === key) ?? ARC_THEMES[0]
}
