import { ForbiddenError, RosterFormatError, ValidationError } from "@vxv/server";
import { describe, expect, it } from "vitest";
import { toErrorState } from "./actionErrors";

describe("toErrorState", () => {
  it("shows the message of an application refusal", () => {
    expect(toErrorState(new ForbiddenError())).toEqual({
      status: "error",
      messages: ["Cette action est réservée aux officiers."],
    });
    expect(toErrorState(new ValidationError("Motif obligatoire"))).toEqual({
      status: "error",
      messages: ["Motif obligatoire"],
    });
  });

  it("lists every problem of a malformed roster", () => {
    expect(toErrorState(new RosterFormatError(["Ligne 2", "Ligne 3"])).messages).toEqual(["Ligne 2", "Ligne 3"]);
  });

  it("lets unexpected errors propagate", () => {
    expect(() => toErrorState(new Error("database down"))).toThrow("database down");
  });
});
