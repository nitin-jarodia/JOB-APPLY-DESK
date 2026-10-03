import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function JobsSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading jobs</span>
      <div className="flex items-center justify-between gap-3">
        <Skeleton className="h-5 w-56" />
        <Skeleton className="h-7 w-24" />
      </div>
      <Card>
        <CardContent className="flex flex-col gap-2">
          <Skeleton className="h-4 w-20" />
          {[0, 1, 2, 3, 4].map((row) => (
            <Skeleton key={row} className="h-4 w-full max-w-md" />
          ))}
        </CardContent>
      </Card>
      {[0, 1, 2].map((index) => (
        <Card key={index}>
          <CardContent className="flex flex-col gap-3">
            <Skeleton className="h-5 w-64 max-w-full" />
            <Skeleton className="h-4 w-48" />
            <div className="flex gap-2">
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-5 w-28" />
            </div>
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-7 w-36" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
