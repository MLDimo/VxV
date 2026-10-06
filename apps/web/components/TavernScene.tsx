"use client";

import { PLACES, TAVERN, type Place, type PlaqueAnchor } from "@vxv/design";
import Link from "next/link";
import { useRef, type CSSProperties, type MouseEvent } from "react";
import { sectionHref } from "./sections";

/** Where the plaque sits, relative to its place's zone (§4.2). */
const PLAQUE_POSITIONS: Record<PlaqueAnchor, string> = {
  above: "bottom-[calc(100%+8px)]",
  board: "bottom-[calc(100%-10px)]",
  middle: "top-[36%]",
  table: "top-[80%]",
  door: "bottom-[66%]",
};
const LIGHT_ANIMATIONS = {
  flick: "animate-[flick_1.6s_steps(4)_infinite]",
  pulse: "animate-[pulse-glow_3s_ease-in-out_infinite]",
} as const;
const PARALLAX_X = -10;
const PARALLAX_Y = -6;

const percent = (value: number) => `${String(value)}%`;

function box([left, top, width, height]: readonly number[]): CSSProperties {
  return { left: percent(left ?? 0), top: percent(top ?? 0), width: percent(width ?? 0), height: percent(height ?? 0) };
}

/** A place of the tavern, opening its section: hovering it, only its plaque changes. */
function PlaceSpot({ place }: { place: Place }) {
  return (
    <Link
      href={sectionHref(place)}
      className="group absolute outline-none"
      style={box(place.spot)}
      aria-label={place.name}
    >
      <span
        className={`plaque absolute left-1/2 -translate-x-1/2 transition-transform group-hover:-translate-y-1 group-hover:bg-plum group-focus-visible:-translate-y-1 group-focus-visible:bg-plum ${PLAQUE_POSITIONS[place.plaque]}`}
      >
        {place.name}
        <small className="block font-sans text-[11px] font-bold text-old-paper">{place.subtitle}</small>
      </span>
    </Link>
  );
}

/**
 * The tavern (§4): the picture, its lights, and one zone per place opening its section. The picture follows the mouse
 * a little (parallax), except with reduced motion.
 */
export function TavernScene() {
  const picture = useRef<HTMLImageElement>(null);
  const move = (event: MouseEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
    const y = ((event.clientY - bounds.top) / bounds.height) * 2 - 1;
    picture.current?.style.setProperty(
      "transform",
      `translate3d(${String(x * PARALLAX_X)}px, ${String(y * PARALLAX_Y)}px, 0)`,
    );
  };
  const leave = () => {
    picture.current?.style.removeProperty("transform");
  };
  return (
    <div
      className="relative mx-auto max-w-[1920px] overflow-hidden"
      style={{ aspectRatio: `${String(TAVERN.width)} / ${String(TAVERN.height)}` }}
      onMouseMove={move}
      onMouseLeave={leave}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- the picture moves with the mouse, outside next/image */}
      <img
        ref={picture}
        src="/images/taverne.jpg"
        alt="La taverne de la guilde : le comptoir, le tableau des quêtes, la cheminée, la table du conseil de guerre, la porte du Dé Pipé et la forge"
        className="image-pixelated absolute top-[-1.5%] left-[-1.5%] h-[103%] w-[103%] max-w-none transition-transform duration-300 ease-[cubic-bezier(.2,.7,.2,1)] motion-reduce:transform-none"
      />
      {TAVERN.lights.map((light) => (
        <span
          key={light.id}
          className={`pointer-events-none absolute mix-blend-screen ${LIGHT_ANIMATIONS[light.animation]}`}
          style={{ ...box(light.box), background: `radial-gradient(closest-side, ${light.color}, transparent)` }}
        />
      ))}
      <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(130%_100%_at_50%_45%,transparent_60%,rgba(13,9,18,0.6)_100%)]" />
      {PLACES.map((place) => (
        <PlaceSpot key={place.id} place={place} />
      ))}
    </div>
  );
}
