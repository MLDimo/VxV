import { RankingScreen } from "@/components/RankingScreen";
import { requireMember } from "@/server/session";

/** Ranking · Deathroll (§7.5, P15.7): the players by net gain. */
export default async function DeathrollRankingPage({
  searchParams,
}: {
  searchParams: Promise<{ periode?: string | string[] }>;
}) {
  return (
    <RankingScreen category="deathroll" member={await requireMember()} periodParam={(await searchParams).periode} />
  );
}
