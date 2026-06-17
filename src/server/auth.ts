import { createHmac, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'
import type { NextResponse } from 'next/server'
import type { AuthUser } from '../types/predictions'

const scrypt = promisify(scryptCallback)
const SESSION_COOKIE_NAME = 'wc_session'
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30
const USERNAME_REGEX = /^[a-z0-9._-]{3,24}$/
const PASSWORD_MIN_LENGTH = 6

const toBase64Url = (value: string) => Buffer.from(value, 'utf8').toString('base64url')
const fromBase64Url = (value: string) => Buffer.from(value, 'base64url').toString('utf8')

const getSessionSecret = () => process.env.SESSION_SECRET ?? 'dev-only-change-me'

const signPayload = (payload: string) => {
  return createHmac('sha256', getSessionSecret()).update(payload).digest('base64url')
}

export const normalizeUsernameInput = (value: string) => value.trim().toLowerCase()

export const isUsernameValid = (value: string) => USERNAME_REGEX.test(value)
export const isPasswordValid = (value: string) => value.length >= PASSWORD_MIN_LENGTH

export const hashPassword = async (password: string) => {
  const salt = randomBytes(16).toString('hex')
  const hash = (await scrypt(password, salt, 64)) as Buffer
  return `${salt}:${hash.toString('hex')}`
}

export const verifyPassword = async (password: string, passwordHash: string) => {
  const [salt, storedHash] = passwordHash.split(':')

  if (!salt || !storedHash) {
    return false
  }

  const hash = (await scrypt(password, salt, 64)) as Buffer
  const storedBuffer = Buffer.from(storedHash, 'hex')

  if (hash.length !== storedBuffer.length) {
    return false
  }

  return timingSafeEqual(hash, storedBuffer)
}

export const createSessionToken = (user: AuthUser) => {
  const payload = toBase64Url(
    JSON.stringify({
      userId: user.id,
      username: user.username,
      exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
    }),
  )
  const signature = signPayload(payload)

  return `${payload}.${signature}`
}

export const parseSessionToken = (token: string | undefined | null): AuthUser | null => {
  if (!token) {
    return null
  }

  const [payload, signature] = token.split('.')

  if (!payload || !signature) {
    return null
  }

  const expectedSignature = signPayload(payload)
  const expectedBuffer = Buffer.from(expectedSignature, 'utf8')
  const signatureBuffer = Buffer.from(signature, 'utf8')

  if (expectedBuffer.length !== signatureBuffer.length || !timingSafeEqual(expectedBuffer, signatureBuffer)) {
    return null
  }

  try {
    const decoded = JSON.parse(fromBase64Url(payload)) as { userId?: string; username?: string; exp?: number }

    if (typeof decoded.userId !== 'string' || typeof decoded.username !== 'string' || typeof decoded.exp !== 'number') {
      return null
    }

    if (decoded.exp <= Math.floor(Date.now() / 1000)) {
      return null
    }

    return {
      id: decoded.userId,
      username: decoded.username,
    }
  } catch {
    return null
  }
}

export const setAuthCookie = (response: NextResponse, user: AuthUser) => {
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: createSessionToken(user),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  })
}

export const clearAuthCookie = (response: NextResponse) => {
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  })
}

export const sessionCookieName = SESSION_COOKIE_NAME
