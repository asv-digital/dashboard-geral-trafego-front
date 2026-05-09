"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { StatusBadge, type Tone } from "./status-badge";

export function Accordion({
  title,
  description,
  status,
  statusLabel,
  defaultOpen = false,
  children,
  className,
}: {
  title: string;
  description?: string;
  status?: Tone;
  statusLabel?: string;
  defaultOpen?: boolean;
  children: ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className={cn("bg-card border border-border rounded-lg overflow-hidden", className)}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full px-5 py-3.5 flex items-center justify-between gap-3 hover:bg-muted/30 transition-colors text-left"
        aria-expanded={open}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <ChevronDown
            className={cn(
              "w-4 h-4 text-muted-foreground transition-transform shrink-0",
              open && "rotate-180",
            )}
          />
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium flex items-center gap-2 flex-wrap">
              {title}
              {status && statusLabel && (
                <StatusBadge tone={status} label={statusLabel} dot size="sm" />
              )}
            </div>
            {description && (
              <div className="text-xs text-muted-foreground mt-0.5 leading-snug">
                {description}
              </div>
            )}
          </div>
        </div>
      </button>
      {open && (
        <div className="px-5 pb-5 pt-1 border-t border-border">
          <div className="pt-4">{children}</div>
        </div>
      )}
    </section>
  );
}
