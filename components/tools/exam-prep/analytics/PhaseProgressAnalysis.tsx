"use client"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export function PhaseProgressAnalysis() {
  return (
    <div className="flex h-full flex-col space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">
          Study Phase Analysis
        </h2>
        <p className="text-muted-foreground">
          Track progress across different study phases
        </p>
      </div>

      <Card className="flex min-h-[400px] flex-1 flex-col">
        <CardHeader>
          <CardTitle>Coming Soon</CardTitle>
          <CardDescription>
            Study Phase Analysis will be available in the next update
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-1 items-center justify-center py-12">
          <p className="max-w-md text-center text-muted-foreground">
            This feature will provide insights into your progress across
            different study phases, help you monitor phase completion rates, and
            analyze time distribution in each phase.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
