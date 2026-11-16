import { type Kysely, sql } from 'kysely'

// Adds password login. google_sub becomes optional so users can sign up with just email + password.
export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema.alterTable('users').addColumn('password_hash', 'text').execute()
  await db.schema.alterTable('users').alterColumn('google_sub', (c) => c.dropNotNull()).execute()

  // Every user must be able to log in somehow
  await db.schema
    .alterTable('users')
    .addCheckConstraint(
      'users_login_method_check',
      sql`password_hash is not null or google_sub is not null`,
    )
    .execute()
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.alterTable('users').dropConstraint('users_login_method_check').execute()

  // Password-only users have no google_sub, so give them a placeholder before restoring NOT NULL
  await sql`update users set google_sub = 'local:' || id where google_sub is null`.execute(db)
  await db.schema.alterTable('users').alterColumn('google_sub', (c) => c.setNotNull()).execute()
  await db.schema.alterTable('users').dropColumn('password_hash').execute()
}
