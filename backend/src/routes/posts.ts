import { Router, type Response } from 'express'
import {
  createPost,
  getPosts,
  getPostById,
  updatePost,
  deletePost
} from '../db/posts.js'

export const postsRouter = Router()

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

postsRouter.post('/', async (req, res) => {
  try {
    const post = await createPost(req.body)
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

postsRouter.put('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id)
    const post = await updatePost(id, req.body)
    if (!post) {
      res.status(404).json({ error: 'Post not found' })
      return
    }
    res.json(post)
  } catch (err) {
    handleError(res, err)
  }
})

postsRouter.delete('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id)
    const result = await deletePost(id)
    if (result.numDeletedRows === 0n) {
      res.status(404).json({ error: 'Post not found' })
      return
    }
    res.status(204).end()
  } catch (err) {
    handleError(res, err)
  }
})