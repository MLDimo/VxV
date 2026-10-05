import { asCompanion } from "@/server/companionApi";

/** Who the companion acts for: shown in its window, and its way to check that the link still holds. */
export async function GET(request: Request): Promise<Response> {
  return asCompanion(request, async (member) => Response.json({ name: member.discordName, roles: member.roles }));
}
