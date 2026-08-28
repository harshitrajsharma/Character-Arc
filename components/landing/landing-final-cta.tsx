import Link from "next/link"
import { ArrowRightIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  LandingContainer,
  Reveal,
} from "@/components/landing/primitives"

export function LandingFinalCta() {
  return (
    <section aria-labelledby="final-cta-title">
      <LandingContainer className="py-16 sm:py-24">
        <Reveal>
          <div className="rounded-2xl border border-brand-neon-line bg-brand-neon-soft px-6 py-14 text-center sm:px-12 sm:py-16">
            <h2
              id="final-cta-title"
              className="mx-auto max-w-2xl text-balance font-heading text-3xl font-semibold tracking-tight sm:text-4xl"
            >
              Make every AI conversation count
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-pretty text-base leading-relaxed text-muted-foreground">
              Install your first tool and let your AI work inside structure it
              can&apos;t quietly drift out of.
            </p>
            <div className="mt-8 flex justify-center">
              <Button size="lg" render={<Link href="/signup" />}>
                Start building your arc
                <ArrowRightIcon data-icon="inline-end" />
              </Button>
            </div>
          </div>
        </Reveal>
      </LandingContainer>
    </section>
  )
}
