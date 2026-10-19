import { type Kysely, sql } from 'kysely'

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable('users')
    .addColumn('id', 'serial', (c) => c.primaryKey())
    .addColumn('google_sub', 'text', (c) => c.notNull().unique())
    .addColumn('email', 'text', (c) => c.notNull().unique())
    .addColumn('display_name', 'text', (c) => c.notNull())
    .addColumn('role', 'text', (c) => c.notNull().defaultTo('student'))
    .addColumn('created_at', 'timestamptz', (c) => c.notNull().defaultTo(sql`now()`))
    .addCheckConstraint('users_role_check', sql`role in ('student', 'staff')`)
    .execute()

  await db.schema
    .createTable('categories')
    .addColumn('id', 'serial', (c) => c.primaryKey())
    .addColumn('name', 'text', (c) => c.notNull().unique())
    .execute()

  await db.schema
    .createTable('drop_off_points')
    .addColumn('id', 'serial', (c) => c.primaryKey())
    .addColumn('name', 'text', (c) => c.notNull().unique())
    .addColumn('building', 'text', (c) => c.notNull())
    .addColumn('latitude', 'double precision', (c) => c.notNull())
    .addColumn('longitude', 'double precision', (c) => c.notNull())
    .execute()

  await db.schema
    .createTable('posts')
    .addColumn('id', 'serial', (c) => c.primaryKey())
    .addColumn('author_id', 'integer', (c) =>
      c.notNull().references('users.id').onDelete('restrict'),
    )
    .addColumn('category_id', 'integer', (c) =>
      c.notNull().references('categories.id').onDelete('restrict'),
    )
    .addColumn('drop_off_point_id', 'integer', (c) =>
      c.references('drop_off_points.id').onDelete('set null'),
    )
    .addColumn('type', 'text', (c) => c.notNull())
    .addColumn('title', 'text', (c) => c.notNull())
    .addColumn('description', 'text', (c) => c.notNull())
    .addColumn('image_key', 'text')
    .addColumn('latitude', 'double precision', (c) => c.notNull())
    .addColumn('longitude', 'double precision', (c) => c.notNull())
    .addColumn('location_label', 'text')
    .addColumn('event_date', 'timestamptz', (c) => c.notNull())
    .addColumn('verification_question', 'text')
    .addColumn('status', 'text', (c) => c.notNull().defaultTo('open'))
    .addColumn('returned_at', 'timestamptz')
    .addColumn('created_at', 'timestamptz', (c) => c.notNull().defaultTo(sql`now()`))
    .addColumn('updated_at', 'timestamptz', (c) => c.notNull().defaultTo(sql`now()`))
    .addCheckConstraint('posts_type_check', sql`type in ('lost', 'found')`)
    .addCheckConstraint('posts_status_check', sql`status in ('open', 'returned')`)
    .addCheckConstraint('posts_latitude_check', sql`latitude between -90 and 90`)
    .addCheckConstraint('posts_longitude_check', sql`longitude between -180 and 180`)
    .addCheckConstraint(
      'posts_type_fields_check',
      sql`(type = 'found' and image_key is not null and verification_question is not null)
        or (type = 'lost' and verification_question is null and drop_off_point_id is null)`,
    )
    .addCheckConstraint(
      'posts_returned_at_check',
      sql`(status = 'returned') = (returned_at is not null)`,
    )
    .execute()

  await db.schema
    .createTable('comments')
    .addColumn('id', 'serial', (c) => c.primaryKey())
    .addColumn('post_id', 'integer', (c) =>
      c.notNull().references('posts.id').onDelete('cascade'),
    )
    .addColumn('author_id', 'integer', (c) =>
      c.notNull().references('users.id').onDelete('restrict'),
    )
    .addColumn('body', 'text', (c) => c.notNull())
    .addColumn('created_at', 'timestamptz', (c) => c.notNull().defaultTo(sql`now()`))
    .addColumn('updated_at', 'timestamptz', (c) => c.notNull().defaultTo(sql`now()`))
    .execute()

  await db.schema
    .createTable('claims')
    .addColumn('id', 'serial', (c) => c.primaryKey())
    .addColumn('found_post_id', 'integer', (c) =>
      c.notNull().references('posts.id').onDelete('cascade'),
    )
    .addColumn('claimant_id', 'integer', (c) =>
      c.notNull().references('users.id').onDelete('restrict'),
    )
    .addColumn('lost_post_id', 'integer', (c) =>
      c.references('posts.id').onDelete('set null'),
    )
    .addColumn('reviewed_by_id', 'integer', (c) =>
      c.references('users.id').onDelete('restrict'),
    )
    .addColumn('answer_text', 'text', (c) => c.notNull())
    .addColumn('status', 'text', (c) => c.notNull().defaultTo('pending'))
    .addColumn('created_at', 'timestamptz', (c) => c.notNull().defaultTo(sql`now()`))
    .addColumn('reviewed_at', 'timestamptz')
    .addCheckConstraint(
      'claims_status_check',
      sql`status in ('pending', 'approved', 'rejected')`,
    )
    .addCheckConstraint(
      'claims_review_fields_check',
      sql`(status = 'pending' and reviewed_by_id is null and reviewed_at is null)
        or (status <> 'pending' and reviewed_by_id is not null and reviewed_at is not null)`,
    )
    .addUniqueConstraint('claims_one_per_user_per_post', ['found_post_id', 'claimant_id'])
    .execute()

  // At most one approved claim per found post
  await sql`create unique index claims_one_approved_per_post
    on claims (found_post_id) where status = 'approved'`.execute(db)

  await db.schema
    .createTable('match_suggestions')
    .addColumn('id', 'serial', (c) => c.primaryKey())
    .addColumn('lost_post_id', 'integer', (c) =>
      c.notNull().references('posts.id').onDelete('cascade'),
    )
    .addColumn('found_post_id', 'integer', (c) =>
      c.notNull().references('posts.id').onDelete('cascade'),
    )
    .addColumn('score', 'double precision', (c) => c.notNull())
    .addColumn('status', 'text', (c) => c.notNull().defaultTo('suggested'))
    .addColumn('notified_at', 'timestamptz')
    .addColumn('created_at', 'timestamptz', (c) => c.notNull().defaultTo(sql`now()`))
    .addCheckConstraint('match_score_check', sql`score between 0 and 1`)
    .addCheckConstraint(
      'match_status_check',
      sql`status in ('suggested', 'dismissed')`,
    )
    .addUniqueConstraint('match_pair_unique', ['lost_post_id', 'found_post_id'])
    .execute()
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable('match_suggestions').ifExists().execute()
  await db.schema.dropTable('claims').ifExists().execute()
  await db.schema.dropTable('comments').ifExists().execute()
  await db.schema.dropTable('posts').ifExists().execute()
  await db.schema.dropTable('drop_off_points').ifExists().execute()
  await db.schema.dropTable('categories').ifExists().execute()
  await db.schema.dropTable('users').ifExists().execute()
}
