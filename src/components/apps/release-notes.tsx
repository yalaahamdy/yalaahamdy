"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { MarkdownBody } from "@/lib/markdown";
import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n/provider";

const COLLAPSE_LIMIT = 2600;

/** Release notes rendered by the safe markdown renderer, with long-notes collapsing. */
export function ReleaseNotes({ source }: { source: string }) {
  const { t } = useI18n();
  const [expanded, setExpanded] = useState(false);
  const isLong = source.length > COLLAPSE_LIMIT;

  return (
    <div>
      <div className={cn("relative", !expanded && isLong && "max-h-[26rem] overflow-hidden")}>
        <MarkdownBody source={expanded || !isLong ? source : `${source.slice(0, COLLAPSE_LIMIT)}…`} />
        {!expanded && isLong && <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-card to-transparent" aria-hidden />}
      </div>
      {isLong && (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="relative z-10 mt-2 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          aria-expanded={expanded}
        >
          {expanded ? t.updates.showLess : t.updates.showFullNotes}
          <ChevronDown className={cn("size-4 transition-transform", expanded && "rotate-180")} aria-hidden />
        </button>
      )}
    </div>
  );
}
