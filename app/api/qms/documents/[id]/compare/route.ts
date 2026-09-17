import { NextResponse } from 'next/server'
import { sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { getQmsContext } from '@/lib/qms-auth'
import { qmsError } from '@/lib/qms-http'

type Params = { params: Promise<{ id: string }> }

export async function GET(request: Request, { params }: Params) {
  const context = await getQmsContext(request)
  const requestId = context?.requestId ?? request.headers.get('x-request-id') ?? crypto.randomUUID()
  if (!context) return qmsError('Prijava je obavezna.', 401, requestId)
  const { id } = await params
  const url = new URL(request.url)
  const from = url.searchParams.get('from')
  const to = url.searchParams.get('to')
  if (!from || !to) return qmsError('Potrebne su obje verzije za poređenje.', 400, requestId)
  const result = await db.execute(sql`select id, version, title, content, change_reason, effective_date, created_at from qms_document_version where workspace_id = ${context.workspaceId}::uuid and document_id = ${id}::uuid and id in (${from}::uuid, ${to}::uuid) order by created_at asc`)
  if (result.rows.length !== 2) return qmsError('Verzije nisu pronađene.', 404, requestId)
  return NextResponse.json({ documentId: id, from: result.rows[0], to: result.rows[1], requestId })
}
