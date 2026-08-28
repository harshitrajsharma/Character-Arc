import Link from "next/link"

import { CharacterArcLogo } from "@/components/brand/character-arc-logo"
import { Button } from "@/components/ui/button"
import { LandingContainer } from "@/components/landing/primitives"

export function LandingNav() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
      <LandingContainer className="flex h-14 items-center justify-between lg:h-16">
        <Link
          href="/"
          className="rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
          aria-label="Character Arc home"
        >
          <CharacterArcLogo className="font-heading text-base font-semibold text-foreground" />
        </Link>
        <nav aria-label="Account" className="flex items-center gap-1.5">
          <Button variant="ghost" size="sm" render={<Link href="/login" />}>
            Sign in
          </Button>
          <Button size="sm" render={<Link href="/signup" />}>
            Get started
          </Button>
        </nav>
      </LandingContainer>
    </header>
  )
}
