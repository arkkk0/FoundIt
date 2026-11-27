import request from 'supertest'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { app } from '../src/app.js'
import { db } from '../src/db/index.js'

// Needs the Postgres from .env with migrations applied ("npm run migrate").

// Signs up a test user and returns their id and login cookie
async function signup(email: string) {
  const res = await request(app)
    .post('/auth/signup')
    .send({ email, display_name: email.split('@')[0], password: 'password123' })
  const cookie = (res.headers['set-cookie'] as unknown as string[] | undefined)?.[0]?.split(';')[0] ?? ''
  return { id: res.body.id as number, cookie }
}

let alice: { id: number; cookie: string }
let bob: { id: number; cookie: string }
let postId: number

beforeEach(async () => {
  // Only touch rows that belong to test users, so a shared dev database keeps everyone's real data
  const testUsers = db.selectFrom('users').select('id').where('email', 'like', '%@test.com')
  await db.deleteFrom('comments').where('author_id', 'in', testUsers).execute()
  await db.deleteFrom('posts').where('author_id', 'in', testUsers).execute()
  await db.deleteFrom('sessions').where('user_id', 'in', testUsers).execute()
  await db.deleteFrom('users').where('email', 'like', '%@test.com').execute()

  alice = await signup('alice@test.com')
  bob = await signup('bob@test.com')

  const category = await db.selectFrom('categories').select('id').orderBy('id').executeTakeFirstOrThrow()
  const post = await request(app).post('/posts').set('Cookie', alice.cookie).send({
    category_id: category.id,
    type: 'lost',
    title: 'Blue water bottle',
    description: 'Left in Colvard',
    latitude: 35.3,
    longitude: -80.73,
    event_date: '2026-11-10',
  })
  expect(post.status).toBe(201)
  postId = post.body.id
})
afterAll(async () => {
  await db.destroy()
})

// Adds a comment as the given user
function addComment(user: { cookie: string }, body: string) {
  return request(app).post(`/posts/${postId}/comments`).set('Cookie', user.cookie).send({ body })
}

describe('GET /posts/:postId/comments', () => {
  it('lists a post\'s comments in the order they were written', async () => {
    await addComment(alice, 'First')
    await addComment(bob, 'Second')

    const res = await request(app).get(`/posts/${postId}/comments`)
    expect(res.status).toBe(200)
    expect(res.body.map((c: { body: string }) => c.body)).toEqual(['First', 'Second'])
  })

  it('returns 404 for a post that does not exist', async () => {
    const res = await request(app).get('/posts/999999/comments')
    expect(res.status).toBe(404)
  })

  it('returns 400 for an invalid post id', async () => {
    const res = await request(app).get('/posts/abc/comments')
    expect(res.status).toBe(400)
  })
})

describe('POST /posts/:postId/comments', () => {
  it('requires a login', async () => {
    const res = await request(app).post(`/posts/${postId}/comments`).send({ body: 'Hi' })
    expect(res.status).toBe(401)
  })

  it('adds a comment as the logged-in user', async () => {
    const res = await addComment(bob, '  I think these are mine  ')
    expect(res.status).toBe(201)
    expect(res.body.author_id).toBe(bob.id)
    expect(res.body.body).toBe('I think these are mine')
  })

  it('rejects an empty or too-long comment with 400', async () => {
    expect((await addComment(alice, '   ')).status).toBe(400)
    expect((await addComment(alice, 'x'.repeat(2001))).status).toBe(400)
  })

  it('returns 404 when the post does not exist', async () => {
    const res = await request(app).post('/posts/999999/comments').set('Cookie', alice.cookie).send({ body: 'Hi' })
    expect(res.status).toBe(404)
  })
})

describe('PUT /comments/:id', () => {
  it('lets the author edit their comment', async () => {
    const created = await addComment(alice, 'Original')
    const res = await request(app)
      .put(`/comments/${created.body.id}`)
      .set('Cookie', alice.cookie)
      .send({ body: 'Edited' })
    expect(res.status).toBe(200)
    expect(res.body.body).toBe('Edited')
  })

  it('stops other users from editing it with 403', async () => {
    const created = await addComment(alice, 'Original')
    const res = await request(app)
      .put(`/comments/${created.body.id}`)
      .set('Cookie', bob.cookie)
      .send({ body: 'Hacked' })
    expect(res.status).toBe(403)
  })

  it('returns 404 for a comment that does not exist', async () => {
    const res = await request(app).put('/comments/999999').set('Cookie', alice.cookie).send({ body: 'Hi' })
    expect(res.status).toBe(404)
  })
})

describe('DELETE /comments/:id', () => {
  it('stops other users from deleting it with 403', async () => {
    const created = await addComment(alice, 'Mine')
    const res = await request(app).delete(`/comments/${created.body.id}`).set('Cookie', bob.cookie)
    expect(res.status).toBe(403)
  })

  it('lets the author delete their comment', async () => {
    const created = await addComment(alice, 'Mine')
    const res = await request(app).delete(`/comments/${created.body.id}`).set('Cookie', alice.cookie)
    expect(res.status).toBe(204)

    const list = await request(app).get(`/posts/${postId}/comments`)
    expect(list.body).toEqual([])
  })
})
