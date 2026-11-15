import request from 'supertest'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { app } from '../src/app.js'
import { db } from '../src/db/index.js'

// Needs the Postgres from .env with migrations applied ("npm run migrate").
const PASSWORD = 'password123'

async function signup(email = 'a@test.com') {
  const res = await request(app)
    .post('/auth/signup')
    .send({ email, display_name: 'Alice', password: PASSWORD })
  const cookie = (res.headers['set-cookie'] as unknown as string[] | undefined)?.[0]?.split(';')[0]
  return { res, cookie: cookie ?? '' }
}

// A minimal "lost" post (found posts need an image and verification question)
async function createLostPost(authorId: number, categoryId: number) {
  return db
    .insertInto('posts')
    .values({
      author_id: authorId,
      category_id: categoryId,
      drop_off_point_id: null,
      type: 'lost',
      title: 't',
      description: 'd',
      image_key: null,
      latitude: 35,
      longitude: -80,
      location_label: null,
      event_date: new Date(),
      verification_question: null,
      status: 'open',
      returned_at: null,
    })
    .returning('id')
    .executeTakeFirstOrThrow()
}

beforeEach(async () => {
  // Only touch rows that belong to test users, so a shared dev database keeps everyone's real data
  const testUsers = db.selectFrom('users').select('id').where('email', 'like', '%@test.com')
  await db.deleteFrom('comments').where('author_id', 'in', testUsers).execute()
  await db.deleteFrom('posts').where('author_id', 'in', testUsers).execute()
  await db.deleteFrom('sessions').where('user_id', 'in', testUsers).execute()
  await db.deleteFrom('users').where('email', 'like', '%@test.com').execute()
})
afterAll(async () => {
  await db.destroy()
})

describe('signup', () => {
  it('creates a user, sets an httpOnly cookie and never leaks the hash', async () => {
    const { res } = await signup()
    expect(res.status).toBe(201)
    expect(res.body.password_hash).toBeUndefined()
    expect(res.body.role).toBe('student')
    expect(String(res.headers['set-cookie'])).toMatch(/HttpOnly/i)
  })

  it('ignores a role sent by the client', async () => {
    const res = await request(app)
      .post('/auth/signup')
      .send({ email: 'r@test.com', display_name: 'R', password: PASSWORD, role: 'staff' })
    expect(res.body.role).toBe('student')
  })

  it('rejects duplicate emails (any casing) with 409', async () => {
    await signup('dup@test.com')
    const res = await request(app)
      .post('/auth/signup')
      .send({ email: 'DUP@test.com', display_name: 'B', password: PASSWORD })
    expect(res.status).toBe(409)
  })

  it('rejects bad input with 400, including a non-object body', async () => {
    for (const body of [
      {},
      { email: 'bad', display_name: 'A', password: PASSWORD },
      { email: 'x@test.com', display_name: '  ', password: PASSWORD },
      { email: 'x@test.com', display_name: 'A', password: 'short' },
      { email: 'x@test.com', display_name: 'A', password: 12345678 },
    ]) {
      expect((await request(app).post('/auth/signup').send(body)).status).toBe(400)
    }
    expect((await request(app).post('/auth/signup').send('[1]').type('json')).status).toBe(400)
  })
})

describe('login / logout / sessions', () => {
  it('logs in, then /users/me works; logout invalidates the session', async () => {
    await signup()
    const login = await request(app).post('/auth/login').send({ email: ' A@test.com ', password: PASSWORD })
    expect(login.status).toBe(200)
    const cookie = String((login.headers['set-cookie'] as unknown as string[])[0]).split(';')[0] ?? ''

    expect((await request(app).get('/users/me').set('Cookie', cookie)).status).toBe(200)
    expect((await request(app).post('/auth/logout').set('Cookie', cookie)).status).toBe(204)
    expect((await request(app).get('/users/me').set('Cookie', cookie)).status).toBe(401)
  })

  it('gives the same 401 for wrong password and unknown email', async () => {
    await signup()
    const wrong = await request(app).post('/auth/login').send({ email: 'a@test.com', password: 'nope-nope' })
    const unknown = await request(app).post('/auth/login').send({ email: 'zz@test.com', password: PASSWORD })
    expect(wrong.status).toBe(401)
    expect(unknown.status).toBe(401)
    expect(wrong.body).toEqual(unknown.body)
  })

  it('rejects password login for a Google-only account', async () => {
    await db.insertInto('users').values({ email: 'g@test.com', display_name: 'G', google_sub: 'sub-1', password_hash: null, role: 'student' }).execute()
    const res = await request(app).post('/auth/login').send({ email: 'g@test.com', password: PASSWORD })
    expect(res.status).toBe(401)
  })

  it('rejects missing, garbage and expired sessions, and the old x-user-id header', async () => {
    const { cookie } = await signup()
    expect((await request(app).get('/users/me')).status).toBe(401)
    expect((await request(app).get('/users/me').set('Cookie', 'sid=garbage')).status).toBe(401)
    expect((await request(app).get('/users/me').set('x-user-id', '1')).status).toBe(401)

    await db.updateTable('sessions').set({ expires_at: new Date(Date.now() - 1000) }).execute()
    expect((await request(app).get('/users/me').set('Cookie', cookie)).status).toBe(401)
  })

  it('logout without a session is still 204', async () => {
    expect((await request(app).post('/auth/logout')).status).toBe(204)
  })
})

describe('own-account routes', () => {
  it('updates display name and email; duplicate email is 409; empty update is 400', async () => {
    const { cookie } = await signup()
    await signup('b@test.com')

    const ok = await request(app).put('/users/me').set('Cookie', cookie).send({ display_name: 'New', email: 'NEW@test.com' })
    expect(ok.status).toBe(200)
    expect(ok.body).toMatchObject({ display_name: 'New', email: 'new@test.com' })

    expect((await request(app).put('/users/me').set('Cookie', cookie).send({ email: 'b@test.com' })).status).toBe(409)
    expect((await request(app).put('/users/me').set('Cookie', cookie).send({})).status).toBe(400)
    expect((await request(app).put('/users/me').set('Cookie', cookie).send({ role: 'staff' })).status).toBe(400)
  })

  it('password change needs the current password and logs out other sessions', async () => {
    const { cookie } = await signup()
    const other = await request(app).post('/auth/login').send({ email: 'a@test.com', password: PASSWORD })
    const otherCookie = String((other.headers['set-cookie'] as unknown as string[])[0]).split(';')[0] ?? ''

    expect((await request(app).put('/users/me').set('Cookie', cookie).send({ new_password: 'brandnew123' })).status).toBe(403)
    expect((await request(app).put('/users/me').set('Cookie', cookie).send({ new_password: 'brandnew123', current_password: 'wrong' })).status).toBe(403)
    expect((await request(app).put('/users/me').set('Cookie', cookie).send({ new_password: 'short', current_password: PASSWORD })).status).toBe(400)

    const ok = await request(app).put('/users/me').set('Cookie', cookie).send({ new_password: 'brandnew123', current_password: PASSWORD })
    expect(ok.status).toBe(200)
    expect((await request(app).get('/users/me').set('Cookie', cookie)).status).toBe(200)
    expect((await request(app).get('/users/me').set('Cookie', otherCookie)).status).toBe(401)
    expect((await request(app).post('/auth/login').send({ email: 'a@test.com', password: 'brandnew123' })).status).toBe(200)
    expect((await request(app).post('/auth/login').send({ email: 'a@test.com', password: PASSWORD })).status).toBe(401)
  })

  it('deleting the account removes the user, their posts/comments and the session', async () => {
    const { res, cookie } = await signup()
    const category = await db.selectFrom('categories').select('id').executeTakeFirstOrThrow()
    const post = await createLostPost(Number(res.body.id), category.id)
    await request(app).post(`/posts/${post.id}/comments`).set('Cookie', cookie).send({ body: 'hi' })

    expect((await request(app).delete('/users/me').set('Cookie', cookie)).status).toBe(204)
    expect(await db.selectFrom('users').where('id', '=', Number(res.body.id)).executeTakeFirst()).toBeUndefined()
    expect(await db.selectFrom('posts').where('id', '=', post.id).executeTakeFirst()).toBeUndefined()
    expect((await request(app).get('/users/me').set('Cookie', cookie)).status).toBe(401)
  })

  it('comments still work through the new session middleware (and 401 without it)', async () => {
    const { res, cookie } = await signup()
    const category = await db.selectFrom('categories').select('id').executeTakeFirstOrThrow()
    const post = await createLostPost(Number(res.body.id), category.id)
    expect((await request(app).post(`/posts/${post.id}/comments`).send({ body: 'x' })).status).toBe(401)
    expect((await request(app).post(`/posts/${post.id}/comments`).set('Cookie', cookie).send({ body: 'x' })).status).toBe(201)
  })
})
