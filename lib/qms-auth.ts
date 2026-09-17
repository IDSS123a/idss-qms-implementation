import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { roleForEmail, type QmsRole } from '@/lib/rbac'
import { sql } from 'drizzle-orm'

export type QmsContext = {
  requestId: string
  user: { id: string; email: string; name?: string | null }
  role: QmsRole
  workspaceId?: string
}

export async function getQmsContext(request: Request): Promise<QmsContext | null> {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session?.user) return null
  const requestId = request.headers.get('x-request-id') || crypto.randomUUID()
  const userId = String(session.user.id)
  const membership = await db.execute(sql`select workspace_id, role from qms_membership where user_id = ${userId} order by created_at asc limit 1`)
  const storedRole = String(membership.rows[0]?.role ?? roleForEmail(session.user.email))
  const role = (['superadmin', 'admin', 'user'].includes(storedRole) ? storedRole : 'user') as QmsRole
  console.info('[qms]', JSON.stringify({ requestId, userId, workspaceId: membership.rows[0]?.workspace_id ?? null, action: 'authorized' }))
  return { requestId, user: session.user, role, workspaceId: membership.rows[0]?.workspace_id as string | undefined }
}

export function requestIdResponseHeaders(requestId: string) {
  return { 'x-request-id': requestId }
}
