"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Maximize2, X } from "lucide-react";
import type { Screenshot } from "@/lib/config";
import { withBasePath } from "@/lib/config";

interface ScreenshotsGalleryProps {
  screenshots: Screenshot[];
  heading: string;
}

export function ScreenshotsGallery({ screenshots, heading }: ScreenshotsGalleryProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const resolveSrc = useCallback((src: string) => {
    if (/^https?:\/\//i.test(src)) return src;
    return withBasePath(src);
  }, []);

  const closeModal = useCallback(() => setActiveIndex(null), []);

  const prevImage = useCallback(() => {
    setActiveIndex((prev) => {
      if (prev === null) return null;
      return (prev - 1 + screenshots.length) % screenshots.length;
    });
  }, [screenshots.length]);

  const nextImage = useCallback(() => {
    setActiveIndex((prev) => {
      if (prev === null) return null;
      return (prev + 1) % screenshots.length;
    });
  }, [screenshots.length]);

  useEffect(() => {
    if (activeIndex === null) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeModal();
      if (e.key === "ArrowLeft") prevImage();
      if (e.key === "ArrowRight") nextImage();
    };

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeIndex, closeModal, nextImage, prevImage]);

  if (!screenshots || screenshots.length === 0) return null;

  const currentShot = activeIndex !== null ? screenshots[activeIndex] : null;

  return (
    <section aria-labelledby="screenshots-heading" className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 id="screenshots-heading" className="section-title text-xl font-bold tracking-tight">
          {heading}
        </h2>
        <span className="text-xs font-medium text-muted-foreground">
          {screenshots.length} {screenshots.length === 1 ? "صورة" : "لقطات"}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-2">
        {screenshots.map((shot, index) => {
          const resolvedUrl = resolveSrc(shot.src);
          return (
            <figure
              key={shot.src}
              className="group relative flex flex-col overflow-hidden rounded-2xl border border-border/70 bg-card/60 shadow-sm transition-all duration-300 hover:border-primary/50 hover:bg-card hover:shadow-md"
            >
              <div
                role="button"
                tabIndex={0}
                aria-label={`تكبير لقطة الشاشة: ${shot.alt}`}
                onClick={() => setActiveIndex(index)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setActiveIndex(index);
                  }
                }}
                className="relative aspect-[16/10] w-full cursor-zoom-in overflow-hidden bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <img
                  src={resolvedUrl}
                  alt={shot.alt}
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover object-top transition-transform duration-500 ease-out group-hover:scale-[1.03]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                <div className="absolute bottom-3 end-3 flex size-8 items-center justify-center rounded-lg bg-black/60 text-white shadow-sm backdrop-blur-md opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                  <Maximize2 className="size-4" aria-hidden />
                </div>
              </div>

              {shot.alt && (
                <figcaption className="p-3 text-xs leading-relaxed text-muted-foreground border-t border-border/40">
                  <p className="line-clamp-2">{shot.alt}</p>
                </figcaption>
              )}
            </figure>
          );
        })}
      </div>

      {/* Lightbox Modal */}
      {activeIndex !== null && currentShot && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={currentShot.alt}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-md animate-in fade-in duration-200"
          onClick={closeModal}
        >
          {/* Top Control Bar */}
          <div
            className="absolute top-4 inset-x-4 flex items-center justify-between text-white z-20 pointer-events-none"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium backdrop-blur-md pointer-events-auto">
              {activeIndex + 1} / {screenshots.length}
            </div>

            <button
              type="button"
              onClick={closeModal}
              aria-label="إغلاق المعاينة"
              className="pointer-events-auto flex size-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <X className="size-5" />
            </button>
          </div>

          {/* Navigation Controls */}
          {screenshots.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  prevImage();
                }}
                aria-label="الصورة السابقة"
                className="absolute start-4 top-1/2 z-20 -translate-y-1/2 flex size-11 items-center justify-center rounded-full bg-white/10 text-white shadow-lg backdrop-blur-md transition-all hover:bg-white/25 hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white rtl:-scale-x-100"
              >
                <ChevronLeft className="size-6" />
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  nextImage();
                }}
                aria-label="الصورة التالية"
                className="absolute end-4 top-1/2 z-20 -translate-y-1/2 flex size-11 items-center justify-center rounded-full bg-white/10 text-white shadow-lg backdrop-blur-md transition-all hover:bg-white/25 hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white rtl:-scale-x-100"
              >
                <ChevronRight className="size-6" />
              </button>
            </>
          )}

          {/* Main Image Stage */}
          <div
            className="relative flex max-h-[82vh] max-w-[94vw] flex-col items-center justify-center z-10"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={resolveSrc(currentShot.src)}
              alt={currentShot.alt}
              className="max-h-[76vh] max-w-full rounded-xl object-contain shadow-2xl ring-1 ring-white/15"
            />
            {currentShot.alt && (
              <p className="mt-3 max-w-2xl text-center text-sm font-medium text-white/90 drop-shadow">
                {currentShot.alt}
              </p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
