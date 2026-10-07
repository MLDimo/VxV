import { RankingScreen } from "@/components/RankingScreen";
import { requireMember } from "@/server/session";

/** Ranking · Quêtes (§7.5, owner's decision of 7 October): 3, 2 and 1 points for the places of each mission. */
export default async function QuestsRankingPage({
  searchParams,
}: {
  searchParams: Promise<{ periode?: string | string[] }>;
}) {
  return <RankingScreen category="quetes" member={await requireMember()} periodParam={(await searchParams).periode} />;
}
