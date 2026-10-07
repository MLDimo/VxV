import { classLabel, CLASS_ROLE_NAMES } from "../domain/characterClasses.ts";
import type { Member } from "../domain/members.ts";
import { guildNickname } from "../domain/nicknames.ts";
import type { UnitOfWork } from "./ports.ts";
import type { GuildGateway } from "./discordPorts.ts";

/** "noMain": nothing to show yet; "nicknameRefused": Discord kept the nickname, the class role is set. */
export type DiscordProfileSync = "updated" | "nicknameRefused" | "noMain";

const SYNC_MESSAGES: Record<DiscordProfileSync, string> = {
  updated: "Pseudo Discord et rôle de classe mis à jour.",
  nicknameRefused:
    "Rôle de classe mis à jour. Discord ne laisse pas le bot changer ce pseudo (propriétaire du serveur, " +
    "ou rôle placé au-dessus de celui du bot) : il faut le changer à la main.",
  noMain: "",
};
const SYNC_FAILURE = "Le pseudo Discord et le rôle de classe n'ont pas pu être mis à jour : préviens un officier.";

export function createDiscordProfiles({ unitOfWork, guild }: { unitOfWork: UnitOfWork; guild: GuildGateway }) {
  /** Puts the member's Discord nickname and class role in line with their main character. */
  async function sync(member: Member): Promise<DiscordProfileSync> {
    const characters = await unitOfWork.run((repositories) => repositories.characters.listByMember(member.id));
    const main = characters.find((character) => character.isMain);
    if (main === undefined) {
      return "noMain";
    }
    await guild.setOnlyRoleAmong(member.discordId, classLabel(main.characterClass), CLASS_ROLE_NAMES);
    const renamed = await guild.setNickname(member.discordId, guildNickname(member.discordName, main));
    return renamed ? "updated" : "nicknameRefused";
  }

  return {
    sync,

    /** The same, as a sentence for the member. Never fails: the character is linked whatever Discord answers. */
    async syncForMessage(member: Member): Promise<string> {
      try {
        return SYNC_MESSAGES[await sync(member)];
      } catch (error) {
        console.error("Discord profile sync failed", error);
        return SYNC_FAILURE;
      }
    },
  };
}
