import { describe, expect, it } from "vitest";
import { instant, readRecords, TextFormatError, textLines, wholeNumber } from "./textFormat.ts";

describe("the addon's texts", () => {
  it("keeps the number of each line in the text, blank lines aside", () => {
    expect(textLines("VXV-X-1\r\n\n  A; 1 ;deux \n")).toEqual([
      { number: 1, fields: ["VXV-X-1"] },
      { number: 3, fields: ["A", "1", "deux"] },
    ]);
  });

  it("reads whole numbers and instants, nothing else", () => {
    expect([wholeNumber("12"), wholeNumber("0"), wholeNumber("-1"), wholeNumber("1.5"), wholeNumber("")]).toEqual([
      12,
      0,
      undefined,
      undefined,
      undefined,
    ]);
    expect(instant("1796904000")).toEqual(new Date("2026-12-10T12:00:00Z"));
    expect(instant("0")).toBeUndefined();
  });

  it("gives each line to the reader of its kind, skips unknown kinds and lists the unreadable lines", () => {
    const read: string[][] = [];
    const format = {
      headers: ["VXV-X-1", "VXV-X-2"],
      wrongHeader: "Pas un texte X.",
      readers: { A: (fields: string[]) => read.push(fields) > 0 && fields[0] !== "faux" },
      advice: "recopiez-le",
    };
    readRecords("VXV-X-1\nA;1;2\nZ;newer kind", format);
    expect(read).toEqual([["1", "2"]]);
    expect(() => readRecords("VXV-X-2\n\nA;faux\nA;faux", format)).toThrow(
      new TextFormatError(["Ligne 3 illisible : recopiez-le.", "Ligne 4 illisible : recopiez-le."]),
    );
    expect(() => readRecords("VXV-Y-1\nA;1", format)).toThrow("Pas un texte X.");
  });
});
