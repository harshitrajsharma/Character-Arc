'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function PhaseProgressAnalysis() {
  return (
    <div className="space-y-6 h-full flex flex-col">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Study Phase Analysis</h2>
        <p className="text-muted-foreground">
          Track progress across different study phases
        </p>
      </div>
      
      <Card className="flex-1 flex flex-col min-h-[400px]">
        <CardHeader>
          <CardTitle>Coming Soon</CardTitle>
          <CardDescription>
            Study Phase Analysis will be available in the next update
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-1 flex justify-center items-center py-12">
          <p className="text-center text-muted-foreground max-w-md">
            This feature will provide insights into your progress across different 
            study phases, help you monitor phase completion rates, and analyze 
            time distribution in each phase.
          </p>
        </CardContent>
      </Card>
    </div>
  );
} 
