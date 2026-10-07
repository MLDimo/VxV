import "server-only";
import { timingSafeEqual } from "node:crypto";
import { getConfig } from "./config";

/** Vercel calls the scheduled tasks with "Authorization: Bearer <CRON_SECRET>"; compared in constant time. */
export function isCronRequest(request: Request, secret: string): boolean {
  const expected = Buffer.from(`Bearer ${secret}`);
  const received = Buffer.from(request.headers.get("authorization") ?? "");
  return received.length === expected.length && timingSafeEqual(received, expected);
}

/** A scheduled task's route (vercel.json): runs the task when Vercel calls it, and answers what it did. */
export function cronTask(run: () => Promise<object>): (request: Request) => Promise<Response> {
  return async (request) => {
    if (!isCronRequest(request, getConfig().cronSecret)) {
      return Response.json({ error: "unauthorized" }, { status: 401 });
    }
    return Response.json(await run());
  };
}
