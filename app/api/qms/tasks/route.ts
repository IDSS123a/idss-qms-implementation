import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'
import { roleForEmail, can, type QmsRole } from '@/lib/rbac'
import { taskInputSchema, validationError } from '@/lib/validation/qms'

export const runtime = 'nodejs'

async function context(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session?.user) return null
  const workspace = await db.execute(sql`select id from qms_workspace order by created_at asc limit 1`)
  const storedRole = await db.execute(sql`select role from qms_user_role where user_id = ${session.user.id}::uuid limit 1`)
  const candidateRole = String(storedRole.rows[0]?.role ?? roleForEmail(session.user.email))
  const role = (['superadmin', 'admin', 'user'].includes(candidateRole) ? candidateRole : 'user') as QmsRole
  return { user: session.user, role, workspaceId: workspace.rows[0]?.id as string | undefined }
}

export async function GET(request: Request) {
  const current = await context(request)
  if (!current) return NextResponse.json({ error: 'Prijava je obavezna.' }, { status: 401 })
  if (!current.workspaceId) return NextResponse.json({ tasks: [] })
  const status = new URL(request.url).searchParams.get('status')
  const allowedStatuses = ['open', 'in_progress', 'blocked', 'completed', 'cancelled'] as const
  if (status && !allowedStatuses.includes(status as typeof allowedStatuses[number])) return NextResponse.json({ error: 'Neispravan status filter.' }, { status: 422 })
  const tasks = status
    ? await db.execute(sql`select id, title, description, owner_id, document_id, source_type, due_date, priority, status, completed_at, evidence_url, created_at, updated_at from qms_task where workspace_id = ${current.workspaceId}::uuid and status = ${status} order by due_date asc`)
    : await db.execute(sql`select id, title, description, owner_id, document_id, source_type, due_date, priority, status, completed_at, evidence_url, created_at, updated_at from qms_task where workspace_id = ${current.workspaceId}::uuid order by due_date asc`)
  return NextResponse.json({ tasks: tasks.rows })
}

export async function PATCH(request: Request) {
  const current = await context(request)
  if (!current) return NextResponse.json({ error: 'Prijava je obavezna.' }, { status: 401 })
  if (!current.workspaceId) return NextResponse.json({ error: 'QMS okruženje još nije kreirano.' }, { status: 409 })
  if (!can(current.role, 'edit')) return NextResponse.json({ error: 'Nemate dozvolu za izmjenu zadatka.' }, { status: 403 })
  const body = await request.json().catch(() => ({})) as { id?: unknown; status?: unknown }
  const id = typeof body.id === 'string' ? body.id : ''
  const status = typeof body.status === 'string' ? body.status : ''
  if (!/^[0-9a-f-]{36}$/i.test(id) || !['open', 'in_progress', 'blocked', 'completed', 'cancelled'].includes(status)) return NextResponse.json({ error: 'Neispravan zadatak ili status.' }, { status: 422 })
  const result = await db.execute(sql`update qms_task set status = ${status}, completed_at = case when ${status} = 'completed' then now() else null end, updated_at = now() where id = ${id}::uuid and workspace_id = ${current.workspaceId}::uuid returning id, title, due_date, priority, status, completed_at, updated_at`)
  if (!result.rows[0]) return NextResponse.json({ error: 'Zadatak nije pronađen.' }, { status: 404 })
  await db.execute(sql`insert into qms_audit_event (workspace_id, user_id, action, entity_type, entity_id, metadata) values (${current.workspaceId}::uuid, ${current.user.id}::uuid, 'update', 'task', ${id}::uuid, ${JSON.stringify({ status })}::jsonb)`)
  return NextResponse.json({ task: result.rows[0] })
}

export async function POST(request: Request) {
  const current = await context(request)
  if (!current) return NextResponse.json({ error: 'Prijava je obavezna.' }, { status: 401 })
  if (!current.workspaceId) return NextResponse.json({ error: 'QMS okruženje još nije kreirano.' }, { status: 409 })
  if (!can(current.role, 'create')) return NextResponse.json({ error: 'Nemate dozvolu za kreiranje zadatka.' }, { status: 403 })
  const parsed = taskInputSchema.safeParse(await request.json().catch(() => ({})))
  if (!parsed.success) return NextResponse.json({ error: validationError(parsed.error) }, { status: 422 })
  const task = parsed.data
  const result = await db.execute(sql`insert into qms_task (workspace_id, title, description, owner_id, document_id, due_date, priority, status, created_by) values (${current.workspaceId}::uuid, ${task.title}, ${task.description ?? null}, ${task.ownerId ? `${task.ownerId}` : null}::uuid, ${task.documentId ? `${task.documentId}` : null}::uuid, ${task.dueDate.toISOString()}::timestamptz, ${task.priority}, 'open', ${current.user.id}::uuid) returning id, title, due_date, priority, status, created_at`)
  await db.execute(sql`insert into qms_audit_event (workspace_id, user_id, action, entity_type, entity_id, metadata) values (${current.workspaceId}::uuid, ${current.user.id}::uuid, 'create', 'task', ${result.rows[0].id}::uuid, ${JSON.stringify({ dueDate: task.dueDate.toISOString(), priority: task.priority })}::jsonb)`)
  await db.execute(sql`insert into qms_notification (workspace_id, user_id, task_id, kind, title, body) values (${current.workspaceId}::uuid, ${task.ownerId ?? current.user.id}::uuid, ${result.rows[0].id}::uuid, 'task_created', 'Novi QMS zadatak', ${`Zadatak „${task.title}“ ima rok ${task.dueDate.toLocaleDateString('bs-BA')}.`})`)
  return NextResponse.json({ task: result.rows[0] }, { status: 201 })
}
