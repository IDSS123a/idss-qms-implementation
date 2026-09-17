import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'
import { getQmsContext } from '@/lib/qms-auth'
import { qmsError } from '@/lib/qms-http'

export async function GET(request: Request) {
  const context = await getQmsContext(request)
  const requestId = context?.requestId ?? request.headers.get('x-request-id') ?? crypto.randomUUID()
  if (!context) return qmsError('Prijava je obavezna.', 401, requestId)
  const rows = await db.execute(sql`select id, reference, title, due_date, status, attendance_confirmed, competency_confirmed, case when due_date < current_date and status <> 'completed' then 'overdue' when due_date <= current_date + 30 and status <> 'completed' then 'expiring' end as alert from qms_training where workspace_id = ${context.workspaceId}::uuid and status <> 'completed' and due_date is not null and due_date <= current_date + 30 order by due_date asc`)
  return NextResponse.json({ alerts: rows.rows, requestId })
}
