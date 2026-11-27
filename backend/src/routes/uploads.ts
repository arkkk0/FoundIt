import { Router, type NextFunction, type Request, type Response } from 'express'
import multer from 'multer'
import { db } from '../db/index.js'
import { requireUser } from '../middleware/requireUser.js'
import { IMAGE_TYPES, getImageUrl, uploadImage } from '../storage/s3.js'

export const uploadsRouter = Router()

const MAX_BYTES = 5 * 1024 * 1024 // 5 MB

// Keeps the file in memory just long enough to send it to S3
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_BYTES, files: 1 },
})

// Runs multer and turns its errors (like a file that's too big) into a 400
function receivePhoto(req: Request, res: Response, next: NextFunction) {
  upload.single('photo')(req, res, (err: unknown) => {
    if (err) {
      const message = err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE'
        ? 'Photo must be 5 MB or smaller'
        : 'Could not read the photo'
      res.status(400).json({ error: message })
      return
    }
    next()
  })
}

// Upload a photo for a post. Send it as form data in a field named "photo".
uploadsRouter.post('/uploads', requireUser, receivePhoto, async (req: Request, res: Response) => {
  const file = req.file
  if (!file) {
    res.status(400).json({ error: 'Attach a photo in the "photo" field' })
    return
  }
  if (!(file.mimetype in IMAGE_TYPES)) {
    res.status(400).json({ error: 'Photo must be a JPEG, PNG, WebP, or GIF' })
    return
  }

  try {
    const imageKey = await uploadImage(file.buffer, file.mimetype)
    res.status(201).json({ image_key: imageKey })
  } catch (err) {
    console.error(err)
    res.status(502).json({ error: 'Could not save the photo' })
  }
})

// Show a post's photo: sends the browser to a short-lived link to the private S3 file
uploadsRouter.get('/posts/:id/image', async (req: Request, res: Response) => {
  const id = Number(req.params.id)
  if (!Number.isSafeInteger(id) || id <= 0) {
    res.status(400).json({ error: 'Invalid post id' })
    return
  }

  const post = await db.selectFrom('posts').select('image_key').where('id', '=', id).executeTakeFirst()
  if (!post?.image_key) {
    res.status(404).json({ error: 'This post has no photo' })
    return
  }

  try {
    res.redirect(302, await getImageUrl(post.image_key))
  } catch (err) {
    console.error(err)
    res.status(502).json({ error: 'Could not load the photo' })
  }
})
