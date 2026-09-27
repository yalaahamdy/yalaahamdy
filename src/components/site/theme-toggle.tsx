"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/provider";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const { t } = useI18n();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const isDark = resolvedTheme === "dark";
  const label = mounted ? (isDark ? t.theme.toLight : t.theme.toDark) : t.theme.toggle;

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={mounted ? () => setTheme(isDark ? "light" : "dark") : undefined}
      aria-label={label}
      title={label}
    >
      {mounted ? isDark ? <Sun aria-hidden /> : <Moon aria-hidden /> : <Moon aria-hidden className="opacity-0" />}
    </Button>
  );
}
