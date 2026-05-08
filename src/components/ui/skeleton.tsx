import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn("bg-muted/30 rounded animate-pulse", className)}
      aria-busy="true"
    />
  );
}

const WIDTH_CLS = ["w-full", "w-[92%]", "w-[84%]", "w-[76%]", "w-[68%]", "w-[60%]"];

export function SkeletonLines({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn("h-3", WIDTH_CLS[Math.min(i, WIDTH_CLS.length - 1)])}
        />
      ))}
    </div>
  );
}

export function SkeletonCard({ className }: { className?: string }) {
  return <Skeleton className={cn("h-24 border border-border rounded-lg", className)} />;
}

export function SkeletonGrid({
  count = 6,
  cols = "grid-cols-2 md:grid-cols-3 lg:grid-cols-6",
  className,
}: {
  count?: number;
  cols?: string;
  className?: string;
}) {
  return (
    <div className={cn("grid gap-3", cols, className)}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}
