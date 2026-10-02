import pg from "pg";

/** The only database access the repositories need: queries and transactions. */
export interface SqlClient {
  query<Row>(text: string, params?: readonly unknown[]): Promise<Row[]>;
  /** Runs the work in one transaction. Called inside a transaction, it joins it. */
  transaction<T>(work: (client: SqlClient) => Promise<T>): Promise<T>;
}

export interface PgSqlClient extends SqlClient {
  end(): Promise<void>;
}

function queryWith(queryable: pg.Pool | pg.PoolClient) {
  return async <Row>(text: string, params: readonly unknown[] = []): Promise<Row[]> =>
    (await queryable.query(text, [...params])).rows as Row[];
}

/** SqlClient over a PostgreSQL connection pool (Supabase in production). */
export function createPgSqlClient(connectionString: string, maxConnections = 3): PgSqlClient {
  const pool = new pg.Pool({ connectionString, max: maxConnections });
  return {
    query: queryWith(pool),
    async transaction(work) {
      const connection = await pool.connect();
      const client: SqlClient = { query: queryWith(connection), transaction: (inner) => inner(client) };
      try {
        await connection.query("begin");
        const result = await work(client);
        await connection.query("commit");
        return result;
      } catch (error) {
        await connection.query("rollback");
        throw error;
      } finally {
        connection.release();
      }
    },
    end: () => pool.end(),
  };
}
