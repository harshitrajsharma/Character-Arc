import {
  BotIcon,
  ClipboardCheckIcon,
  DownloadIcon,
} from "lucide-react"

import {
  LandingContainer,
  Reveal,
} from "@/components/landing/primitives"
import { cn } from "@/lib/utils"

const STEPS = [
  {
    number: "01",
    title: "Install a tool",
    description:
      "Pick a tool like Exam Prep from the catalog and add it to your workspace. Each tool arrives with its own structure, rules, and progress model.",
    icon: DownloadIcon,
    tile: "bg-brand-violet-soft text-brand-violet-ink",
  },
  {
    number: "02",
    title: "Work with any AI agent",
    description:
      "ChatGPT, Claude, and local agents act through strict tool contracts over MCP, so generated work lands in the right place with validated inputs.",
    icon: BotIcon,
    tile: "bg-brand-cyan-soft text-brand-cyan-ink",
  },
  {
    number: "03",
    title: "See evidence-backed outcomes",
    description:
      "Every action becomes structured progress — plans, attempts, and decisions you can review instead of scrolling back through chats.",
    icon: ClipboardCheckIcon,
    tile: "bg-brand-amber-soft text-brand-amber-ink",
  },
] as const

export function LandingHowItWorks() {
  return (
    <section aria-labelledby="how-it-works-title">
      <LandingContainer className="py-16 sm:py-24">
        <Reveal>
          <h2
            id="how-it-works-title"
            className="text-center font-heading text-2xl font-semibold tracking-tight sm:text-3xl"
          >
            How it works
          </h2>
        </Reveal>
        <ol className="mt-12 grid gap-10 sm:mt-16 md:grid-cols-3 md:gap-8">
          {STEPS.map((step) => (
            <li key={step.number}>
              <Reveal>
                <div className="flex items-start justify-between gap-4">
                  <span
                    className={cn(
                      "flex size-11 items-center justify-center rounded-lg border border-border/60",
                      step.tile
                    )}
                  >
                    <step.icon aria-hidden="true" className="size-5" />
                  </span>
                  <span
                    aria-hidden="true"
                    className="font-heading text-4xl font-semibold text-muted-foreground/40"
                  >
                    {step.number}
                  </span>
                </div>
                <h3 className="mt-5 font-heading text-lg font-semibold">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {step.description}
                </p>
              </Reveal>
            </li>
          ))}
        </ol>
      </LandingContainer>
    </section>
  )
}
