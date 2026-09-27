import { AppWindow, Globe, Laptop, Package, Smartphone, Terminal } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const PLATFORM_ICONS: Record<string, LucideIcon> = {
  Android: Smartphone,
  Windows: AppWindow,
  macOS: Laptop,
  Linux: Terminal,
  Web: Globe,
  iOS: Smartphone,
  Other: Package,
};

export function platformIcon(platform: string): LucideIcon {
  return PLATFORM_ICONS[platform] ?? Package;
}
