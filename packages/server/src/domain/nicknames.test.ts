import { describe, expect, it } from "vitest";
import { guildNickname, MAX_NICKNAME_LENGTH } from "./nicknames.ts";

const deja = { firstName: "Ðéjà", lastName: "Vu" };

describe("guildNickname", () => {
  it("joins the pseudo and the character when they fit", () => {
    expect(guildNickname("Martin", deja)).toBe("Martin - [Ðéjà Vu]");
  });

  it("shortens a long pseudo first, keeping the character readable", () => {
    const nickname = guildNickname("UnPseudoBeaucoupTropLongPourDiscord", deja);
    expect(nickname).toBe("UnPseudoBeaucoupTro… - [Ðéjà Vu]");
    expect(nickname.length).toBe(MAX_NICKNAME_LENGTH);
  });

  it("shortens the whole nickname when the character's name alone is too long", () => {
    const nickname = guildNickname("Martin", { firstName: "Brindecieuxlumineux", lastName: "Ventdesudouest" });
    expect(nickname.length).toBe(MAX_NICKNAME_LENGTH);
    expect(nickname.startsWith("Martin - [Brindecieux")).toBe(true);
    expect(nickname.endsWith("…")).toBe(true);
  });

  it("never cuts an emoji in two", () => {
    const nickname = guildNickname("🐉".repeat(20), deja);
    expect(nickname.length).toBeLessThanOrEqual(MAX_NICKNAME_LENGTH);
    expect(nickname).toMatch(/^(🐉)+… - \[Ðéjà Vu\]$/u);
  });
});
