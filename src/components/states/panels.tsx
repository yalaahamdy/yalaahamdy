"use client";

import { AlertTriangle, PackageOpen, RotateCcw, SearchX, WifiOff } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/provider";

interface StatePanelProps {
  title: string;
  description: string;
  onRetry?: () => void;
  children?: ReactNode;
  tone?: "error" | "neutral";
  icon?: "error" | "missing" | "offline" | "package";
}

const ICONS = {
  error: AlertTriangle,
  missing: SearchX,
  offline: WifiOff,
  package: PackageOpen,
} as const;

/** Shared full-width state panel for error / empty / unavailable situations. */
export function StatePanel({ title, description, onRetry, children, tone = "error", icon = "error" }: StatePanelProps) {
  const { t } = useI18n();
  const Icon = ICONS[icon];
  return (
    <div className="card-surface flex flex-col items-center gap-4 p-10 text-center" role={tone === "error" ? "alert" : "status"}>
      <span className={tone === "error" ? "flex size-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive" : "flex size-12 items-center justify-center rounded-2xl bg-accent text-accent-foreground"}>
        <Icon className="size-6" aria-hidden />
      </span>
      <div>
        <p className="text-lg font-bold">{title}</p>
        <p className="mx-auto mt-1.5 max-w-md text-sm leading-relaxed text-muted-foreground">{description}</p>
      </div>
      {(children || onRetry) && (
        <div className="flex flex-wrap items-center justify-center gap-2">
          {children}
          {onRetry && (
            <Button variant="secondary" onClick={onRetry}>
              <RotateCcw aria-hidden />
              {t.states.tryAgain}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
