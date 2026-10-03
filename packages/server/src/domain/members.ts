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

/** Discord role id that grants each guild role. */
export type DiscordRoleMapping = Readonly<Record<MemberRole, string>>;

/**
 * Every guild role granted by the user's Discord roles, in MEMBER_ROLES order. Empty when none of them is a guild
 * role: the user is not part of the guild and may not sign in.
 */
export function rolesFromDiscordRoles(discordRoleIds: readonly string[], mapping: DiscordRoleMapping): MemberRole[] {
  const held = new Set(discordRoleIds);
  return MEMBER_ROLES.filter((role) => held.has(mapping[role]));
}
