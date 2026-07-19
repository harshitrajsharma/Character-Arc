import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-[200px]" />
        <Skeleton className="h-4 w-[300px]" />
      </div>

      {/* Main Stats Grid */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Days Until */}
        <Card className="p-6">
          <Skeleton className="h-12 w-[100px] mb-4" />
          <Skeleton className="h-4 w-[150px]" />
        </Card>

        {/* Subject Progress */}
        <Card className="p-6">
          <Skeleton className="h-12 w-[80px] mb-4" />
          <Skeleton className="h-4 w-[120px]" />
        </Card>

        {/* Projected Marks */}
        <Card className="p-6">
          <Skeleton className="h-12 w-[90px] mb-4" />
          <Skeleton className="h-4 w-[130px]" />
        </Card>
      </div>

      {/* Calendar Section */}
      <Card className="p-6">
        <Skeleton className="h-[300px] w-full" />
      </Card>

      {/* Progress Section */}
      <Card className="p-6 space-y-4">
        <Skeleton className="h-6 w-[150px]" />
        <Skeleton className="h-4 w-full" />
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
        </div>
      </Card>

      {/* Topic Weightage Graph */}
      <Card className="p-6">
        <Skeleton className="h-[200px] w-full" />
      </Card>
    </div>
  );
} 
