import { TITLES, titleRole } from "@vxv/server";
import { MemberName } from "@/components/MemberName";
import { RankingNav } from "@/components/RankingNav";
import { ScreenHeader } from "@/components/ScreenHeader";
import { getApplication } from "@/server/application";
import { requireMember } from "@/server/session";

const WEEK = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", timeZone: "UTC" });

/** "semaine du 7 octobre". */
function weekLabel(week: string): string {
  return `semaine du ${WEEK.format(new Date(`${week}T00:00:00Z`))}`;
}

/** Ranking · Titres (P13): the week's holders, each title's rule, and the former weeks. */
export default async function TitlesPage() {
  await requireMember();
  const [current, ...former] = await getApplication().titles.weeks();
  return (
    <>
      <ScreenHeader kicker="Au-dessus de la cheminée" kickerClassName="text-gold" title="Ranking" />
      <div className="mt-6">
        <RankingNav current="/ranking/titres" />
      </div>
      <p className="mt-6 max-w-3xl text-lavender">
        Chaque mercredi au reset, chaque titre va au membre en tête sur la saison ; à égalité, au premier à atteindre le
        score. Chaque titre est aussi un rôle Discord.
      </p>
      <section aria-label="Titres de la semaine" className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {TITLES.map((title) => {
          const holder = current?.holders.find((candidate) => candidate.titleId === title.id);
          return (
            <article key={title.id} className="panel">
              <h2 className="font-pixel text-lg text-sakura-light">{titleRole(title.name)}</h2>
              <p className="mt-2 text-lg">
                {holder === undefined ? (
                  <span className="text-muted">Personne cette semaine</span>
                ) : (
                  <MemberName name={holder.memberName} characterClass={holder.memberClass} />
                )}
              </p>
              <p className="mt-1 text-sm text-lavender">{title.rule}</p>
            </article>
          );
        })}
      </section>
      {current === undefined && (
        <p className="mt-4 text-sm text-muted">Les premiers titres seront donnés mercredi matin.</p>
      )}
      {former.length > 0 && (
        <section className="panel mt-8" aria-label="Semaines passées">
          <h2 className="font-pixel text-xl text-ivory">Semaines passées</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {former.map((week) => (
              <li key={week.week}>
                <span className="font-bold">{weekLabel(week.week)}</span> :{" "}
                {week.holders.map((holder, index) => (
                  <span key={holder.titleId}>
                    {index > 0 && " · "}
                    {TITLES.find((title) => title.id === holder.titleId)?.name ?? holder.titleId}{" "}
                    <MemberName name={holder.memberName} characterClass={holder.memberClass} />
                  </span>
                ))}
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
