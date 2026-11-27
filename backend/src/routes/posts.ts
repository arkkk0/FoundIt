import { Router, type Request, type Response } from 'express'
import { asObject } from '../auth/validation.js'
import { requireUser } from '../middleware/requireUser.js'
import type { NewPost, PostUpdate } from '../db/types.js'
import { createPost, getPosts, getPostById, updatePost, deletePost } from '../db/posts.js'

export const postsRouter = Router()
const editableFields = [
  'category_id', 'drop_off_point_id', 'type', 'title', 'description',
  'image_key', 'latitude', 'longitude', 'location_label', 'event_date',
  'verification_question', 'status', 'returned_at',
] as const satisfies readonly (keyof PostUpdate)[]

function postFields(value: unknown): PostUpdate {
  const body = asObject(value)
  return Object.fromEntries(
    editableFields
      .filter((field) => Object.hasOwn(body, field))
      .map((field) => [field, body[field]]),
  )
}

async function ownedPost(req: Request, res: Response) {
  const id = Number(req.params.id)
  if (!Number.isInteger(id) || id <= 0 || id > 2147483647) {
    res.status(400).json({ error: 'Invalid post id' })
    return
  }

  const post = await getPostById(id)
  if (!post) {
    res.status(404).json({ error: 'Post not found' })
    return
  }

  if (post.author_id !== res.locals.userId) {
    res.status(403).json({ error: 'Only the owner can change this post' })
    return
  }

  return post
}

function handleError(res: Response, err: unknown) {
  const code = (err as { code?: string }).code
  // 23502 = missing required field, 23503 = bad foreign key, 23514 = failed a check rule
  if (code === '23502' || code === '23503' || code === '23514') {
    res.status(400).json({ error: (err as Error).message })
    return
  }
  console.error(err)
  res.status(500).json({ error: 'Something went wrong' })
}

postsRouter.post('/', requireUser, async (req, res) => {
  try {
    const post = await createPost({...postFields(req.body), author_id: res.locals.userId,} as NewPost)
    res.status(201).json(post)
  } catch (err) {
    handleError(res, err)
  }
})

postsRouter.get('/', async (_req, res) => {
  try {
    res.json(await getPosts())
  } catch (err) {
    handleError(res, err)
  }
})

postsRouter.get('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id)
    const post = await getPostById(id)
    if (!post) {
      res.status(404).json({ error: 'Post not found' })
      return
    }
    res.json(post)
  } catch (err) {
    handleError(res, err)
  }
})

postsRouter.put('/:id', requireUser, async (req, res) => {
  try {
    const existing = await ownedPost(req, res)
    if (!existing) return

    const post = await updatePost(existing.id, existing.author_id, postFields(req.body))
    if (!post) {
      res.status(404).json({ error: 'Post not found' })
      return
    }

    res.json(post)
  } catch (err) {
    handleError(res, err)
  }
})

postsRouter.delete('/:id', requireUser, async (req, res) => {
  try {
    const existing = await ownedPost(req, res)
    if (!existing) return

    const result = await deletePost(existing.id, existing.author_id)
    if (result.numDeletedRows === 0n) {
      res.status(404).json({ error: 'Post not found' })
      return
    }

    res.status(204).end()
  } catch (err) {
    handleError(res, err)
  }
})