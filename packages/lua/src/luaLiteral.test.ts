import { describe, expect, it } from "vitest";
import { toLuaLiteral, type LuaValue } from "./luaLiteral.ts";
import { evaluateLua } from "./testing.ts";

function roundTrip(value: LuaValue): unknown {
  return evaluateLua(`value = ${toLuaLiteral(value)}`, "value");
}

describe("toLuaLiteral", () => {
  it.each([
    ["plain text", "Onyxia"],
    ["accents", "Tête d'Onyxia, Ðéjà Vu"],
    ["quotes and backslashes", 'a "b" \\ c'],
    ["control characters", "line\nbreak\ttab\u0001"],
    ["a control character followed by digits", "\u0001" + "23"],
  ])("keeps %s intact", (_case, text) => {
    expect(roundTrip(text)).toBe(text);
  });

  it("writes numbers and booleans", () => {
    expect(roundTrip([3065, -1, 1.5, true, false])).toEqual([3065, -1, 1.5, true, false]);
  });

  it("writes nested lists and objects in key order", () => {
    const value = { name: "Onyxia", bosses: [{ encounterId: 1084, loot: [{ itemId: 18423 }] }] };
    expect(toLuaLiteral(value)).toMatchInlineSnapshot(`
      "{
          name = "Onyxia",
          bosses = {
              {
                  encounterId = 1084,
                  loot = {
                      {
                          itemId = 18423,
                      },
                  },
              },
          },
      }"
    `);
    expect(roundTrip(value)).toEqual(value);
  });

  it("brackets keys that are not plain identifiers", () => {
    expect(toLuaLiteral({ end: 1, "two words": 2, ok_1: 3 })).toBe(
      '{\n    ["end"] = 1,\n    ["two words"] = 2,\n    ok_1 = 3,\n}',
    );
  });

  it("writes an empty table", () => {
    expect(toLuaLiteral([])).toBe("{}");
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY])("refuses %s", (value) => {
    expect(() => toLuaLiteral(value)).toThrow(/cannot write/);
  });
});
