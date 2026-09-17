import { NextResponse } from 'next/server'
import { sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { getQmsContext } from '@/lib/qms-auth'
import { qmsError } from '@/lib/qms-http'

export async function GET(request: Request) {
  const context = await getQmsContext(request)
  const requestId = context?.requestId ?? request.headers.get('x-request-id') ?? crypto.randomUUID()
  if (!context) return qmsError('Prijava je obavezna.', 401, requestId)
  const rows = await db.execute(sql`select d.id, d.document_id, d.version_id, d.user_id, d.distributed_at, d.acknowledged_at, q.code, q.title, v.version from qms_document_distribution d join qms_document q on q.id = d.document_id and q.workspace_id = d.workspace_id join qms_document_version v on v.id = d.version_id and v.workspace_id = d.workspace_id where d.workspace_id = ${context.workspaceId}::uuid order by d.distributed_at desc`)
  return NextResponse.json({ distributions: rows.rows, requestId })
}

export async function POST(request: Request) {
  const context = await getQmsContext(request)
  const requestId = context?.requestId ?? request.headers.get('x-request-id') ?? crypto.randomUUID()
  if (!context) return qmsError('Prijava je obavezna.', 401, requestId)
  const body = await request.json().catch(() => ({})) as { documentId?: string; versionId?: string; userIds?: string[] }
  if (!body.documentId || !body.versionId || !Array.isArray(body.userIds) || body.userIds.length === 0) return qmsError('Dokument, verzija i najmanje jedan korisnik su obavezni.', 400, requestId)
  const result = await db.execute(sql`insert into qms_document_distribution (workspace_id, document_id, version_id, user_id) select ${context.workspaceId}::uuid, ${body.documentId}::uuid, ${body.versionId}::uuid, value::uuid from jsonb_array_elements_text(${JSON.stringify(body.userIds)}::jsonb) as values(value) on conflict do nothing returning id, user_id, distributed_at`)
  await db.execute(sql`insert into qms_audit_event (workspace_id, user_id, action, entity_type, entity_id, metadata) values (${context.workspaceId}::uuid, ${context.user.id}::uuid, 'distribute', 'document', ${body.documentId}::uuid, ${JSON.stringify({ versionId: body.versionId, userCount: body.userIds.length, requestId })}::jsonb)`)
  return NextResponse.json({ distributions: result.rows, requestId }, { status: 201 })
}

export async function PATCH(request: Request) {
  const context = await getQmsContext(request)
  const requestId = context?.requestId ?? request.headers.get('x-request-id') ?? crypto.randomUUID()
  if (!context) return qmsError('Prijava je obavezna.', 401, requestId)
  const body = await request.json().catch(() => ({})) as { id?: string }
  if (!body.id) return qmsError('Distribucija nije navedena.', 400, requestId)
  const result = await db.execute(sql`update qms_document_distribution set acknowledged_at = now() where id = ${body.id}::uuid and workspace_id = ${context.workspaceId}::uuid and user_id = ${context.user.id}::uuid returning id, acknowledged_at`)
  if (!result.rows.length) return qmsError('Distribucija nije pronađena.', 404, requestId)
  return NextResponse.json({ distribution: result.rows[0], requestId })
} 
