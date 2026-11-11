import Link from "next/link"

import { CharacterArcLogo } from "@/components/brand/character-arc-logo"
import { buttonVariants } from "@/components/ui/button"
import { LandingContainer } from "@/components/landing/primitives"

export function LandingNav() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-transparent backdrop-blur-xl">
      <LandingContainer className="flex h-18 items-center justify-between gap-4">
        <Link
          href="/"
          className="inline-flex min-h-11 items-center rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
          aria-label="Character Arc home"
        >
          <CharacterArcLogo className="font-heading text-base font-semibold text-foreground" />
        </Link>
        <nav
          aria-label="Product"
          className="hidden items-center gap-7 text-sm font-medium text-muted-foreground md:flex"
        >
          <Link
            href="#product"
            className="inline-flex min-h-11 items-center rounded-sm outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          >
            The workspace
          </Link>
          <Link
            href="#workflow"
            className="inline-flex min-h-11 items-center rounded-sm outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          >
            How it works
          </Link>
          <Link
            href="#agents"
            className="inline-flex min-h-11 items-center rounded-sm outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          >
            Use with AI
          </Link>
        </nav>
        <nav aria-label="Account" className="flex shrink-0 items-center gap-1">
          <Link
            href="/login"
            className={buttonVariants({
              variant: "ghost",
              size: "sm",
              className: "min-h-11",
            })}
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className={buttonVariants({ size: "sm", className: "min-h-11" })}
          >
            Get started
          </Link>
        </nav>
      </LandingContainer>
    </header>
  )
}
