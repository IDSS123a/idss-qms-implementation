import { NextResponse } from 'next/server'
import { sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { getQmsContext } from '@/lib/qms-auth'
import { qmsError } from '@/lib/qms-http'

export async function GET(request: Request) {
  const context = await getQmsContext(request)
  if (!context) return qmsError('Prijava je obavezna.', 401, request.headers.get('x-request-id') || crypto.randomUUID())
  if (!context.workspaceId) return NextResponse.json({ notifications: [] })
  const notifications = await db.execute(sql`select id, kind, title, body, task_id, read_at, created_at from qms_notification where workspace_id = ${context.workspaceId}::uuid and user_id = ${context.user.id}::uuid order by created_at desc limit 50`)
  return NextResponse.json({ notifications: notifications.rows })
}

export async function PATCH(request: Request) {
  const context = await getQmsContext(request)
  if (!context) return qmsError('Prijava je obavezna.', 401, request.headers.get('x-request-id') || crypto.randomUUID())
  const body = await request.json().catch(() => ({})) as { id?: unknown }
  const id = typeof body.id === 'string' ? body.id : ''
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: 'Neispravna notifikacija.' }, { status: 422 })
  const result = await db.execute(sql`update qms_notification set read_at = coalesce(read_at, now()) where id = ${id}::uuid and workspace_id = ${context.workspaceId}::uuid and user_id = ${context.user.id}::uuid returning id, read_at`)
  if (!result.rows[0]) return NextResponse.json({ error: 'Notifikacija nije pronađena.' }, { status: 404 })
  return NextResponse.json({ notification: result.rows[0] })
}
