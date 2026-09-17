import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'
import { getQmsContext } from '@/lib/qms-auth'
import { qmsError } from '@/lib/qms-http'

export async function GET(request: Request) {
  const requestId = request.headers.get('x-request-id') ?? crypto.randomUUID()
  const context = await getQmsContext(request)
  if (!context) return qmsError('Prijava je obavezna.', 401, requestId)
  const [workspace, members, documents, admin] = await Promise.all([
    db.execute(sql`select id, name, slug, created_at from qms_workspace where id = ${context.workspaceId}::uuid`),
    db.execute(sql`select count(*)::int as count from qms_membership where workspace_id = ${context.workspaceId}::uuid`),
    db.execute(sql`select count(*)::int as count from qms_document where workspace_id = ${context.workspaceId}::uuid`),
    db.execute(sql`select count(*)::int as count from qms_membership where workspace_id = ${context.workspaceId}::uuid and role in ('admin', 'owner')`),
  ])
  const checks = { workspace: workspace.rows.length > 0, admin: Number(admin.rows[0]?.count ?? 0) > 0, members: Number(members.rows[0]?.count ?? 0) > 0, documents: Number(documents.rows[0]?.count ?? 0) > 0 }
  return NextResponse.json({ workspace: workspace.rows[0] ?? null, checks, ready: Object.values(checks).every(Boolean), requestId })
}
