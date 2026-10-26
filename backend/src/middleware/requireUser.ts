import type { NextFunction, Request, Response } from 'express'
import { db } from '../db/index.js'

// Temporary stand-in for Google login: identifies the user from an x-user-id header.
export async function requireUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  const raw = req.header('x-user-id')
  const id = Number(raw)

  if (raw === undefined || !Number.isInteger(id) || id <= 0 || id > 2147483647) {
    res.status(401).json({ error: 'Missing or invalid x-user-id header' })
    return
  }

  const user = await db.selectFrom('users').select('id').where('id', '=', id).executeTakeFirst()
  if (!user) {
    res.status(401).json({ error: 'Unknown user' })
    return
  }

  res.locals.userId = id
  next()
}
