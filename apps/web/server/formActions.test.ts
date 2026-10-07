import { ForbiddenError, TextFormatError, ValidationError } from "@vxv/server";
import { describe, expect, it, vi } from "vitest";
import { runFormAction, toErrorState } from "./formActions";

const revalidatePath = vi.hoisted(() => vi.fn());
vi.mock("next/cache", () => ({ revalidatePath }));

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
    expect(toErrorState(new TextFormatError(["Ligne 2", "Ligne 3"])).messages).toEqual(["Ligne 2", "Ligne 3"]);
    expect(toErrorState(new TextFormatError(["Ligne 4"])).messages).toEqual(["Ligne 4"]);
  });

  it("lets unexpected errors propagate", () => {
    expect(() => toErrorState(new Error("database down"))).toThrow("database down");
  });
});

describe("runFormAction", () => {
  it("returns the success message and refreshes the pages", async () => {
    revalidatePath.mockClear();
    expect(await runFormAction(async () => "Fait.", ["/a", "/b"])).toEqual({ status: "success", messages: ["Fait."] });
    expect(revalidatePath.mock.calls).toEqual([["/a"], ["/b"]]);
  });

  it("returns the refusal without refreshing anything", async () => {
    revalidatePath.mockClear();
    const refused = runFormAction(async () => {
      throw new ValidationError("Non.");
    }, ["/a"]);
    expect(await refused).toEqual({ status: "error", messages: ["Non."] });
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
