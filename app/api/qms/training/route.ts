import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'
import { roleForEmail, can, type QmsRole } from '@/lib/rbac'

async function context(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session?.user) return null
  const workspace = await db.execute(sql`select id from qms_workspace order by created_at asc limit 1`)
  const stored = await db.execute(sql`select role from qms_user_role where user_id = ${session.user.id}::uuid limit 1`)
  const candidate = String(stored.rows[0]?.role ?? roleForEmail(session.user.email))
  const role = (['superadmin', 'admin', 'user'].includes(candidate) ? candidate : 'user') as QmsRole
  return { user: session.user, role, workspaceId: workspace.rows[0]?.id as string | undefined }
}

export async function GET(request: Request) {
  const current = await context(request)
  if (!current) return NextResponse.json({ error: 'Prijava je obavezna.' }, { status: 401 })
  if (!current.workspaceId) return NextResponse.json({ trainings: [] })
  const trainings = await db.execute(sql`select id, reference, title, process, description, owner_id, due_date, completed_at, evidence, status, created_at, updated_at from qms_training where workspace_id = ${current.workspaceId}::uuid order by due_date asc nulls last, created_at desc`)
  return NextResponse.json({ trainings: trainings.rows })
}

export async function POST(request: Request) {
  const current = await context(request)
  if (!current) return NextResponse.json({ error: 'Prijava je obavezna.' }, { status: 401 })
  if (!current.workspaceId || !can(current.role, 'edit')) return NextResponse.json({ error: 'Nemate dozvolu za kreiranje obuke.' }, { status: 403 })
  const body = await request.json().catch(() => ({})) as Record<string, unknown>
  const reference = typeof body.reference === 'string' ? body.reference.trim().slice(0, 60) : ''
  const title = typeof body.title === 'string' ? body.title.trim().slice(0, 240) : ''
  const description = typeof body.description === 'string' ? body.description.trim().slice(0, 2000) : ''
  const process = typeof body.process === 'string' ? body.process.trim().slice(0, 160) : null
  const dueDate = typeof body.dueDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.dueDate) ? body.dueDate : null
  if (reference.length < 2 || title.length < 3 || description.length < 3) return NextResponse.json({ error: 'Referenca, naziv i opis obuke su obavezni.' }, { status: 422 })
  const created = await db.execute(sql`insert into qms_training (workspace_id, reference, title, process, description, due_date, created_by) values (${current.workspaceId}::uuid, ${reference}, ${title}, ${process}, ${description}, ${dueDate ? `${dueDate}::date` : null}, ${current.user.id}::uuid) returning id, reference, title, process, description, due_date, status, created_at, updated_at`)
  await db.execute(sql`insert into qms_audit_event (workspace_id, user_id, action, entity_type, entity_id, metadata) values (${current.workspaceId}::uuid, ${current.user.id}::uuid, 'create', 'training', ${created.rows[0].id}::uuid, ${JSON.stringify({ reference })}::jsonb)`)
  return NextResponse.json({ training: created.rows[0] }, { status: 201 })
}
