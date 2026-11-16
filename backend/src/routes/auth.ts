import { Router, type Request, type Response } from 'express'
import { MAX_PASSWORD_LENGTH, getDummyHash, hashPassword, validatePassword, verifyPassword } from '../auth/password.js'
import { endSession, startSession } from '../auth/sessions.js'
import {
  asObject,
  isUniqueViolation,
  parseDisplayName,
  parseEmail,
  MAX_DISPLAY_NAME_LENGTH,
} from '../auth/validation.js'
import { db } from '../db/index.js'

export const authRouter = Router()

const PUBLIC_USER_COLUMNS = ['id', 'email', 'display_name', 'role', 'created_at'] as const

// Create an account and log in
authRouter.post('/signup', async (req: Request, res: Response) => {
  const body = asObject(req.body)

  const email = parseEmail(body.email)
  if (email === null) {
    res.status(400).json({ error: 'A valid email is required' })
    return
  }

  const displayName = parseDisplayName(body.display_name)
  if (displayName === null) {
    res.status(400).json({ error: `Display name is required (1-${MAX_DISPLAY_NAME_LENGTH} characters)` })
    return
  }

  const passwordError = validatePassword(body.password)
  if (passwordError !== null) {
    res.status(400).json({ error: passwordError })
    return
  }

  const passwordHash = await hashPassword(body.password as string)

  try {
    // role is never taken from the request, so nobody can sign themselves up as staff
    const user = await db
      .insertInto('users')
      .values({
        email,
        display_name: displayName,
        password_hash: passwordHash,
        google_sub: null,
        role: 'student',
      })
      .returning(PUBLIC_USER_COLUMNS)
      .executeTakeFirstOrThrow()

    await startSession(res, user.id)
    res.status(201).json(user)
  } catch (err) {
    if (isUniqueViolation(err)) {
      res.status(409).json({ error: 'An account with that email already exists' })
      return
    }
    throw err
  }
})

// Log in with email + password
authRouter.post('/login', async (req: Request, res: Response) => {
  const body = asObject(req.body)
  const email = parseEmail(body.email)
  const password = body.password

  // Same message for every failure so the API does not reveal which emails are registered
  const invalid = () => res.status(401).json({ error: 'Invalid email or password' })

  if (email === null || typeof password !== 'string' || password.length === 0 || password.length > MAX_PASSWORD_LENGTH) {
    invalid()
    return
  }

  const user = await db
    .selectFrom('users')
    .select([...PUBLIC_USER_COLUMNS, 'password_hash'])
    .where('email', '=', email)
    .executeTakeFirst()

  // Unknown email, or a Google-only account with no password: still do a hash so timing matches
  const storedHash = user?.password_hash ?? (await getDummyHash())
  const passwordOk = await verifyPassword(password, storedHash)

  if (!user || user.password_hash === null || !passwordOk) {
    invalid()
    return
  }

  await startSession(res, user.id)

  const { password_hash: _omit, ...publicUser } = user
  res.json(publicUser)
})

// Log out (safe to call even when not logged in)
authRouter.post('/logout', async (req: Request, res: Response) => {
  await endSession(req, res)
  res.status(204).send()
})
