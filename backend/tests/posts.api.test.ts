import request from 'supertest'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { app } from '../src/app.js'
import { db } from '../src/db/index.js'

// Needs the Postgres from .env with migrations applied ("npm run migrate").

let authorId: number
let categoryId: number
let ownerCookie: string

// A valid "lost" post body. Pass overrides to change any field.
function lostPost(overrides: Record<string, unknown> = {}) {
  return {
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
  expect(signup.status).toBe(201)
  const cookie = (signup.headers['set-cookie'] as string[] | undefined)?.[0]?.split(';')[0]
  if (!cookie) throw new Error('Signup did not set a session cookie')
  ownerCookie = cookie
  authorId = signup.body.id

  const category = await db.selectFrom('categories').select('id').orderBy('id').executeTakeFirstOrThrow()
  categoryId = category.id
})
afterAll(async () => {
  await db.destroy()
})

describe('POST /posts', () => {
  it('creates a lost post and returns it with 201', async () => {
    const res = await request(app).post('/posts').set('Cookie', ownerCookie).send(lostPost())
    expect(res.status).toBe(201)
    expect(res.body.id).toBeTypeOf('number')
    expect(res.body.title).toBe('Black AirPods')
    expect(res.body.author_id).toBe(authorId)
    expect(res.body.status).toBe('open')
  })

  it('rejects a found post without a photo and verification question with 400', async () => {
    const res = await request(app).post('/posts').set('Cookie', ownerCookie).send(lostPost({ type: 'found' }))
    expect(res.status).toBe(400)
  })

  it('creates a found post when it has a photo and verification question', async () => {
    const res = await request(app)
      .post('/posts').set('Cookie', ownerCookie)
      .send(lostPost({ type: 'found', image_key: 'posts/keys.jpg', verification_question: 'What color is the keychain?' }))
    expect(res.status).toBe(201)
    expect(res.body.type).toBe('found')
  })

  it('rejects a post with no title with 400', async () => {
    const { title, ...noTitle } = lostPost()
    const res = await request(app).post('/posts').set('Cookie', ownerCookie).send(noTitle)
    expect(res.status).toBe(400)
  })

  it('rejects a category that does not exist with 400', async () => {
    const res = await request(app).post('/posts').set('Cookie', ownerCookie).send(lostPost({ category_id: 999999 }))
    expect(res.status).toBe(400)
  })
})

describe('post permissions', () => {
  it('requires login for post writes', async () => {
    await request(app).post('/posts').send(lostPost()).expect(401)
    await request(app).put('/posts/1').send({ title: 'Changed' }).expect(401)
    await request(app).delete('/posts/1').expect(401)
  })

  it('uses the session author and protects ownership', async () => {
    const other = await request(app)
      .post('/auth/signup')
      .send({ email: 'other@test.com', display_name: 'Other', password: 'password123' })
      .expect(201)

    const otherCookie = (other.headers['set-cookie'] as string[] | undefined)?.[0]?.split(';')[0]
    if (!otherCookie) throw new Error('Signup did not set a session cookie')

    const created = await request(app)
      .post('/posts')
      .set('Cookie', ownerCookie)
      .send(lostPost({ author_id: other.body.id }))
      .expect(201)
    expect(created.body.author_id).toBe(authorId)

    const url = `/posts/${created.body.id}`
    await request(app).put(url).set('Cookie', otherCookie).send({ title: 'Changed' }).expect(403)
    await request(app).delete(url).set('Cookie', otherCookie).expect(403)

    const updated = await request(app)
      .put(url)
      .set('Cookie', ownerCookie)
      .send({ title: 'Updated', author_id: other.body.id })
      .expect(200)
    expect(updated.body.author_id).toBe(authorId)

    await request(app).delete(url).set('Cookie', ownerCookie).expect(204)
  })
})

describe('GET /posts', () => {
  it('lists posts newest first', async () => {
    const first = await request(app).post('/posts').set('Cookie', ownerCookie).send(lostPost({ title: 'Older post' }))
    const second = await request(app).post('/posts').set('Cookie', ownerCookie).send(lostPost({ title: 'Newer post' }))

    const res = await request(app).get('/posts')
    expect(res.status).toBe(200)
    const ids = res.body.map((p: { id: number }) => p.id)
    expect(ids.indexOf(second.body.id)).toBeLessThan(ids.indexOf(first.body.id))
  })
})

describe('GET /posts/:id', () => {
  it('returns one post', async () => {
    const created = await request(app).post('/posts').set('Cookie', ownerCookie).send(lostPost())
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
    const created = await request(app).post('/posts').set('Cookie', ownerCookie).send(lostPost())
    const res = await request(app).put(`/posts/${created.body.id}`).set('Cookie', ownerCookie).send({ title: 'Black AirPods case' })
    expect(res.status).toBe(200)
    expect(res.body.title).toBe('Black AirPods case')
  })

  it('returns 404 for a post that does not exist', async () => {
    const res = await request(app).put('/posts/999999').set('Cookie', ownerCookie).send({ title: 'Nope' })
    expect(res.status).toBe(404)
  })
})

describe('DELETE /posts/:id', () => {
  it('deletes a post, and it is gone afterwards', async () => {
    const created = await request(app).post('/posts').set('Cookie', ownerCookie).send(lostPost())
    const del = await request(app).delete(`/posts/${created.body.id}`).set('Cookie', ownerCookie)
    expect(del.status).toBe(204)

    const after = await request(app).get(`/posts/${created.body.id}`)
    expect(after.status).toBe(404)
  })

  it('returns 404 for a post that does not exist', async () => {
    const res = await request(app).delete('/posts/999999').set('Cookie', ownerCookie)
    expect(res.status).toBe(404)
  })
})