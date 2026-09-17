import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { db } from '@/lib/db'

const originList = [
  'http://localhost:3000',
  process.env.V0_RUNTIME_URL,
  process.env.V0_DEV_APP_URL,
  process.env.V0_BUILD_URL,
  process.env.V0_SANDBOX_URL,
  process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined,
  process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : undefined,
  'https://idss-qms-implementation.vercel.app',
  'https://idss.ba',
].filter((value): value is string => Boolean(value))

const baseURL = process.env.BETTER_AUTH_URL
  ?? (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : undefined)
  ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined)
  ?? process.env.V0_RUNTIME_URL
  ?? 'http://localhost:3000'

const isProductionBuild = process.env.NEXT_PHASE === 'phase-production-build'
const authSecret = process.env.BETTER_AUTH_SECRET ?? (isProductionBuild ? 'qms-build-only-secret-not-used-at-runtime' : undefined)

if (!authSecret && process.env.NODE_ENV === 'production') {
  throw new Error('BETTER_AUTH_SECRET must be configured for production runtime.')
}

export const auth = betterAuth({
  baseURL,
  secret: authSecret,
  database: drizzleAdapter(db, { provider: 'pg' }),
  emailAndPassword: { enabled: true },
  trustedOrigins: originList,
  ...(process.env.NODE_ENV === 'development' ? { advanced: { defaultCookieAttributes: { sameSite: 'none' as const, secure: true } } } : {}),
})
