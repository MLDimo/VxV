/** Guild roles, from the lowest to the highest rank. A member may hold several: an officer can also be treasurer. */
export const MEMBER_ROLES = ["member", "treasurer", "officer", "gm"] as const;

export type MemberRole = (typeof MEMBER_ROLES)[number];

export interface Member {
  id: string;
  discordId: string;
  discordName: string;
  /** Never empty, in MEMBER_ROLES order. */
  roles: readonly MemberRole[];
}

/** Roles granted by a Discord role. Everybody on the guild's Discord server is a member, without any role. */
export type GrantedRole = Exclude<MemberRole, "member">;

/** Discord role id that grants each role above member. */
export type DiscordRoleMapping = Readonly<Record<GrantedRole, string>>;

/** Guild roles of a user on the guild's Discord server, in MEMBER_ROLES order: member, plus their granted roles. */
export function rolesFromDiscordRoles(discordRoleIds: readonly string[], mapping: DiscordRoleMapping): MemberRole[] {
  const held = new Set(discordRoleIds);
  return MEMBER_ROLES.filter((role) => role === "member" || held.has(mapping[role]));
}
