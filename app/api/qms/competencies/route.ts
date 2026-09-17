import { NextResponse } from 'next/server'
import { sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { can } from '@/lib/rbac'
import { getQmsContext } from '@/lib/qms-auth'
import { qmsError } from '@/lib/qms-http'

export async function GET(request: Request) {
  const context = await getQmsContext(request)
  const requestId = context?.requestId ?? request.headers.get('x-request-id') ?? crypto.randomUUID()
  if (!context) return qmsError('Prijava je obavezna.', 401, requestId)
  const rows = await db.execute(sql`select * from qms_competency where workspace_id = ${context.workspaceId}::uuid order by role_name, process, competency`)
  return NextResponse.json({ competencies: rows.rows, requestId })
}

export async function POST(request: Request) {
  const context = await getQmsContext(request)
  const requestId = context?.requestId ?? request.headers.get('x-request-id') ?? crypto.randomUUID()
  if (!context) return qmsError('Prijava je obavezna.', 401, requestId)
  if (!context.workspaceId || !can(context.role, 'edit')) return qmsError('Nemate dozvolu.', 403, requestId)
  const body = await request.json().catch(() => ({})) as Record<string, unknown>
  const roleName = String(body.roleName ?? '').trim()
  const competency = String(body.competency ?? '').trim()
  if (!roleName || !competency) return qmsError('Uloga i kompetencija su obavezne.', 422, requestId)
  const result = await db.execute(sql`insert into qms_competency (workspace_id, role_name, process, competency, required_level, evidence, status, expires_at, owner_id, created_by) values (${context.workspaceId}::uuid, ${roleName}, ${String(body.process ?? '') || null}, ${competency}, ${Number(body.requiredLevel ?? 1)}, ${String(body.evidence ?? '') || null}, ${String(body.status ?? 'required')}, ${String(body.expiresAt ?? '') || null}, ${String(body.ownerId ?? '') || null}, ${context.user.id}::uuid) returning *`)
  await db.execute(sql`insert into qms_audit_event (workspace_id, user_id, action, entity_type, entity_id, metadata) values (${context.workspaceId}::uuid, ${context.user.id}::uuid, 'create', 'competency', ${(result.rows[0] as { id: string }).id}::uuid, ${JSON.stringify({ requestId })}::jsonb)`)
  return NextResponse.json({ competency: result.rows[0], requestId }, { status: 201 })
}
