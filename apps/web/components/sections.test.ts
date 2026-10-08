import { describe, expect, it } from "vitest";
import { placeOfPath } from "./sections";

describe("the place of a page", () => {
  it("is the section's place, an event's and the history's being the raid's; none for the others", () => {
    expect(placeOfPath("/paris")?.id).toBe("dice");
    expect(placeOfPath("/paris/deathroll")?.id).toBe("dice");
    expect(placeOfPath("/ranking/titres")?.id).toBe("ranking");
    expect(placeOfPath("/evenements/e1")?.id).toBe("raid");
    expect(placeOfPath("/pvp/evenements/e2")?.id).toBe("pvp");
    expect(placeOfPath("/historique")?.id).toBe("raid");
    expect(placeOfPath("/parisien")).toBeUndefined();
    expect(placeOfPath("/personnages")).toBeUndefined();
  });
});
