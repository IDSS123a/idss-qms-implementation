import { NextResponse } from 'next/server'
import { sql } from 'drizzle-orm'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { roleForEmail, type QmsRole } from '@/lib/rbac'

async function getContext(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session?.user) return null
  const workspace = await db.execute(sql`select id from qms_workspace order by created_at asc limit 1`)
  const roleRow = await db.execute(sql`select role from qms_user_role where user_id = ${session.user.id}::uuid limit 1`)
  const candidate = String(roleRow.rows[0]?.role ?? roleForEmail(session.user.email))
  const role = (['superadmin', 'admin', 'user'].includes(candidate) ? candidate : 'user') as QmsRole
  return { user: session.user, role, workspaceId: workspace.rows[0]?.id as string | undefined }
}

export async function GET(request: Request) {
  const context = await getContext(request)
  if (!context) return NextResponse.json({ error: 'Prijava je obavezna.' }, { status: 401 })
  if (!context.workspaceId) return NextResponse.json({ notifications: [] })
  const notifications = await db.execute(sql`select id, kind, title, body, task_id, read_at, created_at from qms_notification where workspace_id = ${context.workspaceId}::uuid and user_id = ${context.user.id}::uuid order by created_at desc limit 50`)
  return NextResponse.json({ notifications: notifications.rows })
}

export async function PATCH(request: Request) {
  const context = await getContext(request)
  if (!context) return NextResponse.json({ error: 'Prijava je obavezna.' }, { status: 401 })
  const body = await request.json().catch(() => ({})) as { id?: unknown }
  const id = typeof body.id === 'string' ? body.id : ''
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: 'Neispravna notifikacija.' }, { status: 422 })
  const result = await db.execute(sql`update qms_notification set read_at = coalesce(read_at, now()) where id = ${id}::uuid and workspace_id = ${context.workspaceId}::uuid and user_id = ${context.user.id}::uuid returning id, read_at`)
  if (!result.rows[0]) return NextResponse.json({ error: 'Notifikacija nije pronađena.' }, { status: 404 })
  return NextResponse.json({ notification: result.rows[0] })
}
