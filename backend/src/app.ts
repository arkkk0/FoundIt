import express, { type NextFunction, type Request, type Response } from 'express'
import { authRouter } from './routes/auth.js'
import { commentsRouter } from './routes/comments.js'
import { postsRouter } from './routes/posts.js'
import { uploadsRouter } from './routes/uploads.js'
import { usersRouter } from './routes/users.js'

export const app = express()

app.use(express.json())

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok' })
})

app.use('/auth', authRouter)
app.use('/users', usersRouter)
app.use(commentsRouter)
app.use(uploadsRouter)
app.use('/posts', postsRouter)

// Unknown routes
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Not found' })
})

// Errors
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  // Malformed JSON in the request body
  if (err instanceof SyntaxError && 'status' in err && err.status === 400) {
    res.status(400).json({ error: 'Invalid JSON body' })
    return
  }
  console.error(err)
  res.status(500).json({ error: 'Internal server error' })
})
