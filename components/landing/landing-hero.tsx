import Link from "next/link"
import { ArrowDownIcon, ArrowRightIcon, BookOpenIcon } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"
import { LandingContainer } from "@/components/landing/primitives"
import { LandingWorkspacePreview } from "@/components/landing/landing-workspace-preview"

export function LandingHero() {
  return (
    <section aria-labelledby="landing-title">
      <LandingContainer className="grid items-center gap-12 pt-14 pb-16 sm:gap-16 sm:pt-20 sm:pb-24 lg:grid-cols-[0.95fr_1.05fr] lg:gap-14 lg:pt-24 lg:pb-28">
        <div className="min-w-0">
          <p className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-brand-violet-ink">
            <BookOpenIcon className="size-4" aria-hidden="true" />A home for
            your exam preparation
          </p>
          <h1
            id="landing-title"
            className="max-w-xl font-heading text-5xl leading-[1.08] font-semibold text-balance sm:text-6xl xl:text-[64px]"
          >
            Prepare with purpose.
            <span className="mt-2 block text-brand-violet-ink">
              Keep it connected.
            </span>
          </h1>
          <p className="mt-6 max-w-lg text-base leading-relaxed text-pretty text-muted-foreground sm:text-lg">
            Your syllabus, subject tests and attempts belong together. Character
            Arc gives them one workspace, so you can pick up the work and see
            what comes next.
          </p>
          <div className="mt-8 flex flex-col gap-3 min-[400px]:flex-row">
            <Link
              href="/signup"
              className={buttonVariants({ size: "lg", className: "min-h-12" })}
            >
              Create your workspace <ArrowRightIcon data-icon="inline-end" />
            </Link>
            <Link
              href="#workflow"
              className={buttonVariants({
                variant: "ghost",
                size: "lg",
                className: "min-h-12",
              })}
            >
              See how it works <ArrowDownIcon data-icon="inline-end" />
            </Link>
          </div>
          <p className="mt-5 text-sm text-muted-foreground">
            Use it yourself. Connect an AI agent when you need one.
          </p>
        </div>
        <LandingWorkspacePreview />
      </LandingContainer>
    </section>
  )
}
