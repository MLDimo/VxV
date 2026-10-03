import { identityFromDiscordUser, type Application, type Member } from "@vxv/server";
import type { APIInteractionGuildMember } from "discord-api-types/v10";

/** The member acting on Discord, recorded with their current name and roles. */
export function actingMember(interaction: { member: APIInteractionGuildMember }, app: Application): Promise<Member> {
  return app.auth.identify(identityFromDiscordUser(interaction.member.user), interaction.member.roles);
}
