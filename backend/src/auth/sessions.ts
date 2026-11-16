import { createHash, randomBytes } from 'node:crypto'
import type { Request, Response } from 'express'
import { db } from '../db/index.js'
import type { PublicUser } from '../db/types.js'

export const SESSION_COOKIE = 'sid'
const SESSION_DAYS = 7
const SESSION_MS = SESSION_DAYS * 24 * 60 * 60 * 1000

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

// Tiny cookie parser so we do not need the cookie-parser package.
export function parseCookies(header: string | undefined): Record<string, string> {
  const cookies: Record<string, string> = {}
  if (!header) return cookies

  for (const part of header.split(';')) {
    const index = part.indexOf('=')
    if (index === -1) continue
    const name = part.slice(0, index).trim()
    const value = part.slice(index + 1).trim()
    if (name === '' || name in cookies) continue
    try {
      cookies[name] = decodeURIComponent(value)
    } catch {
      // Malformed percent-encoding: ignore this cookie instead of crashing
    }
  }
  return cookies
}

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  }
}

// Creates a session row and sets the cookie. Always makes a brand new token (no session fixation).
export async function startSession(res: Response, userId: number): Promise<void> {
  const token = randomBytes(32).toString('base64url')
  const expiresAt = new Date(Date.now() + SESSION_MS)

  await db
    .insertInto('sessions')
    .values({ id: hashToken(token), user_id: userId, expires_at: expiresAt })
    .execute()

  res.cookie(SESSION_COOKIE, token, { ...cookieOptions(), maxAge: SESSION_MS })
}

export function getSessionToken(req: Request): string | null {
  const token = parseCookies(req.header('cookie'))[SESSION_COOKIE]
  return token !== undefined && token !== '' ? token : null
}

// Looks up the user for the request's session cookie. Returns null if there is no valid session.
export async function getSessionUser(
  req: Request,
): Promise<{ user: PublicUser; sessionId: string } | null> {
  const token = getSessionToken(req)
  if (token === null) return null

  const sessionId = hashToken(token)
  const user = await db
    .selectFrom('sessions')
    .innerJoin('users', 'users.id', 'sessions.user_id')
    .select([
      'users.id',
      'users.email',
      'users.display_name',
      'users.role',
      'users.created_at',
    ])
    .where('sessions.id', '=', sessionId)
    .where('sessions.expires_at', '>', new Date())
    .executeTakeFirst()

  return user ? { user, sessionId } : null
}

export async function endSession(req: Request, res: Response): Promise<void> {
  const token = getSessionToken(req)
  if (token !== null) {
    await db.deleteFrom('sessions').where('id', '=', hashToken(token)).execute()
  }
  res.clearCookie(SESSION_COOKIE, cookieOptions())
}

// Logs the user out everywhere except (optionally) the session they are using right now.
export async function endOtherSessions(userId: number, keepSessionId: string): Promise<void> {
  await db
    .deleteFrom('sessions')
    .where('user_id', '=', userId)
    .where('id', '!=', keepSessionId)
    .execute()
}
