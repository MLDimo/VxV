import { describe, expect, it } from "vitest";
import { titlesMessage } from "./titlesMessage.ts";

describe("titles message", () => {
  it("shows each title as its Discord role, with its holder or nobody, and its rule", () => {
    const message = titlesMessage(
      {
        week: "2026-10-07",
        holders: [
          { title: "Roi du gambling", rule: "Plus gros gain net.", holder: "Thom Leboss", score: 125 },
          { title: "Sugar Daddy", rule: "Plus gros donateur.", holder: undefined, score: 0 },
        ],
      },
      "https://vxv.test",
    );
    expect(message.embeds?.[0]?.url).toBe("https://vxv.test/ranking/titres");
    expect(message.embeds?.[0]?.fields).toEqual([
      { name: "◆ Roi du gambling", value: "**Thom Leboss**\nPlus gros gain net.", inline: true },
      { name: "◆ Sugar Daddy", value: "Personne cette semaine\nPlus gros donateur.", inline: true },
    ]);
  });
});
