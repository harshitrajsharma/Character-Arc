import {
  HandshakeIcon,
  HistoryIcon,
  ScrollTextIcon,
  ShieldCheckIcon,
} from "lucide-react"

import {
  LandingContainer,
  Reveal,
} from "@/components/landing/primitives"

const PRINCIPLES = [
  {
    title: "Evidence-first outcomes",
    description:
      "Progress comes from recorded attempts and decisions, not chat scrollback.",
    icon: ScrollTextIcon,
  },
  {
    title: "Private by default",
    description:
      "Your workspace stays closed until you explicitly grant an agent access.",
    icon: ShieldCheckIcon,
  },
  {
    title: "Works with your AI",
    description:
      "Bring ChatGPT, Claude, or a local agent. Your AI supplies intelligence; Character Arc supplies structure.",
    icon: HandshakeIcon,
  },
  {
    title: "Progress you can audit",
    description:
      "Every change keeps its evidence trail, so you can check why anything moved.",
    icon: HistoryIcon,
  },
] as const

export function LandingPrinciples() {
  return (
    <section aria-labelledby="principles-title" className="border-y border-border">
      <LandingContainer className="py-16 sm:py-24">
        <Reveal>
          <h2
            id="principles-title"
            className="text-center font-heading text-2xl font-semibold tracking-tight sm:text-3xl"
          >
            Built on principles you can hold it to
          </h2>
        </Reveal>
        <ul className="mt-12 grid gap-x-8 gap-y-10 sm:mt-16 sm:grid-cols-2 lg:grid-cols-4">
          {PRINCIPLES.map((principle) => (
            <li key={principle.title}>
              <Reveal>
                <span className="flex size-10 items-center justify-center rounded-lg bg-muted text-foreground">
                  <principle.icon aria-hidden="true" className="size-4.5" />
                </span>
                <h3 className="mt-4 font-heading text-base font-semibold">
                  {principle.title}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  {principle.description}
                </p>
              </Reveal>
            </li>
          ))}
        </ul>
      </LandingContainer>
    </section>
  )
}
