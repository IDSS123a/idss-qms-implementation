import { NextResponse } from 'next/server'
import { sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { getQmsContext } from '@/lib/qms-auth'
import { qmsError } from '@/lib/qms-http'

export async function GET(request: Request) {
  const context = await getQmsContext(request)
  const requestId = context?.requestId ?? request.headers.get('x-request-id') ?? crypto.randomUUID()
  if (!context) return qmsError('Prijava je obavezna.', 401, requestId)
  const result = await db.execute(sql`select d.code, d.title, d.type, d.status, v.version, v.change_reason, v.effective_date, v.next_review_date, v.content from qms_document d left join lateral (select version, change_reason, effective_date, next_review_date, content from qms_document_version where document_id = d.id and workspace_id = d.workspace_id order by created_at desc limit 1) v on true where d.workspace_id = ${context.workspaceId}::uuid order by d.code`)
  const payload = { exportedAt: new Date().toISOString(), workspaceId: context.workspaceId, documents: result.rows }
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(payload)))
  const hashValue = Array.from(new Uint8Array(hash)).map((byte) => byte.toString(16).padStart(2, '0')).join('')
  await db.execute(sql`insert into qms_audit_event (workspace_id, user_id, action, entity_type, metadata) values (${context.workspaceId}::uuid, ${context.user.id}::uuid, 'export', 'document_register', ${JSON.stringify({ hash: hashValue, requestId, count: result.rows.length })}::jsonb)`)
  return new NextResponse(JSON.stringify({ ...payload, integrityHash: hashValue }, null, 2), { headers: { 'Content-Type': 'application/json; charset=utf-8', 'Content-Disposition': 'attachment; filename="qms-document-register.json"', 'X-Request-Id': requestId, 'X-Integrity-Hash': hashValue } })
}
