import type { PGliteInterface, Transaction } from "@electric-sql/pglite";
import { createMigratedDatabase } from "@vxv/database/testing";
import type { SqlClient } from "./infrastructure/sql.ts";

function sqlClientFromTransaction(transaction: Transaction): SqlClient {
  const client: SqlClient = {
    query: async <Row>(text: string, params: readonly unknown[] = []) =>
      (await transaction.query<Row>(text, [...params])).rows,
    transaction: (work) => work(client),
  };
  return client;
}

/** SqlClient over an in-process PGlite database. */
export function sqlClientFromPGlite(database: PGliteInterface): SqlClient {
  return {
    query: async <Row>(text: string, params: readonly unknown[] = []) =>
      (await database.query<Row>(text, [...params])).rows,
    transaction: (work) => database.transaction((transaction) => work(sqlClientFromTransaction(transaction))),
  };
}

/** A fresh migrated database and its SqlClient, for tests. */
export async function createTestDatabase(): Promise<{ database: PGliteInterface; sql: SqlClient }> {
  const database = await createMigratedDatabase();
  return { database, sql: sqlClientFromPGlite(database) };
}

export { createFakeDiscord, type FakeDiscord, type FakeDiscordReply } from "./infrastructure/discord/fakeDiscord.ts";
