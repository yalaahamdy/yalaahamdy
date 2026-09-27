import { cn } from "@/lib/utils";

/** Gradient "Y" monogram — the site's logo mark. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" role="img" aria-label="Yalaah Apps logo" className={cn("rounded-[10px] shadow-sm", className)}>
      <defs>
        <linearGradient id="ya-brand-g" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop stopColor="#8b5cf6" />
          <stop offset="1" stopColor="#6d28d9" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill="url(#ya-brand-g)" />
      <path
        d="M20 21 L32 34 L44 21"
        fill="none"
        stroke="#fff"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M32 34 L32 45" fill="none" stroke="#fff" strokeWidth="6" strokeLinecap="round" />
    </svg>
  );
}
