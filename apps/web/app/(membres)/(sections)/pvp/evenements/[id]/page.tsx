import { eventAudience } from "@vxv/server/domain/eventRoles";
import { eventPath } from "@vxv/server/domain/events";
import { eventTitle, formatEventDate } from "@vxv/server/domain/labels";
import { isComing } from "@vxv/server/domain/signups";
import { notFound, redirect } from "next/navigation";
import { Badge } from "@/components/Badge";
import { EventSignups } from "@/components/EventSignups";
import { ScreenHeader } from "@/components/ScreenHeader";
import { SignupPanel } from "@/components/SignupPanel";
import { getApplication } from "@/server/application";
import { requireMember } from "@/server/session";

/** A PvP outing: who may sign up, the member's sign-up and who comes. */
export default async function PvpEventPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, member] = await Promise.all([params, requireMember()]);
  const { events, signups, characters } = getApplication();
  const event = await events.getEvent(id);
  if (event === undefined) {
    notFound();
  }
  if (event.kind !== "pvp") {
    redirect(eventPath(event));
  }
  const [eventSignups, mine, ownCharacters] = await Promise.all([
    signups.listForEvent(event.id),
    signups.findMine(member, event.id),
    characters.listMine(member),
  ]);
  const expected = eventSignups.filter((signup) => isComing(signup.status)).length;
  return (
    <>
      <ScreenHeader kicker="Avis de recherche · événement PvP" kickerClassName="text-loss" title={eventTitle(event)}>
        <span className="text-lavender">{formatEventDate(event.startsAt)}</span>
        <Badge tone="amethyst">{eventAudience(event.role)}</Badge>
        <Badge tone="gain">{expected} attendus</Badge>
      </ScreenHeader>
      <div className="mt-8 grid items-start gap-8 lg:grid-cols-[300px_minmax(0,1fr)]">
        <SignupPanel eventId={event.id} characters={ownCharacters} current={mine} />
        <EventSignups signups={eventSignups} />
      </div>
    </>
  );
}
