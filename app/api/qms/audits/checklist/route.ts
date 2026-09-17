import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'
import { can } from '@/lib/rbac'
import { getQmsContext } from '@/lib/qms-auth'
import { qmsError } from '@/lib/qms-http'

const results = ['pending', 'conforming', 'nonconforming', 'not_applicable']

export async function GET(request: Request) {
  const context = await getQmsContext(request)
  const requestId = context?.requestId ?? request.headers.get('x-request-id') ?? crypto.randomUUID()
  if (!context) return qmsError('Prijava je obavezna.', 401, requestId)
  const auditId = new URL(request.url).searchParams.get('auditId') ?? ''
  if (!/^[0-9a-f-]{36}$/i.test(auditId)) return qmsError('Neispravan audit.', 422, requestId)
  const rows = await db.execute(sql`select id, item_no, requirement, evidence, result, notes, created_at, updated_at from qms_audit_checklist where workspace_id = ${context.workspaceId}::uuid and audit_id = ${auditId}::uuid order by item_no`)
  return NextResponse.json({ checklist: rows.rows, requestId })
}

export async function POST(request: Request) {
  const context = await getQmsContext(request)
  const requestId = context?.requestId ?? request.headers.get('x-request-id') ?? crypto.randomUUID()
  if (!context) return qmsError('Prijava je obavezna.', 401, requestId)
  if (!context.workspaceId || !can(context.role, 'edit')) return qmsError('Nemate dozvolu za checklist.', 403, requestId)
  const body = await request.json().catch(() => ({})) as Record<string, unknown>
  const auditId = typeof body.auditId === 'string' ? body.auditId : ''
  const requirement = typeof body.requirement === 'string' ? body.requirement.trim().slice(0, 1000) : ''
  const itemNo = Number(body.itemNo)
  if (!/^[0-9a-f-]{36}$/i.test(auditId) || !Number.isInteger(itemNo) || itemNo < 1 || requirement.length < 3) return qmsError('Audit, redni broj i zahtjev su obavezni.', 422, requestId)
  const created = await db.execute(sql`insert into qms_audit_checklist (workspace_id, audit_id, item_no, requirement, created_by) values (${context.workspaceId}::uuid, ${auditId}::uuid, ${itemNo}, ${requirement}, ${context.user.id}::uuid) returning *`)
  return NextResponse.json({ checklistItem: created.rows[0], requestId }, { status: 201 })
}

export async function PATCH(request: Request) {
  const context = await getQmsContext(request)
  const requestId = context?.requestId ?? request.headers.get('x-request-id') ?? crypto.randomUUID()
  if (!context) return qmsError('Prijava je obavezna.', 401, requestId)
  if (!context.workspaceId || !can(context.role, 'edit')) return qmsError('Nemate dozvolu za checklist.', 403, requestId)
  const body = await request.json().catch(() => ({})) as Record<string, unknown>
  const id = typeof body.id === 'string' ? body.id : ''
  const result = typeof body.result === 'string' ? body.result : ''
  const evidence = typeof body.evidence === 'string' ? body.evidence.slice(0, 3000) : null
  const notes = typeof body.notes === 'string' ? body.notes.slice(0, 3000) : null
  if (!/^[0-9a-f-]{36}$/i.test(id) || !results.includes(result)) return qmsError('Neispravan checklist rezultat.', 422, requestId)
  const updated = await db.execute(sql`update qms_audit_checklist set result = ${result}, evidence = coalesce(${evidence}, evidence), notes = coalesce(${notes}, notes), updated_at = now() where id = ${id}::uuid and workspace_id = ${context.workspaceId}::uuid returning *`)
  if (!updated.rows[0]) return qmsError('Checklist stavka nije pronađena.', 404, requestId)
  return NextResponse.json({ checklistItem: updated.rows[0], requestId })
}
