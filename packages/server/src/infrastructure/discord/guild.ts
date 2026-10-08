import type { GuildGateway } from "../../application/discordPorts.ts";
import { createDiscordRest, DiscordApiError, type DiscordRestOptions } from "./rest.ts";

const HTTP_FORBIDDEN = 403;
const HTTP_NOT_FOUND = 404;
const AUDIT_REASON = "VXV : personnage principal";
const TITLES_REASON = "VXV : titres de la semaine";

interface DiscordRole {
  id: string;
  name: string;
  managed: boolean;
  color: number;
}

/** The guild's Discord server through the REST API, acting as the bot. */
export function createDiscordGuild({ guildId, ...options }: DiscordRestOptions & { guildId: string }): GuildGateway {
  const request = createDiscordRest(options);
  const memberPath = (discordId: string) => `/guilds/${guildId}/members/${discordId}`;

  const listRoles = () => request<DiscordRole[]>("GET", `/guilds/${guildId}/roles`);

  /** The server's roles, and the one of this name, created when missing, recoloured when it has another colour. */
  async function roleNamed(
    { name, color }: { name: string; color?: number },
    reason: string,
  ): Promise<{ roles: DiscordRole[]; target: DiscordRole }> {
    const roles = await listRoles();
    const found = roles.find((role) => role.name === name);
    if (found === undefined) {
      const body = { name, color, mentionable: true };
      return { roles, target: await request<DiscordRole>("POST", `/guilds/${guildId}/roles`, { body, reason }) };
    }
    if (color !== undefined && found.color !== color) {
      await request("PATCH", `/guilds/${guildId}/roles/${found.id}`, { body: { color }, reason });
    }
    return { roles, target: found };
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

    async setOnlyRoleAmong(discordId, role, group) {
      const { roles, target } = await roleNamed(role, AUDIT_REASON);
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
      const { target } = await roleNamed({ name: roleName }, TITLES_REASON);
      await request("PUT", `${memberPath(discordId)}/roles/${target.id}`, { reason: TITLES_REASON });
    },

    async removeRole(discordId, roleName) {
      const target = (await listRoles()).find((role) => role.name === roleName);
      if (target !== undefined) {
        await request("DELETE", `${memberPath(discordId)}/roles/${target.id}`, { reason: TITLES_REASON });
      }
    },

    async listRoles() {
      // Discord gives @everyone the server's own id.
      return (await listRoles()).map(({ id, name, managed }) => ({ id, name, everyone: id === guildId, managed }));
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
