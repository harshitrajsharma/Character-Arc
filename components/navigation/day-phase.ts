export type DayPhaseKey =
  "night" | "dawn" | "morning" | "afternoon" | "golden" | "evening"

export type DayPhase = {
  key: DayPhaseKey
  cssVar: string
  accentCssVar: string
  message: string
}

const PHASES: Record<DayPhaseKey, DayPhase> = {
  night: {
    key: "night",
    cssVar: "var(--phase-night)",
    accentCssVar: "var(--phase-night-accent)",
    message: "Rest and recharge.",
  },
  dawn: {
    key: "dawn",
    cssVar: "var(--phase-dawn)",
    accentCssVar: "var(--phase-dawn-accent)",
    message: "A gentle start to the day.",
  },
  morning: {
    key: "morning",
    cssVar: "var(--phase-morning)",
    accentCssVar: "var(--phase-morning-accent)",
    message: "Build a little momentum.",
  },
  afternoon: {
    key: "afternoon",
    cssVar: "var(--phase-afternoon)",
    accentCssVar: "var(--phase-afternoon-accent)",
    message: "Keep your arc moving.",
  },
  golden: {
    key: "golden",
    cssVar: "var(--phase-golden)",
    accentCssVar: "var(--phase-golden-accent)",
    message: "Wind down and reflect.",
  },
  evening: {
    key: "evening",
    cssVar: "var(--phase-evening)",
    accentCssVar: "var(--phase-evening-accent)",
    message: "Close the loop, then rest.",
  },
}

export function getDayPhase(progress: number): DayPhase {
  const normalizedProgress = Math.min(Math.max(progress, 0), 100)

  // 12:00 AM–5:00 AM
  if (normalizedProgress < 20.83) return PHASES.night

  // 5:00 AM–9:00 AM
  if (normalizedProgress < 37.5) return PHASES.dawn

  // 9:00 AM–1:00 PM
  if (normalizedProgress < 54.17) return PHASES.morning

  // 1:00 PM–5:00 PM
  if (normalizedProgress < 70.83) return PHASES.afternoon

  // 5:00 PM–9:00 PM
  if (normalizedProgress < 87.5) return PHASES.golden

  // 9:00 PM–12:00 AM
  return PHASES.evening
}

export function dayProgress(date = new Date()): number {
  const elapsedSeconds =
    date.getHours() * 3600 +
    date.getMinutes() * 60 +
    date.getSeconds() +
    date.getMilliseconds() / 1000

  return (elapsedSeconds / 86400) * 100
}
