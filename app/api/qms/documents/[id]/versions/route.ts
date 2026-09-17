import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'
import { can } from '@/lib/rbac'
import { getQmsContext } from '@/lib/qms-auth'
import { qmsError } from '@/lib/qms-http'

export const runtime = 'nodejs'


export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getQmsContext(request)
  if (!context) return qmsError('Prijava je obavezna.', 401, request.headers.get('x-request-id') || crypto.randomUUID())
  if (!context.workspaceId || !can(context.role, 'view')) return NextResponse.json({ error: 'Nemate dozvolu za pregled verzija.' }, { status: 403 })
  const { id } = await params
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: 'Neispravan ID dokumenta.' }, { status: 422 })
  const versions = await db.execute(sql`select id, document_id, version, status, title, change_reason, effective_date, next_review_date, created_by, created_at from qms_document_version where document_id = ${id}::uuid and workspace_id = ${context.workspaceId}::uuid order by created_at desc`)
  return NextResponse.json({ versions: versions.rows })
}
