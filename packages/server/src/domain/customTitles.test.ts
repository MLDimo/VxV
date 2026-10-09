import { describe, expect, it } from "vitest";
import { customTitleDuration, customTitleRefusal } from "./customTitles.ts";

describe("titles made by hand", () => {
  it("need a name of their own, short enough", () => {
    expect(customTitleRefusal(" Sauveur du raid ")).toBeUndefined();
    expect(customTitleRefusal("  ")).toBe("Donnez un nom au titre.");
    expect(customTitleRefusal("x".repeat(41))).toMatch(/40 caractères/);
    // The name of a title of the guild would mix their Discord roles.
    expect(customTitleRefusal("princesse")).toMatch(/titre de la guilde/);
  });

  it("say how long they are held", () => {
    expect(customTitleDuration(true)).toBe("jusqu'au reset du mercredi");
    expect(customTitleDuration(false)).toBe("pour une durée indéterminée");
  });
});
