import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto'

// Passwords are hashed with scrypt (built into Node, so no extra dependency).
// Stored format: scrypt$<salt hex>$<hash hex>
const KEY_LENGTH = 64
export const MIN_PASSWORD_LENGTH = 8
// scrypt is deliberately slow, so cap the length to stop huge inputs from tying up the server
export const MAX_PASSWORD_LENGTH = 128

function derive(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, KEY_LENGTH, (err, key) => (err ? reject(err) : resolve(key)))
  })
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16)
  const key = await derive(password, salt)
  return `scrypt$${salt.toString('hex')}$${key.toString('hex')}`
}

// Returns false (never throws) for a wrong password or a malformed stored hash.
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split('$')
  if (parts.length !== 3 || parts[0] !== 'scrypt') return false

  const [, saltHex, hashHex] = parts
  if (!saltHex || !hashHex) return false

  const expected = Buffer.from(hashHex, 'hex')
  if (expected.length !== KEY_LENGTH) return false

  const actual = await derive(password, Buffer.from(saltHex, 'hex'))
  return timingSafeEqual(actual, expected)
}

// Returns an error message if the password is not acceptable, or null if it is fine.
export function validatePassword(value: unknown): string | null {
  if (typeof value !== 'string') return 'Password is required'
  if (value.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters`
  }
  if (value.length > MAX_PASSWORD_LENGTH) {
    return `Password must be at most ${MAX_PASSWORD_LENGTH} characters`
  }
  return null
}

// Hash of a throwaway password. Login checks against this when the email is unknown so that
// "no such user" takes as long as "wrong password" and does not reveal which emails exist.
let dummyHash: Promise<string> | undefined
export function getDummyHash(): Promise<string> {
  dummyHash ??= hashPassword(randomBytes(16).toString('hex'))
  return dummyHash
}
