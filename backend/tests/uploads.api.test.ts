import request from 'supertest'
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'

// Replace the real S3 calls so these tests never need AWS keys or the internet
vi.mock('../src/storage/s3.js', async (importOriginal) => {
  const real = await importOriginal<typeof import('../src/storage/s3.js')>()
  return {
    ...real,
    uploadImage: vi.fn(async () => 'posts/test-photo.png'),
    getImageUrl: vi.fn(async (key: string) => `https://s3.example.com/${key}?signed=1`),
  }
})

const { app } = await import('../src/app.js')
const { db } = await import('../src/db/index.js')
const s3 = await import('../src/storage/s3.js')

// Needs the Postgres from .env with migrations applied ("npm run migrate").

// The 8-byte header every PNG file starts with, plus some filler
const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(64)])

let cookie: string
let userId: number

async function createPost(imageKey: string | null) {
  const category = await db.selectFrom('categories').select('id').orderBy('id').executeTakeFirstOrThrow()
  return db
    .insertInto('posts')
    .values({
      author_id: userId,
      category_id: category.id,
      drop_off_point_id: null,
      type: imageKey ? 'found' : 'lost',
      title: 'Keys',
      description: 'Silver keys on a lanyard',
      image_key: imageKey,
      latitude: 35.3,
      longitude: -80.73,
      location_label: null,
      event_date: new Date(),
      verification_question: imageKey ? 'What color is the lanyard?' : null,
      status: 'open',
      returned_at: null,
    })
    .returning('id')
    .executeTakeFirstOrThrow()
}

beforeEach(async () => {
  vi.clearAllMocks()
  // Only touch rows that belong to test users, so a shared dev database keeps everyone's real data
  const testUsers = db.selectFrom('users').select('id').where('email', 'like', '%@test.com')
  await db.deleteFrom('comments').where('author_id', 'in', testUsers).execute()
  await db.deleteFrom('posts').where('author_id', 'in', testUsers).execute()
  await db.deleteFrom('sessions').where('user_id', 'in', testUsers).execute()
  await db.deleteFrom('users').where('email', 'like', '%@test.com').execute()

  const res = await request(app)
    .post('/auth/signup')
    .send({ email: 'uploader@test.com', display_name: 'Uploader', password: 'password123' })
  userId = res.body.id
  cookie = (res.headers['set-cookie'] as unknown as string[] | undefined)?.[0]?.split(';')[0] ?? ''
})
afterAll(async () => {
  await db.destroy()
})

describe('POST /uploads', () => {
  it('requires a login', async () => {
    const res = await request(app).post('/uploads').attach('photo', PNG, { filename: 'a.png', contentType: 'image/png' })
    expect(res.status).toBe(401)
    expect(s3.uploadImage).not.toHaveBeenCalled()
  })

  it('uploads a photo and returns its image key', async () => {
    const res = await request(app)
      .post('/uploads')
      .set('Cookie', cookie)
      .attach('photo', PNG, { filename: 'keys.png', contentType: 'image/png' })
    expect(res.status).toBe(201)
    expect(res.body.image_key).toBe('posts/test-photo.png')
    expect(s3.uploadImage).toHaveBeenCalledWith(expect.any(Buffer), 'image/png')
  })

  it('rejects a request with no photo', async () => {
    const res = await request(app).post('/uploads').set('Cookie', cookie)
    expect(res.status).toBe(400)
  })

  it('rejects files that are not images', async () => {
    const res = await request(app)
      .post('/uploads')
      .set('Cookie', cookie)
      .attach('photo', Buffer.from('hello'), { filename: 'notes.txt', contentType: 'text/plain' })
    expect(res.status).toBe(400)
    expect(s3.uploadImage).not.toHaveBeenCalled()
  })

  it('rejects photos over 5 MB', async () => {
    const res = await request(app)
      .post('/uploads')
      .set('Cookie', cookie)
      .attach('photo', Buffer.alloc(5 * 1024 * 1024 + 1), { filename: 'big.png', contentType: 'image/png' })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/5 MB/)
  })

  it('returns 502 when S3 fails', async () => {
    vi.mocked(s3.uploadImage).mockRejectedValueOnce(new Error('S3 is down'))
    const res = await request(app)
      .post('/uploads')
      .set('Cookie', cookie)
      .attach('photo', PNG, { filename: 'keys.png', contentType: 'image/png' })
    expect(res.status).toBe(502)
  })
})

describe('GET /posts/:id/image', () => {
  it('redirects to a signed link for the post photo', async () => {
    const post = await createPost('posts/keys.png')
    const res = await request(app).get(`/posts/${post.id}/image`)
    expect(res.status).toBe(302)
    expect(res.headers.location).toBe('https://s3.example.com/posts/keys.png?signed=1')
  })

  it('returns 404 when the post has no photo', async () => {
    const post = await createPost(null)
    const res = await request(app).get(`/posts/${post.id}/image`)
    expect(res.status).toBe(404)
  })

  it('returns 400 for an invalid post id', async () => {
    const res = await request(app).get('/posts/abc/image')
    expect(res.status).toBe(400)
  })
})
