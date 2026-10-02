import type { Member, MemberRole } from "../domain/members.ts";
import { memberRepository } from "../infrastructure/postgres/members.ts";
import type { SqlClient } from "../infrastructure/sql.ts";

/** Saves a member as a Discord sign-in would. */
export function createMember(sql: SqlClient, role: MemberRole, name = `${role}-member`): Promise<Member> {
  return memberRepository(sql).saveFromDiscord({ discordId: `discord-${name}`, discordName: name }, role);
}
