import { describe, expect, it } from "vitest";
import { proposalRefusal, statsOf, type ExploitProposal } from "./legend.ts";

const PROPOSAL: ExploitProposal = {
  title: "Ragnaros tombe : premier clear",
  occurredOn: "2026-09-03",
  occurredTime: "23:38",
  place: "Cœur du Magma",
  category: "raid",
  story: "Sept soirées de raid, et Ragnaros tombe enfin au 9e essai.",
  quote: "NE BOUGEZ PLUS.",
  quoteBy: "Ulric",
  stats: ["9e essai", "63 wipes"],
  eventId: undefined,
};
const capture = (contentType: string, size: number) => ({ contentType, bytes: new Uint8Array(size) });

describe("a proposal for the Hall of Fame", () => {
  it("is kept within its limits, with up to four captures", () => {
    expect(proposalRefusal(PROPOSAL, [capture("image/jpeg", 1000)], "2026-10-15")).toBeUndefined();
    expect(proposalRefusal({ ...PROPOSAL, occurredTime: "" }, [], "2026-10-15")).toBeUndefined();
  });

  it("refuses a missing title or story, a day to come, a wrong hour, too many figures or captures", () => {
    const refused = (change: Partial<ExploitProposal>, images = [capture("image/png", 10)]) =>
      proposalRefusal({ ...PROPOSAL, ...change }, images, "2026-10-15");
    expect(refused({ title: " " })).toMatch(/titre/);
    expect(refused({ story: "" })).toMatch(/récit/);
    expect(refused({ occurredOn: "2026-12-24" })).toMatch(/date passée/);
    expect(refused({ occurredTime: "25:00" })).toMatch(/heure/);
    expect(refused({ stats: ["a", "b", "c", "d", "e"] })).toMatch(/4 chiffres/);
    expect(
      refused(
        {},
        [1, 2, 3, 4, 5].map(() => capture("image/png", 10)),
      ),
    ).toMatch(/4 captures/);
    expect(refused({}, [capture("image/gif", 10)])).toMatch(/JPEG, PNG ou WebP/);
    expect(refused({}, [capture("image/png", 2_000_000)])).toMatch(/1,5 Mo/);
  });

  it("reads one figure per line, the empty ones left aside", () => {
    expect(statsOf(" 9e essai \n\n63 wipes\r\n")).toEqual(["9e essai", "63 wipes"]);
  });
});
