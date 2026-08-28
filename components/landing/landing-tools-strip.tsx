import {
  ChartNoAxesColumnIcon,
  CircleCheckIcon,
  GraduationCapIcon,
  ListChecksIcon,
  RouteIcon,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import {
  LandingContainer,
  Reveal,
} from "@/components/landing/primitives"

const TOOLS = [
  {
    name: "Exam Prep",
    description:
      "Track subjects, chapters, and topics through four study stages: Learn, Revise, Practice, and Test.",
    icon: GraduationCapIcon,
    tile: "bg-brand-violet-soft text-brand-violet-ink",
    secondary: null,
  },
  {
    name: "Goals & Paths",
    description:
      "Turn your current reality into possible paths, milestones, and clear next actions.",
    icon: RouteIcon,
    tile: "bg-brand-neon-soft text-brand-neon-ink",
    secondary: null,
  },
  {
    name: "Mock Tests",
    description:
      "Create, attempt, and analyze tests in any competitive pattern — with scoring rules, sections, and progress feedback.",
    icon: ListChecksIcon,
    tile: "bg-brand-violet-soft text-brand-violet-ink",
    secondary: {
      icon: ChartNoAxesColumnIcon,
      tile: "bg-brand-cyan-soft text-brand-cyan-ink",
    },
  },
] as const

export function LandingToolsStrip() {
  return (
    <section aria-labelledby="tools-title">
      <LandingContainer className="pb-16 sm:pb-24">
        <Reveal>
          <h2
            id="tools-title"
            className="text-center font-heading text-2xl font-semibold tracking-tight sm:text-3xl"
          >
            Tools you can install today
          </h2>
        </Reveal>
        <Reveal delay={0.08} className="mt-10 sm:mt-12">
          <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
            {TOOLS.map((tool) => (
              <li
                key={tool.name}
                className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:gap-6 sm:p-6"
              >
                <div className="flex shrink-0 items-center gap-1.5">
                  <span
                    className={`flex size-11 items-center justify-center rounded-lg ${tool.tile}`}
                  >
                    <tool.icon aria-hidden="true" className="size-5" />
                  </span>
                  {tool.secondary ? (
                    <span
                      className={`flex size-8 items-center justify-center rounded-lg ${tool.secondary.tile}`}
                    >
                      <tool.secondary.icon
                        aria-hidden="true"
                        className="size-4"
                      />
                    </span>
                  ) : null}
                </div>
                <div className="flex-1">
                  <h3 className="font-heading text-base font-semibold">
                    {tool.name}
                  </h3>
                  <p className="mt-1 max-w-prose text-sm leading-relaxed text-muted-foreground">
                    {tool.description}
                  </p>
                </div>
                <Badge variant="outline" className="shrink-0 self-start sm:self-center">
                  <CircleCheckIcon aria-hidden="true" />
                  Included
                </Badge>
              </li>
            ))}
          </ul>
        </Reveal>
      </LandingContainer>
    </section>
  )
}
