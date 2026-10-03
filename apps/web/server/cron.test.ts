import { describe, expect, it } from "vitest";
import { isCronRequest } from "./cron";

const SECRET = "s".repeat(32);
const withAuthorization = (value?: string) =>
  new Request("https://vxv.test/api/cron/reminders", { headers: value === undefined ? {} : { authorization: value } });

describe("isCronRequest", () => {
  it("accepts Vercel's call with the secret only", () => {
    expect(isCronRequest(withAuthorization(`Bearer ${SECRET}`), SECRET)).toBe(true);
    expect(isCronRequest(withAuthorization(`Bearer ${"x".repeat(32)}`), SECRET)).toBe(false);
    expect(isCronRequest(withAuthorization("Bearer short"), SECRET)).toBe(false);
    expect(isCronRequest(withAuthorization(), SECRET)).toBe(false);
  });
});
