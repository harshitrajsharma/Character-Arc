import Link from "next/link"
import { CompassIcon } from "lucide-react"

import { CharacterArcLogo } from "@/components/brand/character-arc-logo"
import { buttonVariants } from "@/components/ui/button"

export default function NotFound() {
  return (
    <main className="flex min-h-svh w-full flex-col items-center justify-center bg-background px-4 py-16">
      <Link href="/" className="mb-10 inline-flex items-center">
        <CharacterArcLogo />
      </Link>
      <div className="w-full max-w-md rounded-3xl border border-border bg-card p-8 text-center shadow-xs">
        <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
          <CompassIcon className="size-6" aria-hidden="true" />
        </div>
        <h1 className="mt-5 font-heading text-xl font-semibold tracking-tight text-foreground">
          Page not found
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          The page you are looking for does not exist or may have moved.
        </p>
        <div className="mt-6 flex flex-col items-center justify-center gap-2 sm:flex-row">
          <Link href="/dashboard" className={buttonVariants()}>
            Go to your dashboard
          </Link>
          <Link href="/login" className={buttonVariants({ variant: "ghost" })}>
            Sign in
          </Link>
        </div>
      </div>
    </main>
  )
}
