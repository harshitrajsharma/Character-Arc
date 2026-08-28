import Link from "next/link"

import { CharacterArcLogo } from "@/components/brand/character-arc-logo"
import { LandingContainer } from "@/components/landing/primitives"

export function LandingFooter() {
  return (
    <footer className="border-t border-border">
      <LandingContainer className="flex flex-col items-start justify-between gap-6 py-10 sm:flex-row sm:items-center">
        <div>
          <CharacterArcLogo className="font-heading text-sm font-semibold text-foreground" />
          <p className="mt-2 text-xs text-muted-foreground">
            Character Arc — structured memory for people working with AI.
          </p>
        </div>
        <nav
          aria-label="Footer"
          className="flex items-center gap-5 text-sm font-medium"
        >
          <Link
            href="/login"
            className="text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="underline-offset-4 transition-colors hover:text-brand-neon-ink hover:underline"
          >
            Get started
          </Link>
        </nav>
      </LandingContainer>
    </footer>
  )
}
