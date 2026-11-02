import { db } from './index.js'
import type { NewPost, PostUpdate } from './types.js'

export async function createPost(post: NewPost) {
  return db
    .insertInto('posts')
    .values(post)
    .returningAll()
    .executeTakeFirstOrThrow()
}

export async function getPosts() {
  return db
    .selectFrom('posts')
    .selectAll()
    .orderBy('created_at', 'desc')
    .execute()
}

export async function getPostById(id: number) {
  return db
    .selectFrom('posts')
    .selectAll()
    .where('id', '=', id)
    .executeTakeFirst()
}

export async function updatePost(id: number, changes: PostUpdate) {
  return db
    .updateTable('posts')
    .set({
      ...changes,
      updated_at: new Date()
    })
    .where('id', '=', id)
    .returningAll()
    .executeTakeFirst()
}

export async function deletePost(id: number) {
  return db
    .deleteFrom('posts')
    .where('id', '=', id)
    .executeTakeFirst()
}