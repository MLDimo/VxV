import { canManageRaids, TITLES, titleRole } from "@vxv/server";
import { formatTitleWeek } from "@vxv/server/domain/labels";
import { MemberName } from "@/components/MemberName";
import { Panel } from "@/components/Panel";
import { RankingHeader } from "@/components/RankingHeader";
import { TitleGiveForm } from "@/components/TitleGiveForm";
import { getApplication } from "@/server/application";
import { guildMembers } from "@/server/guildMembers";
import { requireMember } from "@/server/session";

/** Ranking · Titres (P13): the week's holders, each title's rule, and the former weeks. */
export default async function TitlesPage() {
  const member = await requireMember();
  const [current, ...former] = await getApplication().titles.weeks();
  return (
    <>
      <RankingHeader category="/ranking/titres" />
      <p className="mt-6 max-w-3xl text-lavender">
        Chaque mercredi au reset, chaque titre va au membre en tête sur la saison ; à égalité, au premier à atteindre le
        score. Ce que le jeu ne mesure pas (Princesse) est donné par un officier pour la semaine. Chaque titre est aussi
        un rôle Discord.
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
        <Panel title="Semaines passées" className="mt-8">
          <ul className="mt-3 space-y-2 text-sm">
            {former.map((week) => (
              <li key={week.week}>
                <span className="font-bold">{formatTitleWeek(week.week)}</span> :{" "}
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
        </Panel>
      )}
      {canManageRaids(member.roles) && (
        <Panel title="Officiers · titres à donner" officer className="mt-8">
          <p className="mt-2 text-sm text-lavender">
            Pour la semaine en cours, à la place du détenteur actuel ; mercredi au reset, le titre ne va à personne.
          </p>
          <TitleGiveForm members={await guildMembers()} />
        </Panel>
      )}
    </>
  );
}
