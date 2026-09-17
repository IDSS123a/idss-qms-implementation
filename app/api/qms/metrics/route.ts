import { NextResponse } from 'next/server'
import { sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { getQmsContext } from '@/lib/qms-auth'
import { qmsError } from '@/lib/qms-http'

export async function GET(request: Request) {
  const context = await getQmsContext(request)
  if (!context) return qmsError('Prijava je obavezna.', 401, request.headers.get('x-request-id') ?? crypto.randomUUID())
  if (!context.workspaceId) return NextResponse.json({ metrics: { documents: 0, openTasks: 0, overdueTasks: 0, approvedDocuments: 0, activeCapa: 0, openRisks: 0 } })
  const [documents, tasks, overdue, approved, capa, risks] = await Promise.all([
    db.execute(sql`select count(*)::int as count from qms_document where workspace_id = ${context.workspaceId}::uuid`),
    db.execute(sql`select count(*)::int as count from qms_task where workspace_id = ${context.workspaceId}::uuid and status not in ('completed', 'cancelled')`),
    db.execute(sql`select count(*)::int as count from qms_task where workspace_id = ${context.workspaceId}::uuid and status not in ('completed', 'cancelled') and due_date < current_date`),
    db.execute(sql`select count(*)::int as count from qms_document where workspace_id = ${context.workspaceId}::uuid and status in ('approved', 'published')`),
    db.execute(sql`select count(*)::int as count from qms_capa where workspace_id = ${context.workspaceId}::uuid and status not in ('closed', 'cancelled')`),
    db.execute(sql`select count(*)::int as count from qms_risk where workspace_id = ${context.workspaceId}::uuid and status not in ('closed', 'accepted')`),
  ])
  const count = (result: { rows: unknown[] }) => Number((result.rows[0] as { count?: number })?.count ?? 0)
  return NextResponse.json({ metrics: { documents: count(documents), openTasks: count(tasks), overdueTasks: count(overdue), approvedDocuments: count(approved), activeCapa: count(capa), openRisks: count(risks) } }, { headers: { 'x-request-id': context.requestId } })
}
