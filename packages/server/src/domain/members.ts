/** Guild roles, from the lowest to the highest rank. */
export const MEMBER_ROLES = ["member", "treasurer", "officer", "gm"] as const;

export type MemberRole = (typeof MEMBER_ROLES)[number];

export interface Member {
  id: string;
  discordId: string;
  discordName: string;
  role: MemberRole;
}

/** Discord role id that grants each guild role. */
export type DiscordRoleMapping = Readonly<Record<MemberRole, string>>;

/**
 * Highest guild role granted by the user's Discord roles, or undefined when none of them is a guild role
 * (the user is not part of the guild and may not sign in).
 */
export function roleFromDiscordRoles(
  discordRoleIds: readonly string[],
  mapping: DiscordRoleMapping,
): MemberRole | undefined {
  const held = new Set(discordRoleIds);
  return [...MEMBER_ROLES].reverse().find((role) => held.has(mapping[role]));
}
