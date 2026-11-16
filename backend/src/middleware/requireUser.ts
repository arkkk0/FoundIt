import type { NextFunction, Request, Response } from 'express'
import { getSessionUser } from '../auth/sessions.js'

// Requires a valid login session (the "sid" cookie set by /auth/login or /auth/signup).
// On success: res.locals.userId is the logged-in user's id, res.locals.sessionId the session's id.
export async function requireUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  const session = await getSessionUser(req)
  if (!session) {
    res.status(401).json({ error: 'You must be logged in' })
    return
  }

  res.locals.userId = session.user.id
  res.locals.sessionId = session.sessionId
  next()
}
