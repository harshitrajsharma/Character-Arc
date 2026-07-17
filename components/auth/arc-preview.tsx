"use client"

import {
  BrainCircuitIcon,
  RouteIcon,
  SparklesIcon,
  TargetIcon,
} from "lucide-react"
import { motion } from "motion/react"

const arcSignals = [
  {
    label: "Current arc",
    value: "Ship the version only I can build",
    meta: "72%",
    icon: TargetIcon,
    accent: "bg-brand-neon text-brand-neon-foreground",
  },
  {
    label: "Vibe check",
    value: "Locked in",
    meta: "6 day streak",
    icon: SparklesIcon,
    accent: "bg-brand-amber text-brand-amber-foreground",
  },
  {
    label: "Skill tree",
    value: "Systems thinking",
    meta: "+3 evidence",
    icon: BrainCircuitIcon,
    accent: "bg-brand-cyan text-brand-cyan-foreground",
  },
  {
    label: "Open route",
    value: "Independent builder",
    meta: "84% match",
    icon: RouteIcon,
    accent: "bg-brand-violet text-brand-violet-foreground",
  },
]

export function ArcPreview() {
  return (
    <motion.div
      className="mt-12 max-w-xl border-y border-border"
      initial="hidden"
      animate="visible"
      variants={{
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: { delayChildren: 0.2, staggerChildren: 0.055 },
        },
      }}
    >
      {arcSignals.map((signal) => {
        const Icon = signal.icon

        return (
          <motion.div
            key={signal.label}
            className="grid min-h-20 grid-cols-[36px_minmax(0,1fr)_auto] items-center gap-4 border-b border-border py-3 last:border-b-0"
            variants={{
              hidden: { opacity: 0, y: 10 },
              visible: {
                opacity: 1,
                y: 0,
                transition: {
                  duration: 0.36,
                  ease: [0.22, 1, 0.36, 1],
                },
              },
            }}
          >
            <span
              className={`flex size-9 items-center justify-center rounded-lg ${signal.accent}`}
            >
              <Icon className="size-4" aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="block text-xs text-muted-foreground">
                {signal.label}
              </span>
              <span className="mt-1 block truncate text-sm font-medium text-foreground">
                {signal.value}
              </span>
            </span>
            <span className="font-mono text-xs text-muted-foreground">
              {signal.meta}
            </span>
          </motion.div>
        )
      })}
    </motion.div>
  )
}
