import { NextResponse } from 'next/server'
import { sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { auth } from '@/lib/auth'
import { can, roleForEmail, type QmsRole } from '@/lib/rbac'

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
  if (!context.workspaceId) return NextResponse.json({ risks: [] })
  const result = await db.execute(sql`select id, reference, title, process, description, owner_id, likelihood, impact, controls, residual_likelihood, residual_impact, status, created_at, updated_at from qms_risk where workspace_id = ${context.workspaceId}::uuid order by (likelihood * impact) desc, created_at desc`)
  return NextResponse.json({ risks: result.rows })
}

export async function POST(request: Request) {
  const context = await getContext(request)
  if (!context) return NextResponse.json({ error: 'Prijava je obavezna.' }, { status: 401 })
  if (!context.workspaceId || !can(context.role, 'create')) return NextResponse.json({ error: 'Nemate dozvolu za kreiranje rizika.' }, { status: 403 })
  const body = await request.json().catch(() => ({})) as Record<string, unknown>
  const reference = typeof body.reference === 'string' ? body.reference.trim().slice(0, 40) : ''
  const title = typeof body.title === 'string' ? body.title.trim().slice(0, 240) : ''
  const description = typeof body.description === 'string' ? body.description.trim().slice(0, 5000) : ''
  const likelihood = Number(body.likelihood)
  const impact = Number(body.impact)
  if (!reference || title.length < 3 || description.length < 10 || !Number.isInteger(likelihood) || likelihood < 1 || likelihood > 5 || !Number.isInteger(impact) || impact < 1 || impact > 5) return NextResponse.json({ error: 'Referenca, naziv, opis i ocjene 1–5 su obavezni.' }, { status: 422 })
  const created = await db.execute(sql`insert into qms_risk (workspace_id, reference, title, description, process, likelihood, impact, controls, created_by) values (${context.workspaceId}::uuid, ${reference}, ${title}, ${description}, ${typeof body.process === 'string' ? body.process.slice(0, 160) : null}, ${likelihood}, ${impact}, ${typeof body.controls === 'string' ? body.controls.slice(0, 5000) : null}, ${context.user.id}::uuid) returning id, reference, title, likelihood, impact, status, created_at`)
  await db.execute(sql`insert into qms_audit_event (workspace_id, user_id, action, entity_type, entity_id, metadata) values (${context.workspaceId}::uuid, ${context.user.id}::uuid, 'create', 'risk', ${created.rows[0].id}::uuid, ${JSON.stringify({ reference, likelihood, impact })}::jsonb)`)
  return NextResponse.json({ risk: created.rows[0] }, { status: 201 })
}
