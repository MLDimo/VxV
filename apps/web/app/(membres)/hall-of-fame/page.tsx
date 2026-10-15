import { canManageRaids } from "@vxv/server";
import Link from "next/link";
import { LegendCorridor } from "@/components/LegendCorridor";
import { legendDay } from "@/components/legendDates";
import { roman } from "@/components/roman";
import { getApplication } from "@/server/application";
import { requireMember } from "@/server/session";

/** The Hall of Fame (mockup HallOfFame): the guild's legend, a corridor of paintings, chapter after chapter. */
export default async function HallOfFamePage() {
  const member = await requireMember();
  const { legend } = getApplication();
  const corridor = await legend.corridor(member);
  const officer = canManageRaids(member.roles);
  const waiting = officer ? (await legend.proposals(member)).length : 0;
  const chapters = corridor.chapters.map((entry, index) => ({
    id: entry.chapter.id,
    numeral: roman(index + 1),
    title: entry.chapter.title,
    period: entry.chapter.period,
    paintings: entry.paintings.map((painting) => ({
      id: painting.exploit.id,
      title: painting.exploit.title,
      date: legendDay(painting.exploit.occurredOn),
      rarity: painting.exploit.rarity ?? "rare",
      category: painting.exploit.category,
      imageUrl: painting.imageId && `/api/hall-of-fame/images/${painting.imageId}`,
      mine: painting.mine,
    })),
  }));
  return (
    <>
      <section className="mx-auto flex max-w-[1360px] flex-wrap items-end gap-x-8 gap-y-4.5 px-5 pt-8 pb-5.5">
        <div className="flex min-w-0 flex-[999_1_480px] flex-col gap-2">
          <span className="text-xs font-extrabold tracking-[0.18em] text-neon uppercase">Hall of Fame</span>
          <h1 className="font-pixel text-[clamp(34px,5vw,52px)] leading-none font-bold text-ivory [text-shadow:4px_4px_0_var(--color-wood-tab)]">
            La légende de VXV
          </h1>
          <p className="max-w-160 leading-relaxed text-lavender">
            Au fond de la taverne, chaque tableau raconte une soirée qui a fait VXV. Avance dans le couloir, chapitre
            après chapitre.
          </p>
        </div>
        <div className="flex flex-[1_1_300px] flex-wrap items-center gap-x-5 gap-y-2.5 text-sm text-lavender">
          <span>
            <b className="font-pixel text-2xl text-gold">{corridor.paintings}</b>{" "}
            {corridor.paintings === 1 ? "tableau" : "tableaux"}
          </span>
          <span>
            <b className="font-pixel text-2xl text-gold">{corridor.chapters.length}</b>{" "}
            {corridor.chapters.length === 1 ? "chapitre" : "chapitres"}
          </span>
          <span>
            <b className="font-pixel text-2xl text-gold">{corridor.members}</b>{" "}
            {corridor.members === 1 ? "membre" : "membres"}
          </span>
          <Link href="/hall-of-fame/proposer" className="button-gold ml-auto">
            Proposer un exploit
          </Link>
          {officer && (
            <Link href="/hall-of-fame/propositions" className="button-wood text-gold">
              Propositions ({waiting})
            </Link>
          )}
        </div>
      </section>
      <LegendCorridor chapters={chapters} memberName={member.discordName} />
      <footer className="bg-wood-night shadow-[0_-3px_0_var(--color-ink),0_-6px_0_var(--color-beam)]">
        <p className="mx-auto max-w-[1360px] px-5 py-5.5 text-sm text-muted">
          Une capture ou un souvenir à ajouter ? Passe par « Proposer un exploit ».
        </p>
      </footer>
    </>
  );
}
