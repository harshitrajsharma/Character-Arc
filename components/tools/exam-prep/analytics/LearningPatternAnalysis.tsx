'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function LearningPatternAnalysis() {
  return (
    <div className="space-y-6 h-full flex flex-col">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Learning Pattern Analysis</h2>
        <p className="text-muted-foreground">
          Analyze your learning patterns and optimize your study approach
        </p>
      </div>
      
      <Card className="flex-1 flex flex-col min-h-[400px]">
        <CardHeader>
          <CardTitle>Coming Soon</CardTitle>
          <CardDescription>
            Learning Pattern Analysis will be available in the next update
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-1 flex justify-center items-center py-12">
          <p className="text-center text-muted-foreground max-w-md">
            This feature will analyze your learning style distribution, 
            provide recommendations based on exam proximity, and help you 
            optimize your revision strategy for better results.
          </p>
        </CardContent>
      </Card>
    </div>
  );
} 
