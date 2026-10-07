import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PGlite } from "@vxv/database/testing";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createPgSqlClient, type PgSqlClient } from "./sql.ts";

/** The production client (node-postgres) talks to an in-process PGlite through the PostgreSQL protocol. */
describe("createPgSqlClient", () => {
  let directory: string;
  let database: PGlite;
  let server: PGLiteSocketServer;
  let sql: PgSqlClient;

  beforeAll(async () => {
    directory = await mkdtemp(join(tmpdir(), "vxv-pg-"));
    database = await PGlite.create();
    server = new PGLiteSocketServer({ db: database, path: join(directory, ".s.PGSQL.5432") });
    await server.start();
    sql = createPgSqlClient(`postgresql://postgres@localhost/postgres?host=${encodeURIComponent(directory)}`, 1);
    await sql.query("create table notes (text text not null)");
  });

  afterAll(async () => {
    await sql.end();
    await server.stop();
    await database.close();
    await rm(directory, { recursive: true, force: true });
  });

  beforeEach(async () => {
    await sql.query("delete from notes");
  });

  const texts = async () =>
    (await sql.query<{ text: string }>("select text from notes order by text")).map((row) => row.text);

  it("runs parameterized queries", async () => {
    await sql.query("insert into notes values ($1), ($2)", ["a", "b"]);
    expect(await texts()).toEqual(["a", "b"]);
  });

  it("commits a transaction and returns its result", async () => {
    const result = await sql.transaction(async (transaction) => {
      await transaction.query("insert into notes values ($1)", ["a"]);
      return "done";
    });
    expect(result).toBe("done");
    expect(await texts()).toEqual(["a"]);
  });

  it("rolls the whole transaction back on error", async () => {
    const failing = sql.transaction(async (transaction) => {
      await transaction.query("insert into notes values ($1)", ["a"]);
      throw new Error("boom");
    });
    await expect(failing).rejects.toThrow("boom");
    expect(await texts()).toEqual([]);
  });

  it("joins the outer transaction when nested", async () => {
    const failing = sql.transaction(async (transaction) => {
      await transaction.transaction((inner) => inner.query("insert into notes values ($1)", ["a"]));
      throw new Error("boom");
    });
    await expect(failing).rejects.toThrow("boom");
    expect(await texts()).toEqual([]);
  });
});
