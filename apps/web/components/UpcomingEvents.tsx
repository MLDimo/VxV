import type { RaidEvent } from "@vxv/server";
import Link from "next/link";
import { formatEventDate, raidTitle, softReserveCount } from "./format";

export function UpcomingEvents({ events }: { events: RaidEvent[] }) {
  if (events.length === 0) {
    return <p className="mt-8 text-muted">Aucun raid prévu pour l&apos;instant.</p>;
  }
  return (
    <ul className="mt-8 space-y-5">
      {events.map((event) => (
        <li key={event.id}>
          <Link
            href={`/evenements/${event.id}`}
            className="panel block hover:bg-plum focus-visible:bg-plum focus-visible:outline-none"
          >
            <span className="font-pixel text-xl font-semibold text-ivory">
              {raidTitle(event.raids.map((raid) => raid.name))}
            </span>
            <span className="mt-1 block text-sm text-muted">
              {formatEventDate(event.startsAt)} · {softReserveCount(event.softReservesPerPlayer)} par joueur
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
