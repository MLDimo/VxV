import { getApplication } from "@/server/application";
import { cronTask } from "@/server/cron";

/** Weekly task (Wednesday at reset): the titles go to the members ahead over the season (P13.2). */
export const GET = cronTask(async () => ({ reassigned: await getApplication().titles.reassign() }));
