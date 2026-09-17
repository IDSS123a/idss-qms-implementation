import { NextResponse } from 'next/server'
import { sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { getQmsContext } from '@/lib/qms-auth'
import { qmsError } from '@/lib/qms-http'

export async function GET(request: Request) {
  const context = await getQmsContext(request)
  const requestId = context?.requestId ?? request.headers.get('x-request-id') ?? crypto.randomUUID()
  if (!context) return qmsError('Prijava je obavezna.', 401, requestId)
  if (!context.workspaceId) return NextResponse.json({ analytics: { capa: [], risks: [], aging: [] }, requestId })
  const workspace = sql`${context.workspaceId}::uuid`
  const [capa, risks, aging, nonconformities] = await Promise.all([
    db.execute(sql`select status, count(*)::int as count from qms_capa where workspace_id = ${workspace} group by status order by status`),
    db.execute(sql`select likelihood, impact, count(*)::int as count from qms_risk where workspace_id = ${workspace} group by likelihood, impact order by likelihood desc, impact desc`),
    db.execute(sql`select case when due_date < current_date then 'overdue' when due_date <= current_date + 30 then 'next_30_days' else 'later' end as bucket, count(*)::int as count from qms_capa where workspace_id = ${workspace} and status <> 'closed' group by bucket order by bucket`),
    db.execute(sql`select status, classification, count(*)::int as count from qms_nonconformity where workspace_id = ${workspace} group by status, classification order by status, classification`),
  ])
  return NextResponse.json({ analytics: { capa: capa.rows, risks: risks.rows, aging: aging.rows, nonconformities: nonconformities.rows }, requestId })
}
