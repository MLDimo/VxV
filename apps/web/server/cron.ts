import "server-only";
import { timingSafeEqual } from "node:crypto";
import { getApplication } from "./application";
import { getConfig } from "./config";

/** A scheduled task is called with "Authorization: Bearer <secret>"; compared in constant time. */
export function isCronRequest(request: Request, secret: string): boolean {
  const expected = Buffer.from(`Bearer ${secret}`);
  const received = Buffer.from(request.headers.get("authorization") ?? "");
  return received.length === expected.length && timingSafeEqual(received, expected);
}

/** A task's route: runs the task when called with the secret, and answers what it did. */
function scheduledTask(secret: () => Promise<string> | string, run: () => Promise<object>) {
  return async (request: Request): Promise<Response> => {
    if (!isCronRequest(request, await secret())) {
      return Response.json({ error: "unauthorized" }, { status: 401 });
    }
    return Response.json(await run());
  };
}

/** A daily task of Vercel (vercel.json), called with CRON_SECRET. */
export function cronTask(run: () => Promise<object>): (request: Request) => Promise<Response> {
  return scheduledTask(() => getConfig().cronSecret, run);
}

/** A frequent task of the production database (supabase/schedules.sql), called with the scheduler's token. */
export function databaseTask(run: () => Promise<object>): (request: Request) => Promise<Response> {
  return scheduledTask(() => getApplication().scheduler.token(), run);
}
