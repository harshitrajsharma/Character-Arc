import Link from "next/link"
import { CharacterArcLogo } from "@/components/brand/character-arc-logo"
import { LandingContainer } from "@/components/landing/primitives"

export function LandingFooter() {
  return (
    <footer className="border-t border-border">
      <LandingContainer className="flex flex-col items-start justify-between gap-5 py-8 sm:flex-row sm:items-center">
        <div>
          <CharacterArcLogo className="font-heading text-base font-semibold text-foreground" />
          <p className="mt-2 text-xs text-muted-foreground">
            Exam preparation and assessments, connected.
          </p>
        </div>
        <nav
          aria-label="Footer"
          className="flex flex-wrap items-center gap-x-6 text-sm font-medium"
        >
          <Link
            href="#workflow"
            className="inline-flex min-h-11 items-center rounded-sm text-muted-foreground underline-offset-4 outline-none hover:text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring"
          >
            How it works
          </Link>
          <Link
            href="/login"
            className="inline-flex min-h-11 items-center rounded-sm text-muted-foreground underline-offset-4 outline-none hover:text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="inline-flex min-h-11 items-center rounded-sm underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
          >
            Get started
          </Link>
        </nav>
      </LandingContainer>
    </footer>
  )
}
