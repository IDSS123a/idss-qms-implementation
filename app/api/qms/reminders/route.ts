import { NextResponse } from 'next/server'
import { sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { getQmsContext } from '@/lib/qms-auth'
import { qmsError } from '@/lib/qms-http'

export async function POST(request: Request) {
  const context = await getQmsContext(request)
  const requestId = context?.requestId ?? request.headers.get('x-request-id') ?? crypto.randomUUID()
  if (!context) return qmsError('Prijava je obavezna.', 401, requestId)
  if (!context.workspaceId) return NextResponse.json({ created: 0, requestId })
  const result = await db.execute(sql`
    insert into qms_notification (workspace_id, user_id, task_id, kind, title, body)
    select t.workspace_id, coalesce(t.owner_id, t.created_by), t.id, 'deadline',
      case when t.due_date < now() then 'Rok je istekao' else 'Rok se približava' end,
      t.title || ' — rok: ' || to_char(t.due_date, 'DD.MM.YYYY')
    from qms_task t
    where t.workspace_id = ${context.workspaceId}::uuid
      and t.status not in ('completed', 'cancelled')
      and t.due_date <= now() + interval '7 days'
      and not exists (
        select 1 from qms_notification n
        where n.task_id = t.id and n.user_id = coalesce(t.owner_id, t.created_by)
          and n.kind = 'deadline' and n.created_at >= now() - interval '24 hours'
      )
    returning id
  `)
  return NextResponse.json({ created: result.rows.length, requestId })
}
export async function GET(request: Request) { return POST(request) }
