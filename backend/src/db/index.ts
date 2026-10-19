import { Kysely, PostgresDialect } from 'kysely'
import pg from 'pg'
import type { Database } from './types.js'

// One shared connection pool for the whole backend.
// DATABASE_URL comes from the .env file.
export const db = new Kysely<Database>({
  dialect: new PostgresDialect({
    pool: new pg.Pool({ connectionString: process.env.DATABASE_URL }),
  }),
})