import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'
import { roleForEmail, can, type QmsRole } from '@/lib/rbac'

export const runtime = 'nodejs'

async function getContext(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session?.user) return null
  const role = roleForEmail(session.user.email) as QmsRole
  const workspace = await db.execute(sql`select id, name, slug from qms_workspace order by created_at asc limit 1`)
  const workspaceId = workspace.rows[0]?.id
  return { user: session.user, role, workspaceId }
}

async function audit(userId: string, workspaceId: string, action: string, entityType: string, entityId: string | null, metadata: Record<string, unknown> = {}) {
  await db.execute(sql`insert into qms_audit_event (workspace_id, user_id, action, entity_type, entity_id, metadata) values (${workspaceId}::uuid, ${userId}::uuid, ${action}, ${entityType}, ${entityId ? `${entityId}` : null}::uuid, ${JSON.stringify(metadata)}::jsonb)`)
}

export async function GET(request: Request) {
  const context = await getContext(request)
  if (!context) return NextResponse.json({ error: 'Prijava je obavezna.' }, { status: 401 })
  if (!context.workspaceId) return NextResponse.json({ documents: [], workspace: null })
  const documents = await db.execute(sql`select id, title, code, type, status, created_by, updated_by, created_at, updated_at from qms_document where workspace_id = ${context.workspaceId}::uuid order by updated_at desc`)
  await audit(context.user.id, String(context.workspaceId), 'read', 'document_list', null, { count: documents.rows.length })
  return NextResponse.json({ documents: documents.rows, workspace: context.workspaceId, role: context.role })
}

export async function POST(request: Request) {
  const context = await getContext(request)
  if (!context) return NextResponse.json({ error: 'Prijava je obavezna.' }, { status: 401 })
  if (!context.workspaceId) return NextResponse.json({ error: 'QMS okruženje još nije kreirano.' }, { status: 409 })
  if (!can(context.role, 'create')) return NextResponse.json({ error: 'Nemate dozvolu za kreiranje dokumenta.' }, { status: 403 })
  const body = await request.json().catch(() => ({})) as Record<string, unknown>
  const title = typeof body.title === 'string' ? body.title.trim().slice(0, 200) : ''
  const code = typeof body.code === 'string' ? body.code.trim().slice(0, 80) : ''
  const type = typeof body.type === 'string' ? body.type.trim().slice(0, 80) : 'Procedura'
  const content = typeof body.content === 'string' ? body.content.slice(0, 100000) : ''
  if (title.length < 3 || !code) return NextResponse.json({ error: 'Naziv i šifra dokumenta su obavezni.' }, { status: 422 })
  const created = await db.execute(sql`insert into qms_document (workspace_id, title, code, type, status, content, created_by, updated_by) values (${context.workspaceId}::uuid, ${title}, ${code}, ${type}, 'draft', ${content}, ${context.user.id}::uuid, ${context.user.id}::uuid) returning id, title, code, type, status, content, created_at, updated_at`)
  const document = created.rows[0]
  await audit(context.user.id, String(context.workspaceId), 'create', 'document', String(document.id), { code, title, type })
  return NextResponse.json({ document }, { status: 201 })
}

export async function PATCH(request: Request) {
  const context = await getContext(request)
  if (!context) return NextResponse.json({ error: 'Prijava je obavezna.' }, { status: 401 })
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
  await audit(context.user.id, String(context.workspaceId), 'update', 'document', id, { status })
  return NextResponse.json({ document: updated.rows[0] })
}

export async function DELETE(request: Request) {
  const context = await getContext(request)
  if (!context) return NextResponse.json({ error: 'Prijava je obavezna.' }, { status: 401 })
  if (!can(context.role, 'delete')) return NextResponse.json({ error: 'Nemate dozvolu za brisanje dokumenta.' }, { status: 403 })
  const id = new URL(request.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID dokumenta je obavezan.' }, { status: 422 })
  const deleted = await db.execute(sql`delete from qms_document where id = ${id}::uuid and workspace_id = ${context.workspaceId}::uuid returning id, code`)
  if (!deleted.rows[0]) return NextResponse.json({ error: 'Dokument nije pronađen.' }, { status: 404 })
  await audit(context.user.id, String(context.workspaceId), 'delete', 'document', id, { code: deleted.rows[0].code })
  return NextResponse.json({ ok: true })
}
