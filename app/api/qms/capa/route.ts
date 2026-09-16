import { NextResponse } from 'next/server'
import { sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { auth } from '@/lib/auth'
import { can, roleForEmail, type QmsRole } from '@/lib/rbac'

const statuses = ['open', 'investigating', 'action_required', 'effectiveness_check', 'closed'] as const
const classifications = ['minor', 'major', 'critical'] as const

async function getContext(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session?.user) return null
  const workspace = await db.execute(sql`select id from qms_workspace order by created_at asc limit 1`)
  const storedRole = await db.execute(sql`select role from qms_user_role where user_id = ${session.user.id}::uuid limit 1`)
  const candidate = String(storedRole.rows[0]?.role ?? roleForEmail(session.user.email))
  const role = (['superadmin', 'admin', 'user'].includes(candidate) ? candidate : 'user') as QmsRole
  return { user: session.user, workspaceId: workspace.rows[0]?.id as string | undefined, role }
}

export async function GET(request: Request) {
  const context = await getContext(request)
  if (!context) return NextResponse.json({ error: 'Prijava je obavezna.' }, { status: 401 })
  if (!context.workspaceId) return NextResponse.json({ capa: [] })
  const status = new URL(request.url).searchParams.get('status')
  if (status && !statuses.includes(status as typeof statuses[number])) return NextResponse.json({ error: 'Neispravan CAPA status.' }, { status: 422 })
  const result = status
    ? await db.execute(sql`select id, reference, title, source_type, description, classification, root_cause, corrective_action, preventive_action, owner_id, due_date, status, effectiveness_check, closed_at, created_at, updated_at from qms_capa where workspace_id = ${context.workspaceId}::uuid and status = ${status} order by due_date asc nulls last, created_at desc`)
    : await db.execute(sql`select id, reference, title, source_type, description, classification, root_cause, corrective_action, preventive_action, owner_id, due_date, status, effectiveness_check, closed_at, created_at, updated_at from qms_capa where workspace_id = ${context.workspaceId}::uuid order by due_date asc nulls last, created_at desc`)
  return NextResponse.json({ capa: result.rows })
}

export async function POST(request: Request) {
  const context = await getContext(request)
  if (!context) return NextResponse.json({ error: 'Prijava je obavezna.' }, { status: 401 })
  if (!context.workspaceId) return NextResponse.json({ error: 'QMS okruženje još nije kreirano.' }, { status: 409 })
  if (!can(context.role, 'create')) return NextResponse.json({ error: 'Nemate dozvolu za kreiranje CAPA mjere.' }, { status: 403 })
  const body = await request.json().catch(() => ({})) as Record<string, unknown>
  const reference = typeof body.reference === 'string' ? body.reference.trim().slice(0, 40) : ''
  const title = typeof body.title === 'string' ? body.title.trim().slice(0, 240) : ''
  const description = typeof body.description === 'string' ? body.description.trim().slice(0, 5000) : ''
  const classification = typeof body.classification === 'string' ? body.classification : 'minor'
  if (!reference || title.length < 3 || description.length < 10 || !classifications.includes(classification as typeof classifications[number])) return NextResponse.json({ error: 'Referenca, naziv, opis i validna klasifikacija su obavezni.' }, { status: 422 })
  const created = await db.execute(sql`insert into qms_capa (workspace_id, reference, title, description, classification, created_by) values (${context.workspaceId}::uuid, ${reference}, ${title}, ${description}, ${classification}, ${context.user.id}::uuid) returning id, reference, title, description, classification, status, created_at`)
  await db.execute(sql`insert into qms_audit_event (workspace_id, user_id, action, entity_type, entity_id, metadata) values (${context.workspaceId}::uuid, ${context.user.id}::uuid, 'create', 'capa', ${created.rows[0].id}::uuid, ${JSON.stringify({ reference, classification })}::jsonb)`)
  return NextResponse.json({ capa: created.rows[0] }, { status: 201 })
}

export async function PATCH(request: Request) {
  const context = await getContext(request)
  if (!context) return NextResponse.json({ error: 'Prijava je obavezna.' }, { status: 401 })
  if (!context.workspaceId || !can(context.role, 'edit')) return NextResponse.json({ error: 'Nemate dozvolu za izmjenu CAPA mjere.' }, { status: 403 })
  const body = await request.json().catch(() => ({})) as { id?: unknown; status?: unknown; rootCause?: unknown; correctiveAction?: unknown; preventiveAction?: unknown; effectivenessCheck?: unknown }
  const id = typeof body.id === 'string' ? body.id : ''
  const status = typeof body.status === 'string' ? body.status : ''
  if (!/^[0-9a-f-]{36}$/i.test(id) || !statuses.includes(status as typeof statuses[number])) return NextResponse.json({ error: 'Neispravan CAPA zapis ili status.' }, { status: 422 })
  const result = await db.execute(sql`update qms_capa set status = ${status}, root_cause = ${typeof body.rootCause === 'string' ? body.rootCause.slice(0, 5000) : null}, corrective_action = ${typeof body.correctiveAction === 'string' ? body.correctiveAction.slice(0, 5000) : null}, preventive_action = ${typeof body.preventiveAction === 'string' ? body.preventiveAction.slice(0, 5000) : null}, effectiveness_check = ${typeof body.effectivenessCheck === 'string' ? body.effectivenessCheck.slice(0, 5000) : null}, closed_at = case when ${status} = 'closed' then now() else null end, updated_at = now() where id = ${id}::uuid and workspace_id = ${context.workspaceId}::uuid returning id, reference, title, status, updated_at`)
  if (!result.rows[0]) return NextResponse.json({ error: 'CAPA zapis nije pronađen.' }, { status: 404 })
  await db.execute(sql`insert into qms_audit_event (workspace_id, user_id, action, entity_type, entity_id, metadata) values (${context.workspaceId}::uuid, ${context.user.id}::uuid, 'update', 'capa', ${id}::uuid, ${JSON.stringify({ status })}::jsonb)`)
  return NextResponse.json({ capa: result.rows[0] })
}
