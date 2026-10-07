import { canManageRaids } from "@vxv/server";
import { Panel } from "@/components/Panel";
import { RankingScreen } from "@/components/RankingScreen";
import { SeasonForm } from "@/components/SeasonForm";
import { requireMember } from "@/server/session";

/** Ranking · Paris (§7.5, P11.7): the bettors by net gain, and the officers' seasons. */
export default async function BetsRankingPage({
  searchParams,
}: {
  searchParams: Promise<{ periode?: string | string[] }>;
}) {
  const member = await requireMember();
  return (
    <RankingScreen category="paris" member={member} periodParam={(await searchParams).periode}>
      {canManageRaids(member.roles) && (
        <Panel title="Officiers · saisons" officer className="mt-10">
          <p className="mt-2 text-sm text-lavender">
            Une nouvelle saison remet à zéro les classements « Saison » ; les autres périodes ne changent pas.
          </p>
          <SeasonForm />
        </Panel>
      )}
    </RankingScreen>
  );
}
