import { NextResponse } from 'next/server'
import { sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { getQmsContext } from '@/lib/qms-auth'
import { qmsError } from '@/lib/qms-http'

export async function GET(request: Request) {
  const requestId = request.headers.get('x-request-id') || crypto.randomUUID()
  const context = await getQmsContext(request)
  if (!context) return qmsError('Prijava je obavezna.', 401, requestId)
  if (!context.workspaceId) return qmsError('Workspace nije konfigurisan.', 400, requestId)
  if (!['admin', 'superadmin'].includes(context.role)) return qmsError('Nemate dozvolu za revizijski trag.', 403, requestId)
  const url = new URL(request.url)
  const limit = Math.min(Math.max(Number(url.searchParams.get('limit') || 50), 1), 200)
  const offset = Math.max(Number(url.searchParams.get('offset') || 0), 0)
  const action = url.searchParams.get('action') || null
  const entityType = url.searchParams.get('entityType') || null
  const search = url.searchParams.get('search') || null
  const format = url.searchParams.get('format') || 'json'
  const result = await db.execute(sql`
    select a.id, a.action, a.entity_type, a.entity_id, a.metadata, a.previous_value, a.new_value, a.ip_address, a.request_id, a.reason, a.created_at, u.name as user_name, u.email as user_email
    from qms_audit_event a left join "user" u on u.id = a.user_id
    where a.workspace_id = ${context.workspaceId}::uuid
      and (${action}::text is null or a.action = ${action})
      and (${entityType}::text is null or a.entity_type = ${entityType})
      and (${search}::text is null or coalesce(u.name, '') ilike '%' || ${search} || '%' or coalesce(a.reason, '') ilike '%' || ${search} || '%' or coalesce(a.request_id, '') ilike '%' || ${search} || '%')
    order by a.created_at desc limit ${limit} offset ${offset}`)
  if (format === 'csv') {
    const header = 'id,action,entity_type,entity_id,user,email,created_at,request_id,reason\n'
    const csv = result.rows.map((row) => [row.id, row.action, row.entity_type, row.entity_id ?? '', row.user_name ?? '', row.user_email ?? '', row.created_at, row.request_id ?? '', row.reason ?? ''].map((value) => `"${String(value).replaceAll('"', '""')}"`).join(',')).join('\n')
    return new Response(header + csv, { headers: { 'content-type': 'text/csv; charset=utf-8', 'content-disposition': 'attachment; filename="qms-audit-log.csv"', 'x-request-id': requestId } })
  }
  return NextResponse.json({ events: result.rows, limit, offset, requestId }, { headers: { 'x-request-id': requestId } })
}
