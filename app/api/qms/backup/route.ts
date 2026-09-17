import { NextResponse } from 'next/server'
import { sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { getQmsContext } from '@/lib/qms-auth'

export async function GET(request: Request) {
  const context = await getQmsContext(request)
  const requestId = request.headers.get('x-request-id') ?? crypto.randomUUID()
  if (!context) return NextResponse.json({ error: 'Prijava je obavezna.', requestId }, { status: 401 })
  if (!['admin', 'superadmin'].includes(context.role)) return NextResponse.json({ error: 'Nedozvoljeno.', requestId }, { status: 403 })
  const [documents, events, members] = await Promise.all([
    db.execute(sql`select count(*)::int as count, max(updated_at) as last_update from qms_document where workspace_id = ${context.workspaceId}::uuid`),
    db.execute(sql`select count(*)::int as count, max(created_at) as last_update from qms_audit_event where workspace_id = ${context.workspaceId}::uuid`),
    db.execute(sql`select count(*)::int as count from qms_user_role where workspace_id = ${context.workspaceId}::uuid`),
  ])
  return NextResponse.json({ backup: { generatedAt: new Date().toISOString(), workspaceId: context.workspaceId, format: 'manifest-only', restore: 'Use database provider point-in-time restore, then replay migrations.' }, counts: { documents: documents.rows[0], auditEvents: events.rows[0], members: members.rows[0] }, requestId })
}
