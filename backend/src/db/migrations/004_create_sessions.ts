import { type Kysely, sql } from 'kysely'

// Server-side sessions. "id" is the SHA-256 hash of the cookie token, never the token itself,
// so a leaked database does not hand out working logins.
export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable('sessions')
    .addColumn('id', 'text', (c) => c.primaryKey())
    .addColumn('user_id', 'integer', (c) =>
      c.notNull().references('users.id').onDelete('cascade'),
    )
    .addColumn('created_at', 'timestamptz', (c) => c.notNull().defaultTo(sql`now()`))
    .addColumn('expires_at', 'timestamptz', (c) => c.notNull())
    .execute()

  await db.schema.createIndex('sessions_user_id_idx').on('sessions').column('user_id').execute()
  await db.schema.createIndex('sessions_expires_at_idx').on('sessions').column('expires_at').execute()
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable('sessions').ifExists().execute()
}
