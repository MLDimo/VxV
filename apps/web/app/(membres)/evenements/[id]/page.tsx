import { notFound } from "next/navigation";
import { formatEventDate, raidTitle, softReserveCount } from "@/components/format";
import { getApplication } from "@/server/application";

export default async function EventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const event = await getApplication().events.getEvent(id);
  if (event === undefined) {
    notFound();
  }
  return (
    <>
      <h1 className="text-2xl font-bold">{raidTitle(event.raids.map((raid) => raid.name))}</h1>
      <p className="mt-2 text-zinc-300">{formatEventDate(event.startsAt)}</p>
      <p className="text-zinc-400">{softReserveCount(event.softReservesPerPlayer)} par joueur</p>
    </>
  );
}
