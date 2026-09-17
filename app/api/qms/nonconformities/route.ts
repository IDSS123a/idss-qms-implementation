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
  const result = await db.execute(sql`select id, reference, source_type, source_reference, description, immediate_action, classification, owner_id, due_date, capa_id, status, evidence, created_at, updated_at from qms_nonconformity where workspace_id = ${context.workspaceId}::uuid order by created_at desc`)
  return NextResponse.json({ items: result.rows, requestId })
}

export async function POST(request: Request) {
  const context = await getQmsContext(request)
  const requestId = context?.requestId ?? request.headers.get('x-request-id') ?? crypto.randomUUID()
  if (!context) return qmsError('Prijava je obavezna.', 401, requestId)
  if (!context.workspaceId || !can(context.role, 'edit')) return qmsError('Nemate dozvolu za unos nesukladnosti.', 403, requestId)
  const body = await request.json().catch(() => null) as Record<string, unknown> | null
  const reference = typeof body?.reference === 'string' ? body.reference.trim() : ''
  const description = typeof body?.description === 'string' ? body.description.trim() : ''
  if (!reference || !description) return qmsError('Šifra i opis nesukladnosti su obavezni.', 422, requestId)
  const result = await db.execute(sql`insert into qms_nonconformity (workspace_id, reference, source_type, source_reference, description, immediate_action, classification, owner_id, due_date, capa_id, status, evidence, created_by) values (${context.workspaceId}::uuid, ${reference}, ${String(body?.sourceType ?? 'internal')}, ${typeof body?.sourceReference === 'string' ? body.sourceReference : null}, ${description}, ${typeof body?.immediateAction === 'string' ? body.immediateAction : null}, ${String(body?.classification ?? 'minor')}, ${typeof body?.ownerId === 'string' ? body.ownerId : null}, ${typeof body?.dueDate === 'string' ? body.dueDate : null}, ${typeof body?.capaId === 'string' ? body.capaId : null}, 'open', ${typeof body?.evidence === 'string' ? body.evidence : null}, ${context.user.id}::uuid) returning id, reference, status`)
  await db.execute(sql`insert into qms_audit_event (workspace_id, user_id, action, entity_type, entity_id, metadata) values (${context.workspaceId}::uuid, ${context.user.id}::uuid, 'create', 'nonconformity', ${(result.rows[0] as { id: string }).id}::uuid, ${JSON.stringify({ requestId, reference })}::jsonb)`)
  return NextResponse.json({ item: result.rows[0], requestId }, { status: 201 })
}
