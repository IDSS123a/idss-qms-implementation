import { sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { getQmsContext } from '@/lib/qms-auth'
import { qmsError } from '@/lib/qms-http'

const ics = (value: string) => value.replace(/[\\;,\n]/g, (match) => match === '\n' ? '\\n' : `\\${match}`)
const date = (value: string) => new Date(value).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')

export async function GET(request: Request) {
  const context = await getQmsContext(request)
  const requestId = context?.requestId ?? request.headers.get('x-request-id') ?? crypto.randomUUID()
  if (!context) return qmsError('Prijava je obavezna.', 401, requestId)
  if (!context.workspaceId) return new Response('BEGIN:VCALENDAR\r\nVERSION:2.0\r\nEND:VCALENDAR\r\n', { headers: { 'Content-Type': 'text/calendar; charset=utf-8' } })
  const result = await db.execute(sql`
    select id, title, description, due_date as due, 'QMS zadatak' as category
    from qms_task where workspace_id = ${context.workspaceId}::uuid and status not in ('completed', 'cancelled')
    union all select id, title, description, due_date as due, 'CAPA' as category
    from qms_capa where workspace_id = ${context.workspaceId}::uuid and status not in ('closed', 'cancelled') and due_date is not null
    union all select id, title, description, due_date as due, 'Obuka' as category
    from qms_training where workspace_id = ${context.workspaceId}::uuid and status not in ('completed', 'cancelled') and due_date is not null
    order by due asc
  `)
  const events = result.rows.map((row) => { const item = row as { id: string; title: string; description?: string; due: string; category: string }; return `BEGIN:VEVENT\r\nUID:${item.id}@qms\r\nDTSTAMP:${date(new Date().toISOString())}\r\nDTSTART:${date(item.due)}\r\nSUMMARY:${ics(`[${item.category}] ${item.title}`)}\r\nDESCRIPTION:${ics(item.description ?? '')}\r\nEND:VEVENT` }).join('\r\n')
  return new Response(`BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//QMS//Due Dates//BS\r\n${events}\r\nEND:VCALENDAR\r\n`, { headers: { 'Content-Type': 'text/calendar; charset=utf-8', 'Content-Disposition': 'attachment; filename="qms-rokovi.ics"', 'X-Request-Id': requestId } })
}
