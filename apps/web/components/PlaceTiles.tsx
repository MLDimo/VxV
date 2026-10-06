import { PLACES } from "@vxv/design";
import Link from "next/link";
import { sectionHref } from "./sections";

/** On a phone (§5.2): one tile per place, cut out of the tavern, opening its section. */
export function PlaceTiles() {
  return (
    <ul className="grid grid-cols-2 gap-3 px-4 py-6">
      {PLACES.map((place) => (
        <li key={place.id}>
          <Link
            href={sectionHref(place)}
            className="image-pixelated relative block h-[118px] ring-pixel"
            style={{
              backgroundImage: "url(/images/taverne.jpg)",
              backgroundSize: "1100px auto",
              backgroundPosition: `${String(place.tile[0])}px ${String(place.tile[1])}px`,
            }}
          >
            <span className="absolute inset-x-0 bottom-0 bg-linear-to-t from-ink to-transparent px-2 pt-6 pb-2">
              <span className="block font-pixel text-base text-parchment">{place.name}</span>
              <small className="block text-[11px] font-bold text-old-paper">{place.subtitle}</small>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
