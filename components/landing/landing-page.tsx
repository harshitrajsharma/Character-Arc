import { LandingFinalCta } from "@/components/landing/landing-final-cta"
import { LandingFooter } from "@/components/landing/landing-footer"
import { LandingHero } from "@/components/landing/landing-hero"
import { LandingHowItWorks } from "@/components/landing/landing-how-it-works"
import { LandingNav } from "@/components/landing/landing-nav"
import { LandingPrinciples } from "@/components/landing/landing-principles"
import { LandingToolsStrip } from "@/components/landing/landing-tools-strip"

export function LandingPage() {
  return (
    <div className="flex min-h-svh flex-col bg-background text-foreground">
      <a
        href="#main-content"
        className="sr-only fixed top-3 left-3 z-50 rounded-full bg-primary px-4 py-3 text-sm font-medium text-primary-foreground focus:not-sr-only"
      >
        Skip to content
      </a>
      <LandingNav />
      <main id="main-content" className="min-w-0 flex-1">
        <LandingHero />
        <LandingHowItWorks />
        <LandingToolsStrip />
        <LandingPrinciples />
        <LandingFinalCta />
      </main>
      <LandingFooter />
    </div>
  )
}
