import { createHash } from 'node:crypto'
import { NextResponse } from 'next/server'
import { sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { can } from '@/lib/rbac'
import { getQmsContext } from '@/lib/qms-auth'
import { qmsError } from '@/lib/qms-http'

export async function POST(request: Request) {
  const context = await getQmsContext(request)
  const requestId = context?.requestId ?? request.headers.get('x-request-id') ?? crypto.randomUUID()
  if (!context) return qmsError('Prijava je obavezna.', 401, requestId)
  if (!context.workspaceId || !can(context.role, 'export')) return qmsError('Nemate dozvolu za audit paket.', 403, requestId)
  const body = await request.json().catch(() => ({})) as { auditId?: string; title?: string; filters?: Record<string, unknown> }
  if (!body.auditId || !body.title?.trim()) return qmsError('Audit i naziv paketa su obavezni.', 422, requestId)
  const [audit, documents, findings, capa] = await Promise.all([
    db.execute(sql`select * from qms_audit_plan where id = ${body.auditId}::uuid and workspace_id = ${context.workspaceId}::uuid limit 1`),
    db.execute(sql`select d.code, d.title, d.status, v.version, v.content from qms_document d left join lateral (select version, content from qms_document_version where document_id = d.id and workspace_id = d.workspace_id order by created_at desc limit 1) v on true where d.workspace_id = ${context.workspaceId}::uuid order by d.code`),
    db.execute(sql`select * from qms_audit_finding where audit_id = ${body.auditId}::uuid and workspace_id = ${context.workspaceId}::uuid order by created_at`),
    db.execute(sql`select reference, title, status, classification, due_date from qms_capa where workspace_id = ${context.workspaceId}::uuid order by due_date nulls last`),
  ])
  if (!audit.rows.length) return qmsError('Audit nije pronađen.', 404, requestId)
  const manifest = { audit: audit.rows[0], documents: documents.rows, findings: findings.rows, capa: capa.rows, generatedAt: new Date().toISOString() }
  const integrityHash = createHash('sha256').update(JSON.stringify(manifest)).digest('hex')
  const result = await db.execute(sql`insert into qms_audit_package (workspace_id, audit_id, title, filters, manifest, integrity_hash, created_by) values (${context.workspaceId}::uuid, ${body.auditId}::uuid, ${body.title.trim()}, ${JSON.stringify(body.filters ?? {})}::jsonb, ${JSON.stringify(manifest)}::jsonb, ${integrityHash}, ${context.user.id}::uuid) returning id, title, integrity_hash, created_at`)
  await db.execute(sql`insert into qms_audit_event (workspace_id, user_id, action, entity_type, entity_id, metadata) values (${context.workspaceId}::uuid, ${context.user.id}::uuid, 'create', 'audit_package', ${(result.rows[0] as { id: string }).id}::uuid, ${JSON.stringify({ requestId, integrityHash })}::jsonb)`)
  return NextResponse.json({ package: result.rows[0], requestId }, { status: 201 })
}

export async function GET(request: Request) {
  const context = await getQmsContext(request)
  const requestId = context?.requestId ?? request.headers.get('x-request-id') ?? crypto.randomUUID()
  if (!context) return qmsError('Prijava je obavezna.', 401, requestId)
  const rows = await db.execute(sql`select id, audit_id, title, integrity_hash, created_by, created_at from qms_audit_package where workspace_id = ${context.workspaceId}::uuid order by created_at desc`)
  return NextResponse.json({ packages: rows.rows, requestId })
}
