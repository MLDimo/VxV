"use client";

import { usePathname } from "next/navigation";
import { placeOfPath } from "./sections";

/**
 * The background of a place's pages, as in the addon (§6): the tavern framed on the place (position in percent, the
 * picture zoom times as wide as the screen), very dark under a veil. Pages of no place keep the night's color.
 */
export function PlaceBackdrop({ picture }: { picture: string }) {
  const place = placeOfPath(usePathname());
  if (place === undefined) {
    return null;
  }
  const { position, zoom, opacity } = place.backdrop;
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" data-place={place.id}>
      <div
        className="image-pixelated absolute inset-0 bg-no-repeat"
        style={{
          backgroundImage: `url(${picture})`,
          backgroundSize: `${String(zoom * 100)}% auto`,
          backgroundPosition: `${String(position[0])}% ${String(position[1])}%`,
          opacity,
        }}
      />
      <div className="absolute inset-0 bg-linear-to-b from-night/40 to-night/90" />
      <div className="absolute inset-0 bg-[radial-gradient(120%_90%_at_50%_35%,transparent_55%,var(--color-night)_100%)]" />
    </div>
  );
}
