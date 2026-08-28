import Link from "next/link"
import { ArrowRightIcon, LockKeyholeIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  LandingContainer,
  Reveal,
} from "@/components/landing/primitives"

export function LandingHero() {
  return (
    <section className="border-b border-border">
      <LandingContainer className="flex flex-col items-center py-16 text-center sm:py-24 lg:py-28">
        <Reveal>
          <p className="inline-flex items-center gap-2 rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-muted-foreground sm:text-sm">
            <span
              aria-hidden="true"
              className="size-1.5 shrink-0 rounded-full bg-brand-neon"
            />
            Installable tools for real outcomes
          </p>
        </Reveal>
        <Reveal delay={0.06} className="mt-6">
          <h1 className="max-w-3xl text-balance font-heading text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl lg:leading-[1.08]">
            Turn AI conversations into progress you can trust
          </h1>
        </Reveal>
        <Reveal delay={0.12} className="mt-5 max-w-xl sm:mt-6">
          <p className="text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
            Install a strict tool into your workspace, work through the AI
            assistant you already use, and keep every plan, practice session,
            and outcome in one trustworthy place.
          </p>
        </Reveal>
        <Reveal delay={0.18} className="mt-8 sm:mt-10">
          <div className="flex flex-col items-center gap-3 sm:flex-row">
            <Button size="lg" render={<Link href="/signup" />}>
              Start building your arc
              <ArrowRightIcon data-icon="inline-end" />
            </Button>
            <Button variant="outline" size="lg" render={<Link href="/login" />}>
              Sign in
            </Button>
          </div>
        </Reveal>
        <Reveal delay={0.24} className="mt-6">
          <p className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <LockKeyholeIcon aria-hidden="true" className="size-3.5" />
            Private by default — agents only access what you explicitly allow.
          </p>
        </Reveal>
      </LandingContainer>
    </section>
  )
}
