const MAX_EMAIL_LENGTH = 254
export const MAX_DISPLAY_NAME_LENGTH = 100

// Simple shape check: something@something.tld with no spaces. Real proof is a verification email.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Returns the trimmed, lowercased email, or null if it is missing or not a valid email.
export function parseEmail(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const email = value.trim().toLowerCase()
  if (email.length === 0 || email.length > MAX_EMAIL_LENGTH) return null
  return EMAIL_PATTERN.test(email) ? email : null
}

// Returns the trimmed display name, or null if it is missing, blank or too long.
export function parseDisplayName(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const name = value.trim()
  if (name.length === 0 || name.length > MAX_DISPLAY_NAME_LENGTH) return null
  return name
}

// Request bodies can be anything (null, an array, a string). Only accept a plain object.
export function asObject(value: unknown): Record<string, unknown> {
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }
  return {}
}

function pgCode(err: unknown): string | null {
  if (typeof err === 'object' && err !== null && 'code' in err) {
    const code = (err as { code: unknown }).code
    return typeof code === 'string' ? code : null
  }
  return null
}

// 23505 = unique constraint (for example, email already registered)
export function isUniqueViolation(err: unknown): boolean {
  return pgCode(err) === '23505'
}

// 23503 = foreign key constraint (for example, row is still referenced elsewhere)
export function isForeignKeyViolation(err: unknown): boolean {
  return pgCode(err) === '23503'
}
