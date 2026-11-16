import { Router, type Request, type Response } from 'express'
import { hashPassword, validatePassword, verifyPassword } from '../auth/password.js'
import { endOtherSessions, endSession } from '../auth/sessions.js'
import {
  asObject,
  isForeignKeyViolation,
  isUniqueViolation,
  parseDisplayName,
  parseEmail,
  MAX_DISPLAY_NAME_LENGTH,
} from '../auth/validation.js'
import { db } from '../db/index.js'
import type { UsersTable } from '../db/types.js'
import type { Updateable } from 'kysely'
import { requireUser } from '../middleware/requireUser.js'

export const usersRouter = Router()

const PUBLIC_USER_COLUMNS = ['id', 'email', 'display_name', 'role', 'created_at'] as const

// Every route here is about the logged-in user, so there is no :id to tamper with
usersRouter.use(requireUser)

// Get your own account
usersRouter.get('/me', async (_req: Request, res: Response) => {
  const userId: number = res.locals.userId
  const user = await db
    .selectFrom('users')
    .select(PUBLIC_USER_COLUMNS)
    .where('id', '=', userId)
    .executeTakeFirst()

  if (!user) {
    res.status(404).json({ error: 'User not found' })
    return
  }
  res.json(user)
})

// Update your own account: display_name, email, and/or password (password needs current_password)
usersRouter.put('/me', async (req: Request, res: Response) => {
  const userId: number = res.locals.userId
  const sessionId: string = res.locals.sessionId
  const body = asObject(req.body)

  // role and google_sub are deliberately not editable here
  const changes: Updateable<UsersTable> = {}

  if ('display_name' in body) {
    const displayName = parseDisplayName(body.display_name)
    if (displayName === null) {
      res.status(400).json({ error: `Display name must be 1-${MAX_DISPLAY_NAME_LENGTH} characters` })
      return
    }
    changes.display_name = displayName
  }

  if ('email' in body) {
    const email = parseEmail(body.email)
    if (email === null) {
      res.status(400).json({ error: 'A valid email is required' })
      return
    }
    changes.email = email
  }

  const changingPassword = 'new_password' in body
  if (changingPassword) {
    const passwordError = validatePassword(body.new_password)
    if (passwordError !== null) {
      res.status(400).json({ error: passwordError })
      return
    }

    const current = await db
      .selectFrom('users')
      .select('password_hash')
      .where('id', '=', userId)
      .executeTakeFirst()

    // Google-only accounts have no password to confirm, so they can set one without it
    if (current?.password_hash) {
      const currentPassword = body.current_password
      const ok = typeof currentPassword === 'string' && (await verifyPassword(currentPassword, current.password_hash))
      if (!ok) {
        res.status(403).json({ error: 'Current password is incorrect' })
        return
      }
    }
    changes.password_hash = await hashPassword(body.new_password as string)
  }

  if (Object.keys(changes).length === 0) {
    res.status(400).json({ error: 'Nothing to update (send display_name, email or new_password)' })
    return
  }

  try {
    const updated = await db
      .updateTable('users')
      .set(changes)
      .where('id', '=', userId)
      .returning(PUBLIC_USER_COLUMNS)
      .executeTakeFirst()

    if (!updated) {
      res.status(404).json({ error: 'User not found' })
      return
    }

    // After a password change, log out every other device
    if (changingPassword) await endOtherSessions(userId, sessionId)

    res.json(updated)
  } catch (err) {
    if (isUniqueViolation(err)) {
      res.status(409).json({ error: 'An account with that email already exists' })
      return
    }
    throw err
  }
})

// Delete your own account (and your posts, comments and claims)
usersRouter.delete('/me', async (req: Request, res: Response) => {
  const userId: number = res.locals.userId

  try {
    await db.transaction().execute(async (trx) => {
      // Foreign keys from these tables to users are ON DELETE RESTRICT, so clear them first.
      // Deleting a post also cascades to its comments, claims and match suggestions.
      await trx.deleteFrom('claims').where('claimant_id', '=', userId).execute()
      await trx.deleteFrom('comments').where('author_id', '=', userId).execute()
      await trx.deleteFrom('posts').where('author_id', '=', userId).execute()
      // Sessions are removed automatically (ON DELETE CASCADE)
      await trx.deleteFrom('users').where('id', '=', userId).execute()
    })
  } catch (err) {
    // The user reviewed claims on other people's posts; those rows must keep a reviewer
    if (isForeignKeyViolation(err)) {
      res.status(409).json({ error: 'This account still has reviewed claims and cannot be deleted yet' })
      return
    }
    throw err
  }

  await endSession(req, res)
  res.status(204).send()
})
