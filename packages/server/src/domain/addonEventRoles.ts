import { addonHead, line, text, type AddonReaders } from "./addonText.ts";
import type { EventRoleChoice } from "./eventRoles.ts";

/** First line of the roles an event may be reserved to, for the addon (contract with VXV_Raid); its format version. */
export const ADDON_EVENT_ROLES_HEADER = "VXV-ROLES-1";

/**
 * The roles an officer may reserve an event to, for « Créer un événement » in game, one record per line, after the
 * head of every bundle's data (addonHead: P, O and M):
 * R;Discord role id;name, everybody first (eventRoleChoices)
 */
export function formatAddonEventRoles(roles: readonly EventRoleChoice[], readers: AddonReaders): string {
  return [
    ...addonHead(ADDON_EVENT_ROLES_HEADER, readers),
    ...roles.map((role) => line("R", role.id, text(role.name))),
  ].join("\n");
}
