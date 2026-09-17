import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'
import { roleForEmail, can, type QmsRole } from '@/lib/rbac'

const statuses = ['planned', 'in_progress', 'completed', 'cancelled']
const classifications = ['critical', 'major', 'minor', 'observation']

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
  if (!current.workspaceId) return NextResponse.json({ audits: [] })
  const audits = await db.execute(sql`select id, reference, title, scope, criteria, process, auditor_id, planned_date, status, conclusion, created_at, updated_at from qms_audit_plan where workspace_id = ${current.workspaceId}::uuid order by planned_date asc nulls last, created_at desc`)
  return NextResponse.json({ audits: audits.rows })
}

export async function POST(request: Request) {
  const current = await context(request)
  if (!current) return NextResponse.json({ error: 'Prijava je obavezna.' }, { status: 401 })
  if (!current.workspaceId || !can(current.role, 'edit')) return NextResponse.json({ error: 'Nemate dozvolu za kreiranje audita.' }, { status: 403 })
  const body = await request.json().catch(() => ({})) as Record<string, unknown>
  const reference = typeof body.reference === 'string' ? body.reference.trim().slice(0, 60) : ''
  const title = typeof body.title === 'string' ? body.title.trim().slice(0, 240) : ''
  const scope = typeof body.scope === 'string' ? body.scope.trim().slice(0, 1000) : ''
  const criteria = typeof body.criteria === 'string' ? body.criteria.trim().slice(0, 1000) : ''
  const process = typeof body.process === 'string' ? body.process.trim().slice(0, 160) : null
  const plannedDate = typeof body.plannedDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.plannedDate) ? body.plannedDate : null
  if (reference.length < 2 || title.length < 3 || scope.length < 3 || criteria.length < 3) return NextResponse.json({ error: 'Referenca, naziv, obim i kriteriji su obavezni.' }, { status: 422 })
  const created = await db.execute(sql`insert into qms_audit_plan (workspace_id, reference, title, scope, criteria, process, planned_date, created_by) values (${current.workspaceId}::uuid, ${reference}, ${title}, ${scope}, ${criteria}, ${process}, ${plannedDate ? `${plannedDate}::date` : null}, ${current.user.id}::uuid) returning id, reference, title, scope, criteria, process, planned_date, status, created_at, updated_at`)
  await db.execute(sql`insert into qms_audit_event (workspace_id, user_id, action, entity_type, entity_id, metadata) values (${current.workspaceId}::uuid, ${current.user.id}::uuid, 'create', 'audit_plan', ${created.rows[0].id}::uuid, ${JSON.stringify({ reference })}::jsonb)`)
  return NextResponse.json({ audit: created.rows[0] }, { status: 201 })
}

export async function PATCH(request: Request) {
  const current = await context(request)
  if (!current) return NextResponse.json({ error: 'Prijava je obavezna.' }, { status: 401 })
  if (!current.workspaceId || !can(current.role, 'edit')) return NextResponse.json({ error: 'Nemate dozvolu za izmjenu audita.' }, { status: 403 })
  const body = await request.json().catch(() => ({})) as { id?: unknown; status?: unknown; conclusion?: unknown }
  const id = typeof body.id === 'string' ? body.id : ''
  const status = typeof body.status === 'string' ? body.status : ''
  const conclusion = typeof body.conclusion === 'string' ? body.conclusion.slice(0, 3000) : null
  if (!/^[0-9a-f-]{36}$/i.test(id) || !statuses.includes(status)) return NextResponse.json({ error: 'Neispravan audit ili status.' }, { status: 422 })
  const updated = await db.execute(sql`update qms_audit_plan set status = ${status}, conclusion = coalesce(${conclusion}, conclusion), updated_at = now() where id = ${id}::uuid and workspace_id = ${current.workspaceId}::uuid returning id, reference, title, status, conclusion, planned_date, updated_at`)
  if (!updated.rows[0]) return NextResponse.json({ error: 'Audit nije pronađen.' }, { status: 404 })
  await db.execute(sql`insert into qms_audit_event (workspace_id, user_id, action, entity_type, entity_id, metadata) values (${current.workspaceId}::uuid, ${current.user.id}::uuid, 'update', 'audit_plan', ${id}::uuid, ${JSON.stringify({ status })}::jsonb)`)
  return NextResponse.json({ audit: updated.rows[0] })
}

export { classifications }
