import { NextResponse } from 'next/server'
import { sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { can } from '@/lib/rbac'
import { getQmsContext } from '@/lib/qms-auth'
import { qmsError } from '@/lib/qms-http'

const transitions: Record<string, string[]> = {
  draft: ['in_review'],
  in_review: ['draft', 'approved'],
  approved: ['published', 'draft'],
  published: ['obsolete'],
  obsolete: [],
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getQmsContext(request)
  const requestId = context?.requestId ?? request.headers.get('x-request-id') ?? crypto.randomUUID()
  if (!context) return qmsError('Prijava je obavezna.', 401, requestId)
  const { id } = await params
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: 'Neispravan identifikator dokumenta.' }, { status: 422 })
  const body = await request.json().catch(() => ({})) as { status?: unknown; reason?: unknown }
  const nextStatus = typeof body.status === 'string' ? body.status : ''
  const reason = typeof body.reason === 'string' ? body.reason.trim().slice(0, 1000) : ''
  if (!['draft', 'in_review', 'approved', 'published', 'obsolete'].includes(nextStatus)) return NextResponse.json({ error: 'Status nije dozvoljen.' }, { status: 422 })
  if (!can(context.role, nextStatus === 'approved' || nextStatus === 'published' ? 'approve' : 'edit')) return NextResponse.json({ error: 'Nemate dozvolu za ovu tranziciju.' }, { status: 403 })
  const current = await db.execute(sql`select workspace_id, status from qms_document where id = ${id}::uuid and workspace_id = ${context.workspaceId}::uuid limit 1`)
  const row = current.rows[0] as { workspace_id?: string; status?: string } | undefined
  if (!row) return NextResponse.json({ error: 'Dokument nije pronađen.' }, { status: 404 })
  if (!row.status || !transitions[row.status]?.includes(nextStatus)) return NextResponse.json({ error: `Tranzicija ${row.status ?? 'nepoznato'} → ${nextStatus} nije dozvoljena.` }, { status: 409 })
  const updated = await db.execute(sql`update qms_document set status = ${nextStatus}, updated_by = ${context.user.id}::uuid, updated_at = now() where id = ${id}::uuid and workspace_id = ${row.workspace_id}::uuid returning id, title, code, status, updated_at`)
  await db.execute(sql`insert into qms_audit_event (workspace_id, user_id, action, entity_type, entity_id, metadata) values (${row.workspace_id}::uuid, ${context.user.id}::uuid, 'workflow_transition', 'document', ${id}::uuid, ${JSON.stringify({ from: row.status, to: nextStatus, reason })}::jsonb)`)
  return NextResponse.json({ document: updated.rows[0] })
}
