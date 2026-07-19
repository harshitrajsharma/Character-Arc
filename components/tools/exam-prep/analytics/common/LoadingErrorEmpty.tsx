'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, ArrowRight, Calendar, Info } from 'lucide-react';

interface LoadingErrorEmptyProps {
  isLoading: boolean;
  isError: boolean;
  isEmpty: boolean;
  error: Error | unknown;
  dateRangeText: string;
  onViewAllData: () => void;
}

export function LoadingErrorEmpty({
  isLoading,
  isError,
  isEmpty,
  error,
  dateRangeText,
  onViewAllData
}: LoadingErrorEmptyProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full min-h-[300px]">
        <Skeleton className="h-48 rounded-lg" />
        <Skeleton className="h-48 rounded-lg" />
        <Skeleton className="h-64 rounded-lg md:col-span-2" />
      </div>
    );
  }

  if (isError) {
    return (
      <Card className="flex h-full min-h-[400px] flex-col border-red-200 bg-card/95 shadow-sm dark:border-red-800">
        <CardHeader>
          <CardTitle className="text-red-600 dark:text-red-400 flex items-center">
            <AlertTriangle className="mr-2 h-5 w-5" />
            Unable to load subject data
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground">
            {error instanceof Error ? error.message : "There was a problem loading your subject data. Please try again."}
          </p>
        </CardContent>
        <CardFooter>
          <Button variant="outline" onClick={() => window.location.reload()}>
            Reload Page
          </Button>
        </CardFooter>
      </Card>
    );
  }

  if (isEmpty) {
    return (
      <Card className="flex h-full min-h-[400px] flex-col border-border/70 bg-muted/10 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Info className="mr-2 h-5 w-5 text-muted-foreground" />
            No activity data for this period
          </CardTitle>
          <CardDescription>
            Try selecting a different time period or check back after you&apos;ve completed more activities
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col items-center justify-center py-8 space-y-4">
          <Calendar className="h-16 w-16 text-muted-foreground opacity-50" />
          <p className="text-center text-muted-foreground max-w-md">
            You haven&apos;t logged any study activity during {dateRangeText}.
            Complete topics in your subjects to see your progress analytics here.
          </p>
        </CardContent>
        <CardFooter className="flex flex-col justify-center gap-2 sm:flex-row">
          <Button 
            variant="outline" 
            onClick={onViewAllData}
          >
            View all activity
          </Button>
          <Button>
            <Link href="/subjects">
              Go to subjects
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return null;
}
