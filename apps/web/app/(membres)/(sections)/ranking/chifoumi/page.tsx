import { RankingScreen } from "@/components/RankingScreen";
import { requireMember } from "@/server/session";

/** Ranking · Chi Fou Mi (§7.5): the players by net gain. */
export default async function ChifoumiRankingPage({
  searchParams,
}: {
  searchParams: Promise<{ periode?: string | string[] }>;
}) {
  return (
    <RankingScreen category="chifoumi" member={await requireMember()} periodParam={(await searchParams).periode} />
  );
}
