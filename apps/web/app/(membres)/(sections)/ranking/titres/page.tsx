import { canManageRaids, TITLES, titleRole } from "@vxv/server";
import { customTitleDuration } from "@vxv/server/domain/customTitles";
import { CustomTitleForm } from "@/components/CustomTitleForm";
import { CustomTitleTakeBackForm } from "@/components/CustomTitleTakeBackForm";
import { MemberName } from "@/components/MemberName";
import { Panel } from "@/components/Panel";
import { RankingScreen } from "@/components/RankingScreen";
import { TitleGiveForm } from "@/components/TitleGiveForm";
import { getApplication } from "@/server/application";
import { guildMembers } from "@/server/guildMembers";
import { requireMember } from "@/server/session";

/** Ranking · Titres (§7.5, P13): the members by weeks of title held, then the week's titles and their rules. */
export default async function TitlesRankingPage({
  searchParams,
}: {
  searchParams: Promise<{ periode?: string | string[] }>;
}) {
  const member = await requireMember();
  const { titles } = getApplication();
  const [[current], custom] = await Promise.all([titles.weeks(1), titles.customTitles()]);
  const officer = canManageRaids(member.roles);
  const members = officer ? await guildMembers() : [];
  return (
    <RankingScreen category="titres" member={member} periodParam={(await searchParams).periode}>
      <p className="mt-10 max-w-3xl text-lavender">
        Chaque mercredi au reset, chaque titre va au membre en tête sur la saison ; à égalité, au premier à atteindre le
        score. Princesse se lit dans le journal de combat des raids ; un officier peut la donner pour la semaine si le
        journal a manqué des soins. Les officiers font aussi des titres à la main, jusqu&apos;au reset ou pour une durée
        indéterminée : ils ne comptent pas dans ce classement. Chaque titre est aussi un rôle Discord.
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
      {custom.length > 0 && (
        <section aria-label="Titres faits main" className="mt-10">
          <h2 className="font-pixel text-xl text-ivory">Titres faits main</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {custom.map((title) => (
              <article key={title.id} className="panel">
                <h3 className="font-pixel text-lg text-sakura-light">{titleRole(title.name)}</h3>
                <p className="mt-2 text-lg">
                  <MemberName name={title.memberName} characterClass={title.memberClass} />
                </p>
                <p className="mt-1 text-sm text-lavender">{title.reason}</p>
                <p className="mt-1 text-xs text-muted">Porté {customTitleDuration(title.untilReset)}</p>
                {officer && <CustomTitleTakeBackForm titleId={title.id} name={title.name} />}
              </article>
            ))}
          </div>
        </section>
      )}
      {officer && (
        <Panel title="Officiers · titres à donner" officer className="mt-8">
          <p className="mt-2 text-sm text-lavender">
            Pour la semaine en cours, à la place du détenteur actuel ; mercredi au reset, le titre revient au membre en
            tête sur sa règle.
          </p>
          <TitleGiveForm members={members} />
          <h3 className="mt-8 font-pixel text-lg text-gold">Créer un titre</h3>
          <p className="mt-2 text-sm text-lavender">
            Un titre à toi, donné à un membre : en jeu, sur Discord et ici, avec la raison que tu écris.
          </p>
          <CustomTitleForm members={members} />
        </Panel>
      )}
    </RankingScreen>
  );
}
