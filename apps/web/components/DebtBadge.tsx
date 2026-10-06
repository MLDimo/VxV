import { formatGold } from "@vxv/server/domain/labels";
import { Badge } from "./Badge";

/** The member's debt (§7.2): an unpaid debt bars them from betting. */
export function DebtBadge({ debt }: { debt: number }) {
  return debt === 0 ? (
    <Badge tone="gain">Dette : aucune</Badge>
  ) : (
    <Badge tone="sakura">Dette : {formatGold(debt)}</Badge>
  );
}
