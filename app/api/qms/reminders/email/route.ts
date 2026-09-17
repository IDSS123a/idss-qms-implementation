import { NextResponse } from 'next/server'
import { sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { getQmsContext } from '@/lib/qms-auth'
import { qmsError } from '@/lib/qms-http'

export async function POST(request: Request) {
  const context = await getQmsContext(request)
  const requestId = context?.requestId ?? request.headers.get('x-request-id') ?? crypto.randomUUID()
  if (!context) return qmsError('Prijava je obavezna.', 401, requestId)
  if (!['admin', 'superadmin'].includes(context.role)) return qmsError('Nemate dozvolu za slanje eskalacija.', 403, requestId)
  if (!context.workspaceId) return NextResponse.json({ sent: 0, skipped: true, requestId })
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return qmsError('E-mail kanal nije konfigurisan.', 503, requestId)
  const rows = await db.execute(sql`
    select t.id, t.title, t.due_date, coalesce(t.owner_id, t.created_by) as recipient_id, u.email
    from qms_task t
    join "user" u on u.id = coalesce(t.owner_id, t.created_by)
    where t.workspace_id = ${context.workspaceId}::uuid
      and t.status not in ('completed', 'cancelled')
      and t.due_date <= now() + interval '7 days'
      and u.email is not null
      and not exists (select 1 from qms_audit_event a where a.workspace_id = t.workspace_id and a.entity_id = t.id and a.action = 'deadline_email' and a.created_at >= now() - interval '24 hours')
    limit 50
  `)
  let sent = 0
  for (const row of rows.rows as Array<{ id: string; title: string; due_date: string; email: string }>) {
    const response = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json', 'idempotency-key': `qms-deadline/${row.id}` }, body: JSON.stringify({ from: 'QMS <onboarding@resend.dev>', to: [row.email], subject: `QMS rok: ${row.title}`, html: `<p>Rok za zadatak <strong>${row.title}</strong> je ${new Date(row.due_date).toLocaleDateString('bs-BA')}.</p><p>Ovo je automatska QMS eskalacija.</p>` }) })
    if (!response.ok) continue
    await db.execute(sql`insert into qms_audit_event (workspace_id, user_id, action, entity_type, entity_id, metadata) values (${context.workspaceId}::uuid, ${context.user.id}::uuid, 'deadline_email', 'qms_task', ${row.id}::uuid, ${JSON.stringify({ recipient: row.email, requestId })}::jsonb)`)
    sent += 1
  }
  return NextResponse.json({ sent, considered: rows.rows.length, requestId })
}

export async function GET(request: Request) { return POST(request) }
