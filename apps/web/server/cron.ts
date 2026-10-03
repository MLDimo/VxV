import "server-only";
import { timingSafeEqual } from "node:crypto";

/** Vercel calls the scheduled tasks with "Authorization: Bearer <CRON_SECRET>"; compared in constant time. */
export function isCronRequest(request: Request, secret: string): boolean {
  const expected = Buffer.from(`Bearer ${secret}`);
  const received = Buffer.from(request.headers.get("authorization") ?? "");
  return received.length === expected.length && timingSafeEqual(received, expected);
}
