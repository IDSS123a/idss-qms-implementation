import { NextResponse } from 'next/server'
import { createHash, randomBytes } from 'node:crypto'
import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'
import { getQmsContext } from '@/lib/qms-auth'
import { qmsError } from '@/lib/qms-http'

export async function GET(request: Request) {
  const requestId = request.headers.get('x-request-id') ?? crypto.randomUUID()
  const context = await getQmsContext(request)
  if (!context) return qmsError('Prijava je obavezna.', 401, requestId)
  if (!['admin', 'superadmin'].includes(context.role)) return qmsError('Samo administrator može pregledati API ključeve.', 403, requestId)
  const rows = await db.execute(sql`select id, name, key_prefix, last_used_at, revoked_at, created_at from qms_api_key where workspace_id = ${context.workspaceId}::uuid order by created_at desc`)
  return NextResponse.json({ keys: rows.rows, requestId })
}

export async function POST(request: Request) {
  const requestId = request.headers.get('x-request-id') ?? crypto.randomUUID()
  const context = await getQmsContext(request)
  if (!context) return qmsError('Prijava je obavezna.', 401, requestId)
  if (!['admin', 'superadmin'].includes(context.role)) return qmsError('Samo administrator može kreirati API ključ.', 403, requestId)
  const body = await request.json().catch(() => ({})) as { name?: string }
  const name = body.name?.trim()
  if (!name) return qmsError('Naziv ključa je obavezan.', 422, requestId)
  const secret = `qms_${randomBytes(32).toString('hex')}`
  const hash = createHash('sha256').update(secret).digest('hex')
  const prefix = secret.slice(0, 12)
  const result = await db.execute(sql`insert into qms_api_key (workspace_id, name, key_prefix, key_hash, created_by) values (${context.workspaceId}::uuid, ${name}, ${prefix}, ${hash}, ${context.user.id}) returning id, name, key_prefix, created_at`)
  return NextResponse.json({ key: result.rows[0], secret, requestId }, { status: 201 })
}

export async function DELETE(request: Request) {
  const requestId = request.headers.get('x-request-id') ?? crypto.randomUUID()
  const context = await getQmsContext(request)
  if (!context) return qmsError('Prijava je obavezna.', 401, requestId)
  if (!['admin', 'superadmin'].includes(context.role)) return qmsError('Samo administrator može opozvati API ključ.', 403, requestId)
  const body = await request.json().catch(() => ({})) as { id?: string }
  if (!body.id) return qmsError('Ključ je obavezan.', 422, requestId)
  await db.execute(sql`update qms_api_key set revoked_at = now() where id = ${body.id}::uuid and workspace_id = ${context.workspaceId}::uuid`)
  return NextResponse.json({ ok: true, requestId })
}
