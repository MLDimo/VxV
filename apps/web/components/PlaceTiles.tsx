import { PLACES, type Place } from "@vxv/design";
import Link from "next/link";

/** On a phone (§5.2): one tile per place, cut out of the tavern; the places not built yet say "Bientôt". */
export function PlaceTiles({ hrefs }: { hrefs: Partial<Record<Place["id"], string>> }) {
  return (
    <ul className="grid grid-cols-2 gap-3 px-4 py-6">
      {PLACES.map((place) => {
        const href = hrefs[place.id];
        const content = (
          <>
            <span className="absolute inset-x-0 bottom-0 bg-linear-to-t from-ink to-transparent px-2 pt-6 pb-2">
              <span className="block font-pixel text-base text-parchment">{place.name}</span>
              <small className="block text-[11px] font-bold text-old-paper">{href ? place.subtitle : "Bientôt"}</small>
            </span>
          </>
        );
        const style = {
          backgroundImage: "url(/images/taverne.jpg)",
          backgroundSize: "1100px auto",
          backgroundPosition: `${String(place.tile[0])}px ${String(place.tile[1])}px`,
        };
        return (
          <li key={place.id}>
            {href ? (
              <Link href={href} className="image-pixelated relative block h-[118px] ring-pixel" style={style}>
                {content}
              </Link>
            ) : (
              <span className="image-pixelated relative block h-[118px] opacity-70 ring-pixel" style={style}>
                {content}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
