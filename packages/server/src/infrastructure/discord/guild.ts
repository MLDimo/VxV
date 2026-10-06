import type { GuildGateway } from "../../application/ports.ts";
import { createDiscordRest, DiscordApiError, type DiscordRestOptions } from "./rest.ts";

const HTTP_FORBIDDEN = 403;
const HTTP_NOT_FOUND = 404;
const AUDIT_REASON = "VXV : personnage principal";
const TITLES_REASON = "VXV : titres de la semaine";

interface DiscordRole {
  id: string;
  name: string;
}

/** The guild's Discord server through the REST API, acting as the bot. */
export function createDiscordGuild({ guildId, ...options }: DiscordRestOptions & { guildId: string }): GuildGateway {
  const request = createDiscordRest(options);
  const memberPath = (discordId: string) => `/guilds/${guildId}/members/${discordId}`;

  /** The server's roles, and the one of this name, created when missing. */
  async function roleNamed(roleName: string, reason: string): Promise<{ roles: DiscordRole[]; target: DiscordRole }> {
    const roles = await request<DiscordRole[]>("GET", `/guilds/${guildId}/roles`);
    const target =
      roles.find((role) => role.name === roleName) ??
      (await request<DiscordRole>("POST", `/guilds/${guildId}/roles`, {
        body: { name: roleName, mentionable: true },
        reason,
      }));
    return { roles, target };
  }

  return {
    async setNickname(discordId, nickname) {
      try {
        await request("PATCH", memberPath(discordId), { body: { nick: nickname }, reason: AUDIT_REASON });
        return true;
      } catch (error) {
        if (error instanceof DiscordApiError && error.status === HTTP_FORBIDDEN) {
          return false;
        }
        throw error;
      }
    },

    async setOnlyRoleAmong(discordId, roleName, group) {
      const { roles, target } = await roleNamed(roleName, AUDIT_REASON);
      const groupIds = new Set(roles.filter((role) => group.includes(role.name)).map((role) => role.id));
      const member = await request<{ roles: string[] }>("GET", memberPath(discordId));
      for (const roleId of member.roles.filter((id) => groupIds.has(id) && id !== target.id)) {
        await request("DELETE", `${memberPath(discordId)}/roles/${roleId}`, { reason: AUDIT_REASON });
      }
      if (!member.roles.includes(target.id)) {
        await request("PUT", `${memberPath(discordId)}/roles/${target.id}`, { reason: AUDIT_REASON });
      }
    },

    async addRole(discordId, roleName) {
      const { target } = await roleNamed(roleName, TITLES_REASON);
      await request("PUT", `${memberPath(discordId)}/roles/${target.id}`, { reason: TITLES_REASON });
    },

    async removeRole(discordId, roleName) {
      const roles = await request<DiscordRole[]>("GET", `/guilds/${guildId}/roles`);
      const target = roles.find((role) => role.name === roleName);
      if (target !== undefined) {
        await request("DELETE", `${memberPath(discordId)}/roles/${target.id}`, { reason: TITLES_REASON });
      }
    },

    async fetchRoleIds(discordId) {
      try {
        return (await request<{ roles: string[] }>("GET", memberPath(discordId))).roles;
      } catch (error) {
        if (error instanceof DiscordApiError && error.status === HTTP_NOT_FOUND) {
          return undefined;
        }
        throw error;
      }
    },
  };
}
