"use client"

import Link from "next/link"
import { WifiOffIcon, RefreshCwIcon, HomeIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

export default function OfflinePage() {
  const handleReload = () => {
    if (typeof window !== "undefined") {
      window.location.reload()
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4 text-foreground">
      <Card className="w-full max-w-md border-border/80 shadow-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-2xl bg-brand-neon-soft text-brand-neon-ink">
            <WifiOffIcon className="size-7" aria-hidden="true" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">
            You&apos;re currently offline
          </CardTitle>
          <CardDescription className="text-sm text-muted-foreground">
            Character Arc couldn&apos;t connect to the network. Check your connection or retry once you&apos;re back online.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-center text-sm text-muted-foreground">
          <p>
            Your saved tools and cached pages remain available. Try re-establishing your Internet connection to resume live AI sync.
          </p>
        </CardContent>
        <CardFooter className="flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button onClick={handleReload} className="w-full gap-2 sm:w-auto">
            <RefreshCwIcon className="size-4" aria-hidden="true" />
            Retry Connection
          </Button>
          <Button variant="outline" render={<Link href="/" />} className="w-full gap-2 sm:w-auto">
            <HomeIcon className="size-4" aria-hidden="true" />
            Go to Home
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
