import type { UnitOfWork } from "./ports.ts";

/** The website's frequent tasks, called by the production database with the token both read (supabase/schedules.sql). */
export function createScheduler({ unitOfWork }: { unitOfWork: UnitOfWork }) {
  return {
    /** The token the database sends with each call. */
    token(): Promise<string> {
      return unitOfWork.run(({ scheduler }) => scheduler.token());
    },
  };
}
