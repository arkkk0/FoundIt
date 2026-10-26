import { Router, type Request, type Response } from 'express'
import { db } from '../db/index.js'
import { requireUser } from '../middleware/requireUser.js'

export const commentsRouter = Router()

const MAX_BODY_LENGTH = 2000
const MAX_INT = 2147483647

// Returns a positive integer id, or null if the value is not a valid id.
function parseId(value: unknown): number | null {
  if (typeof value !== 'string' || !/^\d+$/.test(value)) return null
  const id = Number(value)
  return Number.isSafeInteger(id) && id > 0 && id <= MAX_INT ? id : null
}

// Returns the trimmed comment text, or null if it is missing, empty or too long.
function parseCommentBody(value: unknown): string | null {
  if (typeof value !== 'object' || value === null) return null
  const body = (value as { body?: unknown }).body
  if (typeof body !== 'string') return null
  const trimmed = body.trim()
  if (trimmed.length === 0 || trimmed.length > MAX_BODY_LENGTH) return null
  return trimmed
}

// List a post's comments
commentsRouter.get('/posts/:postId/comments', async (req: Request, res: Response) => {
  const postId = parseId(req.params.postId)
  if (postId === null) {
    res.status(400).json({ error: 'Invalid post id' })
    return
  }

  const post = await db.selectFrom('posts').select('id').where('id', '=', postId).executeTakeFirst()
  if (!post) {
    res.status(404).json({ error: 'Post not found' })
    return
  }

  const comments = await db
    .selectFrom('comments')
    .selectAll()
    .where('post_id', '=', postId)
    .orderBy('created_at', 'asc')
    .orderBy('id', 'asc')
    .execute()

  res.json(comments)
})

// Add a comment to a post
commentsRouter.post('/posts/:postId/comments', requireUser, async (req: Request, res: Response) => {
  const postId = parseId(req.params.postId)
  if (postId === null) {
    res.status(400).json({ error: 'Invalid post id' })
    return
  }

  const body = parseCommentBody(req.body)
  if (body === null) {
    res.status(400).json({ error: `Comment body is required (1-${MAX_BODY_LENGTH} characters)` })
    return
  }

  const post = await db.selectFrom('posts').select('id').where('id', '=', postId).executeTakeFirst()
  if (!post) {
    res.status(404).json({ error: 'Post not found' })
    return
  }

  const userId: number = res.locals.userId
  const comment = await db
    .insertInto('comments')
    .values({ post_id: postId, author_id: userId, body })
    .returningAll()
    .executeTakeFirstOrThrow()

  res.status(201).json(comment)
})

// Edit your own comment
commentsRouter.put('/comments/:id', requireUser, async (req: Request, res: Response) => {
  const id = parseId(req.params.id)
  if (id === null) {
    res.status(400).json({ error: 'Invalid comment id' })
    return
  }

  const body = parseCommentBody(req.body)
  if (body === null) {
    res.status(400).json({ error: `Comment body is required (1-${MAX_BODY_LENGTH} characters)` })
    return
  }

  const existing = await db
    .selectFrom('comments')
    .select(['id', 'author_id'])
    .where('id', '=', id)
    .executeTakeFirst()
  if (!existing) {
    res.status(404).json({ error: 'Comment not found' })
    return
  }

  const userId: number = res.locals.userId
  if (existing.author_id !== userId) {
    res.status(403).json({ error: 'You can only edit your own comments' })
    return
  }

  const updated = await db
    .updateTable('comments')
    .set({ body, updated_at: new Date() })
    .where('id', '=', id)
    .returningAll()
    .executeTakeFirst()
  if (!updated) {
    res.status(404).json({ error: 'Comment not found' })
    return
  }

  res.json(updated)
})

// Delete your own comment
commentsRouter.delete('/comments/:id', requireUser, async (req: Request, res: Response) => {
  const id = parseId(req.params.id)
  if (id === null) {
    res.status(400).json({ error: 'Invalid comment id' })
    return
  }

  const existing = await db
    .selectFrom('comments')
    .select(['id', 'author_id'])
    .where('id', '=', id)
    .executeTakeFirst()
  if (!existing) {
    res.status(404).json({ error: 'Comment not found' })
    return
  }

  const userId: number = res.locals.userId
  if (existing.author_id !== userId) {
    res.status(403).json({ error: 'You can only delete your own comments' })
    return
  }

  await db.deleteFrom('comments').where('id', '=', id).execute()
  res.status(204).send()
})
