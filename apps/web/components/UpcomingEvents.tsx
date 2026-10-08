import { eventAudience } from "@vxv/server/domain/eventRoles";
import { eventPath } from "@vxv/server/domain/events";
import { eventTitle, formatEventDate, softReserveCount } from "@vxv/server/domain/labels";
import type { GuildEvent } from "@vxv/server";
import Link from "next/link";

/** The events to come, each opening its page: when, its soft reserves (a raid night's), who may sign up. */
export function UpcomingEvents({ events, empty }: { events: GuildEvent[]; empty: string }) {
  if (events.length === 0) {
    return <p className="mt-8 text-muted">{empty}</p>;
  }
  return (
    <ul className="mt-8 space-y-5">
      {events.map((event) => (
        <li key={event.id}>
          <Link
            href={eventPath(event)}
            className="panel block hover:bg-plum focus-visible:bg-plum focus-visible:outline-none"
          >
            <span className="font-pixel text-xl font-semibold text-ivory">{eventTitle(event)}</span>
            <span className="mt-1 block text-sm text-muted">
              {[
                formatEventDate(event.startsAt),
                ...(event.softReservesPerPlayer > 0
                  ? [`${softReserveCount(event.softReservesPerPlayer)} par joueur`]
                  : []),
                eventAudience(event.role),
              ].join(" · ")}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
