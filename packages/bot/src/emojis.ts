import type { EventKind } from "@vxv/server/domain/events";
import type { LootMethod } from "@vxv/server/domain/history";
import type { SignupRole, SignupStatus } from "@vxv/server/domain/signups";
import type { APIMessageComponentEmoji } from "discord-api-types/v10";
import { EMOJI_IDS } from "./emojiIds.ts";

/** The bot's emojis (packages/bot/emojis), on its Discord application. */
export type EmojiName = keyof typeof EMOJI_IDS;

/** An emoji of the bot as a message's text writes it. */
export function emoji(name: EmojiName): string {
  return `<:${name}:${EMOJI_IDS[name]}>`;
}

/** An emoji of the bot as a button or a menu option shows it. */
export function componentEmoji(name: EmojiName): APIMessageComponentEmoji {
  return { id: EMOJI_IDS[name], name };
}

/** A raid night under the raid's icon, a PvP outing under the Horde's. */
export const EVENT_EMOJIS: Record<EventKind, EmojiName> = { raid: "raid", pvp: "horde" };

export const ROLE_EMOJIS: Record<SignupRole, EmojiName> = {
  tank: "role_tank",
  healer: "role_heal",
  dps: "role_dps",
};

export const STATUS_EMOJIS: Record<SignupStatus, EmojiName> = {
  present: "statut_present",
  maybe: "statut_peutetre",
  late: "statut_retard",
  bench: "statut_banc",
  absent: "statut_absent",
};

export const LOOT_METHOD_EMOJIS: Record<LootMethod, EmojiName> = {
  soft_reserve: "sr",
  soft_reserve_plus: "sr_plus",
  free_roll: "roll",
  loot_council: "council",
};

/** By class token as the game reports it. */
const CLASS_EMOJIS: Readonly<Record<string, EmojiName>> = {
  WARRIOR: "guerrier",
  PALADIN: "paladin",
  HUNTER: "chasseur",
  ROGUE: "voleur",
  PRIEST: "pretre",
  SHAMAN: "chaman",
  MAGE: "mage",
  WARLOCK: "demoniste",
  DRUID: "druide",
};

/** By class token, then by the usual specs' names (SPEC_SUGGESTIONS). */
export const SPEC_EMOJIS: Readonly<Record<string, Readonly<Record<string, EmojiName>>>> = {
  WARRIOR: { Armes: "spe_guerrier_armes", Fureur: "spe_guerrier_fureur", Protection: "spe_guerrier_protection" },
  PALADIN: { Sacré: "spe_paladin_sacre", Protection: "spe_paladin_protection", Vindicte: "spe_paladin_vindicte" },
  HUNTER: {
    "Maîtrise des bêtes": "spe_chasseur_betes",
    Précision: "spe_chasseur_precision",
    Survie: "spe_chasseur_survie",
  },
  ROGUE: { Assassinat: "spe_voleur_assassinat", Combat: "spe_voleur_combat", Finesse: "spe_voleur_finesse" },
  PRIEST: { Discipline: "spe_pretre_discipline", Sacré: "spe_pretre_sacre", Ombre: "spe_pretre_ombre" },
  SHAMAN: {
    Élémentaire: "spe_chaman_elementaire",
    Amélioration: "spe_chaman_amelioration",
    Restauration: "spe_chaman_restauration",
  },
  MAGE: { Arcanes: "spe_mage_arcanes", Feu: "spe_mage_feu", Givre: "spe_mage_givre" },
  WARLOCK: {
    Affliction: "spe_demoniste_affliction",
    Démonologie: "spe_demoniste_demonologie",
    Destruction: "spe_demoniste_destruction",
  },
  DRUID: {
    Équilibre: "spe_druide_equilibre",
    "Combat farouche": "spe_druide_feral",
    Restauration: "spe_druide_restauration",
  },
};

/** A class's emoji, or undefined for a class token this version does not know. */
export function classEmoji(characterClass: string): EmojiName | undefined {
  return CLASS_EMOJIS[characterClass];
}

/** A usual spec's emoji, or undefined for a spec written by the player. */
export function specEmoji(characterClass: string, spec: string): EmojiName | undefined {
  return SPEC_EMOJIS[characterClass]?.[spec];
}
