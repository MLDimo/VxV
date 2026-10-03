import { describe, expect, it } from "vitest";
import { identityFromDiscordUser } from "./users.ts";

describe("identityFromDiscordUser", () => {
  it("prefers the display name, and falls back to the username", () => {
    expect(identityFromDiscordUser({ id: "1", username: "deja", global_name: "Déjà" })).toEqual({
      discordId: "1",
      discordName: "Déjà",
    });
    expect(identityFromDiscordUser({ id: "1", username: "deja", global_name: null }).discordName).toBe("deja");
  });
});
