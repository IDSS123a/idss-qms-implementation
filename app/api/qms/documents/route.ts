import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'
import { can } from '@/lib/rbac'
import { getQmsContext } from '@/lib/qms-auth'
import { qmsError } from '@/lib/qms-http'
import { documentInputSchema, validationError } from '@/lib/validation/qms'

export const runtime = 'nodejs'


async function audit(userId: string, workspaceId: string, action: string, entityType: string, entityId: string | null, metadata: Record<string, unknown> = {}) {
  await db.execute(sql`insert into qms_audit_event (workspace_id, user_id, action, entity_type, entity_id, metadata) values (${workspaceId}::uuid, ${userId}::uuid, ${action}, ${entityType}, ${entityId ? `${entityId}` : null}::uuid, ${JSON.stringify(metadata)}::jsonb)`)
}

export async function GET(request: Request) {
  const context = await getQmsContext(request)
  if (!context) return qmsError('Prijava je obavezna.', 401, request.headers.get('x-request-id') || crypto.randomUUID())
  if (!context.workspaceId) return NextResponse.json({ documents: [], workspace: null })
  const documents = await db.execute(sql`select d.id, d.title, d.code, d.type, d.status, d.created_by, d.updated_by, d.created_at, d.updated_at, (select v.version from qms_document_version v where v.document_id = d.id and v.workspace_id = d.workspace_id order by v.created_at desc limit 1) as version from qms_document d where d.workspace_id = ${context.workspaceId}::uuid order by d.updated_at desc`)
  await audit(context.user.id, String(context.workspaceId), 'read', 'document_list', null, { count: documents.rows.length })
  return NextResponse.json({ documents: documents.rows, workspace: context.workspaceId, role: context.role })
}

export async function POST(request: Request) {
  const context = await getQmsContext(request)
  if (!context) return qmsError('Prijava je obavezna.', 401, request.headers.get('x-request-id') || crypto.randomUUID())
  if (!context.workspaceId) return NextResponse.json({ error: 'QMS okruženje još nije kreirano.' }, { status: 409 })
  if (!can(context.role, 'create')) return NextResponse.json({ error: 'Nemate dozvolu za kreiranje dokumenta.' }, { status: 403 })
  const body = await request.json().catch(() => ({}))
  const parsed = documentInputSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: validationError(parsed.error) }, { status: 422 })
  const { title, code, type, status, content } = parsed.data
  const created = await db.execute(sql`insert into qms_document (workspace_id, title, code, type, status, content, created_by, updated_by) values (${context.workspaceId}::uuid, ${title}, ${code}, ${type}, ${status}, ${content}, ${context.user.id}::uuid, ${context.user.id}::uuid) returning id, title, code, type, status, content, created_at, updated_at`)
  const document = created.rows[0]
  await db.execute(sql`insert into qms_document_version (document_id, workspace_id, version, status, title, content, change_reason, created_by) values (${document.id}::uuid, ${context.workspaceId}::uuid, '1.0', ${status}, ${title}, ${JSON.stringify({ content })}::jsonb, 'Početna verzija', ${context.user.id}::uuid)`)
  await audit(context.user.id, String(context.workspaceId), 'create', 'document', String(document.id), { code, title, type })
  return NextResponse.json({ document }, { status: 201 })
}

export async function PATCH(request: Request) {
  const context = await getQmsContext(request)
  if (!context) return qmsError('Prijava je obavezna.', 401, request.headers.get('x-request-id') || crypto.randomUUID())
  if (!can(context.role, 'edit')) return NextResponse.json({ error: 'Nemate dozvolu za izmjenu dokumenta.' }, { status: 403 })
  const body = await request.json().catch(() => ({})) as Record<string, unknown>
  const id = typeof body.id === 'string' ? body.id : ''
  const title = typeof body.title === 'string' ? body.title.trim().slice(0, 200) : ''
  const content = typeof body.content === 'string' ? body.content.slice(0, 100000) : ''
  const status = typeof body.status === 'string' ? body.status.trim().slice(0, 40) : 'draft'
  const allowedStatuses = new Set(['draft', 'in_review', 'approved', 'obsolete'])
  if (!id || title.length < 3) return NextResponse.json({ error: 'ID i naziv dokumenta su obavezni.' }, { status: 422 })
  if (!allowedStatuses.has(status)) return NextResponse.json({ error: 'Status dokumenta nije dozvoljen.' }, { status: 422 })
  const updated = await db.execute(sql`update qms_document set title = ${title}, content = ${content}, status = ${status}, updated_by = ${context.user.id}::uuid, updated_at = now() where id = ${id}::uuid and workspace_id = ${context.workspaceId}::uuid returning id, title, code, type, status, content, updated_at`)
  if (!updated.rows[0]) return NextResponse.json({ error: 'Dokument nije pronađen.' }, { status: 404 })
  const latestVersion = await db.execute(sql`select version from qms_document_version where document_id = ${id}::uuid and workspace_id = ${context.workspaceId}::uuid order by created_at desc limit 1`)
  const previousVersion = String(latestVersion.rows[0]?.version ?? '1.0')
  const [major, minor] = previousVersion.split('.').map(Number)
  const nextVersion = `${Number.isFinite(major) ? major : 1}.${(Number.isFinite(minor) ? minor : 0) + 1}`
  await db.execute(sql`insert into qms_document_version (document_id, workspace_id, version, status, title, content, change_reason, created_by) values (${id}::uuid, ${context.workspaceId}::uuid, ${nextVersion}, ${status}, ${title}, ${JSON.stringify({ content })}::jsonb, 'Izmjena dokumenta', ${context.user.id}::uuid)`)
  await audit(context.user.id, String(context.workspaceId), 'update', 'document', id, { status, version: nextVersion })
  return NextResponse.json({ document: updated.rows[0], version: nextVersion })
}

export async function DELETE(request: Request) {
  const context = await getQmsContext(request)
  if (!context) return qmsError('Prijava je obavezna.', 401, request.headers.get('x-request-id') || crypto.randomUUID())
  if (!can(context.role, 'delete')) return NextResponse.json({ error: 'Nemate dozvolu za brisanje dokumenta.' }, { status: 403 })
  const id = new URL(request.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID dokumenta je obavezan.' }, { status: 422 })
  const deleted = await db.execute(sql`delete from qms_document where id = ${id}::uuid and workspace_id = ${context.workspaceId}::uuid returning id, code`)
  if (!deleted.rows[0]) return NextResponse.json({ error: 'Dokument nije pronađen.' }, { status: 404 })
  await audit(context.user.id, String(context.workspaceId), 'delete', 'document', id, { code: deleted.rows[0].code })
  return NextResponse.json({ ok: true })
}
