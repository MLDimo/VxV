"use client";

import { useState } from "react";

/** A painting's captures: the main one, and the others below to show instead. */
export function LegendGallery({ imageUrls, title }: { imageUrls: string[]; title: string }) {
  const [shown, setShown] = useState(0);
  return (
    <div className="relative h-[clamp(220px,40vw,420px)] overflow-hidden bg-night-window">
      {imageUrls.length === 0 ? (
        <span className="flex h-full items-center justify-center font-pixel text-muted">Pas encore de capture</span>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element -- a member's capture, served by the website
        <img src={imageUrls[shown]} alt={`Capture : ${title}`} className="block size-full object-cover" />
      )}
      {imageUrls.length > 1 && (
        <div className="absolute bottom-4 left-4 flex gap-2">
          {imageUrls.map((url, index) => (
            <button
              key={url}
              type="button"
              onClick={() => {
                setShown(index);
              }}
              aria-label={`Capture ${String(index + 1)}`}
              aria-pressed={index === shown}
              className={`h-10 w-16 overflow-hidden ${index === shown ? "shadow-[0_0_0_2px_var(--color-gold)]" : "shadow-[0_0_0_2px_var(--color-ink)]"}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- a thumbnail of the capture */}
              <img src={url} alt="" className="size-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
