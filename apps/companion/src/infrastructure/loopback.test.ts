import { describe, expect, it } from "vitest";
import { listenForReturn } from "./loopback.ts";

describe("loopback listener", () => {
  it("receives the browser's return on this computer, and thanks the member", async () => {
    const listener = await listenForReturn();
    try {
      const response = await fetch(`http://127.0.0.1:${String(listener.port)}/retour?code=abc&etat=xyz`);
      expect(await response.text()).toContain("revenir au compagnon");
      const query = await listener.returned;
      expect(query.get("code")).toBe("abc");
      expect(query.get("etat")).toBe("xyz");
    } finally {
      listener.close();
    }
  });

  it("ignores any other address", async () => {
    const listener = await listenForReturn();
    try {
      const response = await fetch(`http://127.0.0.1:${String(listener.port)}/autre`);
      expect(response.status).toBe(404);
    } finally {
      listener.close();
    }
  });
});
