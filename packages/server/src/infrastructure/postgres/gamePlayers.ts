import type { GamePlayer } from "../../application/ports.ts";

type Side = "challenger" | "challenged";

interface PlayerRow {
  character_id: string;
  name: string;
  class: string;
  member_id: string | null;
  member_name: string | null;
  member_class: string | null;
}

/** A player of a game: the character, and its member shown by their main character, else by their Discord name. */
export const PLAYER_COLUMNS = (side: Side) => `
  ${side}.id as ${side}_character_id, ${side}.first_name || ' ' || ${side}.last_name as ${side}_name,
  ${side}.class as ${side}_class, ${side}.member_id as ${side}_member_id,
  coalesce(${side}_main.first_name || ' ' || ${side}_main.last_name, ${side}_member.discord_name) as ${side}_member_name,
  ${side}_main.class as ${side}_member_class`;

/** The joins the player's columns read, from the game's table (deathrolls, chifoumis). */
export const PLAYER_JOINS = (table: string, side: Side) => `
  join characters ${side} on ${side}.id = ${table}.${side}_id
  left join members ${side}_member on ${side}_member.id = ${side}.member_id
  left join characters ${side}_main on ${side}_main.member_id = ${side}.member_id and ${side}_main.is_main`;

export function gamePlayer(row: Record<string, unknown>, side: Side): GamePlayer {
  const field = (name: keyof PlayerRow) => row[`${side}_${name}`] as string | null;
  return {
    characterId: field("character_id") ?? "",
    name: field("name") ?? "",
    characterClass: field("class") ?? "",
    memberId: field("member_id") ?? undefined,
    memberName: field("member_name") ?? undefined,
    memberClass: field("member_class") ?? undefined,
  };
}
