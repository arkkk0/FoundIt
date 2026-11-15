import { describe, expect, it } from 'vitest'
import { hashPassword, validatePassword, verifyPassword } from '../src/auth/password.js'
import { parseCookies } from '../src/auth/sessions.js'
import { asObject, parseDisplayName, parseEmail } from '../src/auth/validation.js'

describe('passwords', () => {
  it('verifies the right password and rejects a wrong one', async () => {
    const hash = await hashPassword('correct horse')
    expect(await verifyPassword('correct horse', hash)).toBe(true)
    expect(await verifyPassword('wrong horse', hash)).toBe(false)
  })

  it('salts: same password gives different hashes', async () => {
    expect(await hashPassword('samepassword')).not.toBe(await hashPassword('samepassword'))
  })

  it('returns false for malformed stored hashes instead of throwing', async () => {
    expect(await verifyPassword('x', '')).toBe(false)
    expect(await verifyPassword('x', 'plaintext')).toBe(false)
    expect(await verifyPassword('x', 'scrypt$zz$zz')).toBe(false)
    expect(await verifyPassword('x', 'bcrypt$aa$bb')).toBe(false)
  })

  it('validates length bounds and type', () => {
    expect(validatePassword(undefined)).not.toBeNull()
    expect(validatePassword(12345678)).not.toBeNull()
    expect(validatePassword('short')).not.toBeNull()
    expect(validatePassword('a'.repeat(129))).not.toBeNull()
    expect(validatePassword('a'.repeat(8))).toBeNull()
    expect(validatePassword('a'.repeat(128))).toBeNull()
  })
})

describe('validation', () => {
  it('normalizes emails and rejects bad ones', () => {
    expect(parseEmail('  Me@Uncc.EDU ')).toBe('me@uncc.edu')
    expect(parseEmail('nope')).toBeNull()
    expect(parseEmail('a@b')).toBeNull()
    expect(parseEmail('a b@c.com')).toBeNull()
    expect(parseEmail('')).toBeNull()
    expect(parseEmail(null)).toBeNull()
    expect(parseEmail(42)).toBeNull()
    expect(parseEmail(`${'a'.repeat(250)}@b.com`)).toBeNull()
  })

  it('trims display names and rejects blank, long or non-string', () => {
    expect(parseDisplayName('  Mir ')).toBe('Mir')
    expect(parseDisplayName('   ')).toBeNull()
    expect(parseDisplayName('a'.repeat(101))).toBeNull()
    expect(parseDisplayName(['x'])).toBeNull()
  })

  it('asObject only accepts plain objects', () => {
    expect(asObject(null)).toEqual({})
    expect(asObject([1])).toEqual({})
    expect(asObject('str')).toEqual({})
    expect(asObject({ a: 1 })).toEqual({ a: 1 })
  })
})

describe('parseCookies', () => {
  it('parses multiple cookies and values containing =', () => {
    expect(parseCookies('a=1; sid=abc=def; b=2')).toEqual({ a: '1', sid: 'abc=def', b: '2' })
  })
  it('handles missing header, junk and bad encoding', () => {
    expect(parseCookies(undefined)).toEqual({})
    expect(parseCookies('novalue; =x')).toEqual({})
    expect(parseCookies('sid=%E0%A4%A')).toEqual({})
  })
  it('keeps the first value when a name repeats', () => {
    expect(parseCookies('sid=first; sid=second')).toEqual({ sid: 'first' })
  })
})
