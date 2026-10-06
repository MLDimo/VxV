import { TAVERN_CARDS } from "@vxv/design";
import { composition, type BetView, type Composition, type RaidEvent } from "@vxv/server";
import { count, formatGold, formatShortEventDate, raidTitle } from "@vxv/server/domain/labels";
import Link from "next/link";
import { HomeCard } from "@/components/HomeCard";
import { PlaceTiles } from "@/components/PlaceTiles";
import { sectionHrefs } from "@/components/sections";
import { TavernScene } from "@/components/TavernScene";
import { getApplication } from "@/server/application";

function NextRaid({
  kicker,
  event,
  counts,
}: {
  kicker: string;
  event: RaidEvent | undefined;
  counts: Composition | undefined;
}) {
  if (event === undefined || counts === undefined) {
    return (
      <HomeCard kicker={kicker} title="Aucun raid prévu">
        <p>Les officiers annoncent les raids sur le site et sur Discord.</p>
        <Link href="/raid" className="button-pixel">
          Voir les raids
        </Link>
      </HomeCard>
    );
  }
  const expected = counts.byStatus.present + counts.byStatus.late;
  return (
    <HomeCard kicker={kicker} title={formatShortEventDate(event.startsAt)}>
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

/** Le Dé Pipé's card: the bet closing soonest, or how bets come. */
function NextBet({ kicker, view }: { kicker: string; view: BetView | undefined }) {
  if (view === undefined) {
    return (
      <HomeCard kicker={kicker} title="Aucun pari ouvert">
        <p>Les officiers lancent les paris sur le site et sur Discord.</p>
        <Link href="/paris" className="button-pixel">
          Entrer
        </Link>
      </HomeCard>
    );
  }
  return (
    <HomeCard kicker={kicker} title={view.bet.title}>
      <p>
        Ferme {formatShortEventDate(view.bet.closesAt)} · {count(view.book.bettors, "parieur")}
      </p>
      <p className="font-pixel text-lg text-gold">Cagnotte {formatGold(view.book.pool)}</p>
      <Link href={`/paris/${view.bet.id}`} className="button-pixel">
        Entrer
      </Link>
    </HomeCard>
  );
}

/** The tavern (§4, §5): the scene with its places, then the cards of the moment. */
export default async function TavernPage() {
  const { events, signups, bets } = getApplication();
  const [next] = await events.listUpcoming();
  const nextBet = (await bets.list()).find((view) => view.open);
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
        {TAVERN_CARDS.map((card) =>
          card.place === "raid" ? (
            <NextRaid key={card.place} kicker={card.kicker} event={next} counts={counts} />
          ) : card.place === "dice" ? (
            <NextBet key={card.place} kicker={card.kicker} view={nextBet} />
          ) : (
            <HomeCard key={card.place} kicker={card.kicker} title="Bientôt">
              <p>{card.soon}</p>
            </HomeCard>
          ),
        )}
      </div>
    </>
  );
}
