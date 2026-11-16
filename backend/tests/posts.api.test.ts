import request from 'supertest'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { app } from '../src/app.js'
import { db } from '../src/db/index.js'

// Needs the Postgres from .env with migrations applied ("npm run migrate").

let authorId: number
let categoryId: number

// A valid "lost" post body. Pass overrides to change any field.
function lostPost(overrides: Record<string, unknown> = {}) {
  return {
    author_id: authorId,
    category_id: categoryId,
    type: 'lost',
    title: 'Black AirPods',
    description: 'Left on the 2nd floor of Atkins',
    latitude: 35.3058,
    longitude: -80.7323,
    event_date: '2026-11-10',
    ...overrides,
  }
}

beforeEach(async () => {
  // Only touch rows that belong to test users, so a shared dev database keeps everyone's real data
  const testUsers = db.selectFrom('users').select('id').where('email', 'like', '%@test.com')
  await db.deleteFrom('comments').where('author_id', 'in', testUsers).execute()
  await db.deleteFrom('posts').where('author_id', 'in', testUsers).execute()
  await db.deleteFrom('sessions').where('user_id', 'in', testUsers).execute()
  await db.deleteFrom('users').where('email', 'like', '%@test.com').execute()

  const signup = await request(app)
    .post('/auth/signup')
    .send({ email: 'poster@test.com', display_name: 'Poster', password: 'password123' })
  authorId = signup.body.id

  const category = await db.selectFrom('categories').select('id').orderBy('id').executeTakeFirstOrThrow()
  categoryId = category.id
})
afterAll(async () => {
  await db.destroy()
})

describe('POST /posts', () => {
  it('creates a lost post and returns it with 201', async () => {
    const res = await request(app).post('/posts').send(lostPost())
    expect(res.status).toBe(201)
    expect(res.body.id).toBeTypeOf('number')
    expect(res.body.title).toBe('Black AirPods')
    expect(res.body.author_id).toBe(authorId)
    expect(res.body.status).toBe('open')
  })

  it('rejects a found post without a photo and verification question with 400', async () => {
    const res = await request(app).post('/posts').send(lostPost({ type: 'found' }))
    expect(res.status).toBe(400)
  })

  it('creates a found post when it has a photo and verification question', async () => {
    const res = await request(app)
      .post('/posts')
      .send(lostPost({ type: 'found', image_key: 'posts/keys.jpg', verification_question: 'What color is the keychain?' }))
    expect(res.status).toBe(201)
    expect(res.body.type).toBe('found')
  })

  it('rejects a post with no title with 400', async () => {
    const { title, ...noTitle } = lostPost()
    const res = await request(app).post('/posts').send(noTitle)
    expect(res.status).toBe(400)
  })

  it('rejects a category that does not exist with 400', async () => {
    const res = await request(app).post('/posts').send(lostPost({ category_id: 999999 }))
    expect(res.status).toBe(400)
  })
})

describe('GET /posts', () => {
  it('lists posts newest first', async () => {
    const first = await request(app).post('/posts').send(lostPost({ title: 'Older post' }))
    const second = await request(app).post('/posts').send(lostPost({ title: 'Newer post' }))

    const res = await request(app).get('/posts')
    expect(res.status).toBe(200)
    const ids = res.body.map((p: { id: number }) => p.id)
    expect(ids.indexOf(second.body.id)).toBeLessThan(ids.indexOf(first.body.id))
  })
})

describe('GET /posts/:id', () => {
  it('returns one post', async () => {
    const created = await request(app).post('/posts').send(lostPost())
    const res = await request(app).get(`/posts/${created.body.id}`)
    expect(res.status).toBe(200)
    expect(res.body.title).toBe('Black AirPods')
  })

  it('returns 404 for a post that does not exist', async () => {
    const res = await request(app).get('/posts/999999')
    expect(res.status).toBe(404)
  })
})

describe('PUT /posts/:id', () => {
  it('updates a post', async () => {
    const created = await request(app).post('/posts').send(lostPost())
    const res = await request(app).put(`/posts/${created.body.id}`).send({ title: 'Black AirPods case' })
    expect(res.status).toBe(200)
    expect(res.body.title).toBe('Black AirPods case')
  })

  it('returns 404 for a post that does not exist', async () => {
    const res = await request(app).put('/posts/999999').send({ title: 'Nope' })
    expect(res.status).toBe(404)
  })
})

describe('DELETE /posts/:id', () => {
  it('deletes a post, and it is gone afterwards', async () => {
    const created = await request(app).post('/posts').send(lostPost())
    const del = await request(app).delete(`/posts/${created.body.id}`)
    expect(del.status).toBe(204)

    const after = await request(app).get(`/posts/${created.body.id}`)
    expect(after.status).toBe(404)
  })

  it('returns 404 for a post that does not exist', async () => {
    const res = await request(app).delete('/posts/999999')
    expect(res.status).toBe(404)
  })
})
