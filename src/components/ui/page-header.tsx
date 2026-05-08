import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  subtitle,
  actions,
  className,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "flex items-start justify-between gap-4 flex-wrap",
        className,
      )}
    >
      <div className="min-w-0">
        <h1 className="text-2xl font-heading font-semibold">{title}</h1>
        {subtitle && (
          <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
    </header>
  );
}

export function SectionHeader({
  title,
  hint,
  actions,
  className,
}: {
  title: string;
  hint?: string;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-2 mb-3",
        className,
      )}
    >
      <div className="flex items-center gap-2 min-w-0">
        <h2 className="text-xs uppercase tracking-wider text-muted-foreground">
          {title}
        </h2>
        {hint && (
          <span className="text-[11px] text-muted-foreground">· {hint}</span>
        )}
      </div>
      {actions && <div className="flex items-center gap-1.5">{actions}</div>}
    </div>
  );
}
