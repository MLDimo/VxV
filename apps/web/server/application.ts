import "server-only";
import { createApplication, createPgSqlClient, type Application } from "@vxv/server";
import { getConfig } from "./config";

let application: Application | undefined;

/** One application (and one connection pool) per server instance. */
export function getApplication(): Application {
  if (application === undefined) {
    const { databaseUrl, discord } = getConfig();
    application = createApplication({ sql: createPgSqlClient(databaseUrl), discordRoles: discord.roles });
  }
  return application;
}
