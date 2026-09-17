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
  const rows = await db.execute(sql`select m.id, m.user_id, m.role, m.created_at, u.name, u.email from qms_membership m join "user" u on u.id = m.user_id where m.workspace_id = ${context.workspaceId}::uuid order by m.created_at asc`)
  return NextResponse.json({ members: rows.rows, requestId })
}

export async function POST(request: Request) {
  const requestId = request.headers.get('x-request-id') ?? crypto.randomUUID()
  const context = await getQmsContext(request)
  if (!context) return qmsError('Prijava je obavezna.', 401, requestId)
  if (!['admin', 'superadmin'].includes(context.role)) return qmsError('Samo administrator može pozvati korisnika.', 403, requestId)
  const body = await request.json().catch(() => ({})) as { email?: string; role?: string }
  const email = body.email?.trim().toLowerCase()
  if (!email || !email.includes('@')) return qmsError('Ispravan email je obavezan.', 422, requestId)
  const role = ['admin', 'editor', 'viewer'].includes(body.role ?? '') ? body.role : 'viewer'
  const token = randomBytes(32).toString('hex')
  const tokenHash = createHash('sha256').update(token).digest('hex')
  const result = await db.execute(sql`insert into qms_invitation (workspace_id, email, role, token_hash, invited_by, expires_at) values (${context.workspaceId}::uuid, ${email}, ${role}, ${tokenHash}, ${context.user.id}, now() + interval '7 days') returning id, email, role, expires_at`)
  await db.execute(sql`insert into qms_audit_event (workspace_id, user_id, action, entity_type, metadata, request_id) values (${context.workspaceId}::uuid, ${context.user.id}, 'invite_member', 'membership', ${JSON.stringify({ email, role })}::jsonb, ${requestId})`)
  return NextResponse.json({ invitation: result.rows[0], inviteToken: token, requestId }, { status: 201 })
}

export async function DELETE(request: Request) {
  const requestId = request.headers.get('x-request-id') ?? crypto.randomUUID()
  const context = await getQmsContext(request)
  if (!context) return qmsError('Prijava je obavezna.', 401, requestId)
  if (!['admin', 'superadmin'].includes(context.role)) return qmsError('Samo administrator može deaktivirati člana.', 403, requestId)
  const body = await request.json().catch(() => ({})) as { membershipId?: string }
  if (!body.membershipId) return qmsError('Članstvo je obavezno.', 422, requestId)
  await db.execute(sql`delete from qms_membership where id = ${body.membershipId}::uuid and workspace_id = ${context.workspaceId}::uuid`)
  return NextResponse.json({ ok: true, requestId })
}
