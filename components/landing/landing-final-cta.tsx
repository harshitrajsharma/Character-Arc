import Link from "next/link"
import { ArrowRightIcon } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"
import { LandingContainer } from "@/components/landing/primitives"

export function LandingFinalCta() {
  return (
    <section aria-labelledby="final-cta-title">
      <LandingContainer className="flex flex-col items-start justify-between gap-8 py-16 sm:py-20 lg:flex-row lg:items-center">
        <div>
          <p className="mb-4 text-xs font-semibold tracking-widest text-brand-violet-ink uppercase">
            A clear place to begin
          </p>
          <h2
            id="final-cta-title"
            className="max-w-2xl font-heading text-3xl font-semibold text-balance sm:text-4xl"
          >
            Give your next study session a home.
          </h2>
          <p className="mt-4 text-base text-muted-foreground">
            Start with one exam, one subject and a useful next step.
          </p>
        </div>
        <Link
          href="/signup"
          className={buttonVariants({
            size: "lg",
            className: "min-h-12 w-full shrink-0 sm:w-auto",
          })}
        >
          Create your workspace
          <ArrowRightIcon data-icon="inline-end" />
        </Link>
      </LandingContainer>
    </section>
  )
}
