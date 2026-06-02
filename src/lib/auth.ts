import bcrypt from 'bcryptjs'

const SALT_ROUNDS = 12

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

// Simple JWT-like session for MVP (using base64 for demo - in production use proper JWT)
export function createSessionToken(payload: { userId: string; role: string }): string {
  const data = JSON.stringify({ ...payload, exp: Date.now() + 24 * 60 * 60 * 1000 })
  return Buffer.from(data).toString('base64')
}

export function verifySessionToken(token: string): { userId: string; role: string } | null {
  try {
    const data = JSON.parse(Buffer.from(token, 'base64').toString())
    if (data.exp < Date.now()) return null
    return { userId: data.userId, role: data.role }
  } catch {
    return null
  }
}

export function hasPermission(role: string, requiredRoles: string[]): boolean {
  return requiredRoles.includes(role)
}
