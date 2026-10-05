import { composition, type Composition, type RaidEvent } from "@vxv/server";
import { formatShortEventDate, raidTitle } from "@vxv/server/domain/labels";
import Link from "next/link";
import { HomeCard } from "@/components/HomeCard";
import { PlaceTiles } from "@/components/PlaceTiles";
import { sectionHrefs } from "@/components/sections";
import { TavernScene } from "@/components/TavernScene";
import { getApplication } from "@/server/application";

function NextRaid({ event, counts }: { event: RaidEvent | undefined; counts: Composition | undefined }) {
  if (event === undefined || counts === undefined) {
    return (
      <HomeCard kicker="Prochain raid" title="Aucun raid prévu">
        <p>Les officiers annoncent les raids sur le site et sur Discord.</p>
        <Link href="/raid" className="button-pixel">
          Voir les raids
        </Link>
      </HomeCard>
    );
  }
  const expected = counts.byStatus.present + counts.byStatus.late;
  return (
    <HomeCard kicker="Prochain raid" title={formatShortEventDate(event.startsAt)}>
      <p>
        {raidTitle(event.raids.map((raid) => raid.name))} · {expected} attendus
      </p>
      <p className="font-pixel text-lg">
        <span className="text-gain">{counts.byRole.tank} tanks</span>{" "}
        <span className="text-gold">{counts.byRole.healer} heals</span>{" "}
        <span className="text-amethyst">{counts.byRole.dps} DPS</span>
      </p>
      <Link href={`/evenements/${event.id}`} className="button-pixel">
        Choisir mes SR
      </Link>
    </HomeCard>
  );
}

/** The tavern (§4, §5): the scene with its places, then the cards of the moment. */
export default async function TavernPage() {
  const { events, signups } = getApplication();
  const [next] = await events.listUpcoming();
  const counts = next && composition(await signups.listForEvent(next.id));
  const hrefs = sectionHrefs();
  return (
    <>
      <div className="hidden md:block">
        <TavernScene hrefs={hrefs} />
      </div>
      <div className="md:hidden">
        {/* A phone shows the tavern as a strip to slide (§5.2), then one tile per place. */}
        <div className="relative h-[196px] overflow-x-auto">
          {/* eslint-disable-next-line @next/next/no-img-element -- a strip wider than the screen, scrolled by hand */}
          <img src="/images/taverne.jpg" alt="" className="image-pixelated h-[196px] w-[463px] max-w-none" />
          <span className="sticky left-0 bottom-2 ml-2 inline-block -translate-y-9 bg-ink/80 px-2 py-1 text-xs text-parchment">
            Glisse pour explorer →
          </span>
        </div>
        <PlaceTiles hrefs={hrefs} />
      </div>
      <div className="mx-auto grid max-w-[1440px] gap-8 px-4 py-10 md:grid-cols-3 md:px-16">
        <NextRaid event={next} counts={counts} />
        <HomeCard kicker="Quête de la semaine" title="Bientôt">
          <p>Le tableau des quêtes ouvre avec les missions de la guilde.</p>
        </HomeCard>
        <HomeCard kicker="Le Dé Pipé" title="Bientôt">
          <p>Paris et deathroll arrivent avec la salle de jeu.</p>
        </HomeCard>
      </div>
    </>
  );
}
