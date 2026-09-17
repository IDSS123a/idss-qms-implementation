import { NextResponse } from 'next/server'
import { sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { getQmsContext } from '@/lib/qms-auth'

export async function GET(request: Request) {
  const context = await getQmsContext(request)
  const requestId = request.headers.get('x-request-id') ?? crypto.randomUUID()
  if (!context) return NextResponse.json({ error: 'Prijava je obavezna.', requestId }, { status: 401 })
  if (!['admin', 'superadmin'].includes(context.role)) return NextResponse.json({ error: 'Nedozvoljeno.', requestId }, { status: 403 })
  const result = await db.execute(sql`select action, count(*)::int as count, min(created_at) as oldest_event from qms_audit_event where workspace_id = ${context.workspaceId}::uuid group by action order by count desc`)
  return NextResponse.json({ policy: { auditRetentionDays: 2555, documentRetention: 'versioned', deletionMode: 'admin-reviewed' }, activity: result.rows, requestId })
}

export async function POST(request: Request) {
  const context = await getQmsContext(request)
  const requestId = request.headers.get('x-request-id') ?? crypto.randomUUID()
  if (!context) return NextResponse.json({ error: 'Prijava je obavezna.', requestId }, { status: 401 })
  if (!['admin', 'superadmin'].includes(context.role)) return NextResponse.json({ error: 'Nedozvoljeno.', requestId }, { status: 403 })
  await db.execute(sql`insert into qms_audit_event (workspace_id, user_id, action, entity_type, metadata, request_id, reason) values (${context.workspaceId}::uuid, ${context.user.id}::uuid, 'retention_reviewed', 'retention_policy', ${JSON.stringify({ auditRetentionDays: 2555 })}::jsonb, ${requestId}, 'Administrativni pregled retention politike')`)
  return NextResponse.json({ reviewed: true, requestId })
}
