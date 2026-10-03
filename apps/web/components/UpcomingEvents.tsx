import type { RaidEvent } from "@vxv/server";
import Link from "next/link";
import { formatEventDate, raidTitle, softReserveCount } from "./format";

export function UpcomingEvents({ events }: { events: RaidEvent[] }) {
  if (events.length === 0) {
    return <p className="mt-4 text-zinc-500">Aucun raid prévu pour l&apos;instant.</p>;
  }
  return (
    <ul className="mt-4 space-y-3">
      {events.map((event) => (
        <li key={event.id}>
          <Link
            href={`/evenements/${event.id}`}
            className="block rounded border border-zinc-800 px-4 py-3 hover:border-zinc-600"
          >
            <span className="font-semibold">{raidTitle(event.raids.map((raid) => raid.name))}</span>
            <span className="block text-sm text-zinc-400">
              {formatEventDate(event.startsAt)} · {softReserveCount(event.softReservesPerPlayer)} par joueur
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
