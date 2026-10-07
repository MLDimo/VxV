import { readdir, readFile } from "node:fs/promises";
import { PGlite, type PGliteInterface } from "@electric-sql/pglite";

/** The in-process PostgreSQL, for the tests of the other packages: they depend on this package only. */
export { PGlite, type PGliteInterface, type Transaction } from "@electric-sql/pglite";

const MIGRATIONS_DIR = new URL("../migrations/", import.meta.url);

let migratedTemplate: Promise<PGlite> | undefined;

async function migrate(): Promise<PGlite> {
  const database = new PGlite();
  const files = (await readdir(MIGRATIONS_DIR)).filter((file) => file.endsWith(".sql")).sort();
  for (const file of files) {
    await database.exec(await readFile(new URL(file, MIGRATIONS_DIR), "utf8"));
  }
  return database;
}

/** A new migrated PGlite instance, for tools that need the concrete class (e.g. a PostgreSQL socket server). */
export function createMigratedPGlite(): Promise<PGlite> {
  return migrate();
}

/**
 * Returns a fresh in-process PostgreSQL database with every migration applied in file-name order.
 * Migrations run once per test process; each call clones that template, which is much faster.
 */
export async function createMigratedDatabase(): Promise<PGliteInterface> {
  migratedTemplate ??= migrate();
  return (await migratedTemplate).clone();
}
