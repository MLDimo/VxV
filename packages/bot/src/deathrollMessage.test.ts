import { describe, expect, it } from "vitest";
import { emoji } from "./emojis.ts";
import { deathrollMessage } from "./deathrollMessage.ts";

/** French typography keeps numbers and units together: plain spaces here. */
const plain = (text: string | undefined) => text?.replace(/[\u00a0\u202f]/gu, " ");

describe("deathroll message", () => {
  it("tells the winner, the loser, the stake and how many rolls it took, without pinging anyone", () => {
    const message = deathrollMessage(
      { id: "g1", winner: "Thom Leboss", loser: "Vorn Cendrelune", stake: 1500, rolls: 7 },
      "https://vxv.test",
    );
    expect(plain(message.content)).toBe(
      `${emoji("deathroll")} **Deathroll à 1 500 po** : Thom Leboss bat Vorn Cendrelune en 7 rolls. https://vxv.test/paris/deathroll`,
    );
    expect(message.allowed_mentions).toEqual({ parse: [] });
  });
});
