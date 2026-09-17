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
  const documentId = new URL(request.url).searchParams.get('documentId')
  if (!documentId) return qmsError('Dokument je obavezan.', 422, requestId)
  const result = await db.execute(sql`select * from qms_approval_step where workspace_id = ${context.workspaceId}::uuid and document_id = ${documentId}::uuid order by step_order asc`)
  return NextResponse.json({ approvals: result.rows, requestId }, { headers: { 'x-request-id': requestId } })
}

export async function POST(request: Request) {
  const requestId = request.headers.get('x-request-id') || crypto.randomUUID()
  const context = await getQmsContext(request)
  if (!context) return qmsError('Prijava je obavezna.', 401, requestId)
  if (!context.workspaceId) return qmsError('Workspace nije konfigurisan.', 400, requestId)
  if (!['admin', 'superadmin'].includes(context.role)) return qmsError('Samo administrator može postaviti odobrenja.', 403, requestId)
  const body = await request.json().catch(() => ({}))
  const documentId = String(body.documentId || '')
  const versionId = String(body.versionId || '')
  const approvers = Array.isArray(body.approvers) ? body.approvers.filter((id: unknown): id is string => typeof id === 'string') : []
  if (!documentId || !versionId || approvers.length === 0) return qmsError('Dokument, verzija i najmanje jedan odobravatelj su obavezni.', 422, requestId)
  const mode = body.mode === 'parallel' ? 'parallel' : 'sequential'
  for (const [index, approverId] of approvers.entries()) await db.execute(sql`insert into qms_approval_step (workspace_id, document_id, version_id, step_order, approver_id, mode, created_by) values (${context.workspaceId}::uuid, ${documentId}::uuid, ${versionId}::uuid, ${index + 1}, ${approverId}::uuid, ${mode}, ${context.user.id}::uuid)`)
  await db.execute(sql`insert into qms_audit_event (workspace_id, user_id, action, entity_type, entity_id, request_id, reason, metadata) values (${context.workspaceId}::uuid, ${context.user.id}::uuid, 'submit_approval', 'document', ${documentId}::uuid, ${requestId}, ${String(body.reason || 'Postavljen approval workflow')}, ${JSON.stringify({ mode, approverCount: approvers.length })}::jsonb)`)
  return NextResponse.json({ ok: true, requestId }, { status: 201 })
}

export async function PATCH(request: Request) {
  const requestId = request.headers.get('x-request-id') || crypto.randomUUID()
  const context = await getQmsContext(request)
  if (!context) return qmsError('Prijava je obavezna.', 401, requestId)
  if (!context.workspaceId) return qmsError('Workspace nije konfigurisan.', 400, requestId)
  const body = await request.json().catch(() => ({}))
  const id = String(body.id || '')
  const decision = String(body.decision || '')
  if (!id || !['approve', 'reject', 'delegate'].includes(decision)) return qmsError('Neispravna approval odluka.', 422, requestId)
  const reason = String(body.reason || '')
  if (decision === 'reject' && reason.length < 3) return qmsError('Odbijanje mora imati razlog.', 422, requestId)
  const step = await db.execute(sql`select * from qms_approval_step where id = ${id}::uuid and workspace_id = ${context.workspaceId}::uuid limit 1`)
  const current = step.rows[0] as { approver_id: string; status: string; document_id: string } | undefined
  if (!current) return qmsError('Approval korak nije pronađen.', 404, requestId)
  if (current.approver_id !== context.user.id && !['admin', 'superadmin'].includes(context.role)) return qmsError('Niste ovlašteni za ovaj korak.', 403, requestId)
  const status = decision === 'delegate' ? 'delegated' : decision === 'approve' ? 'approved' : 'rejected'
  await db.execute(sql`update qms_approval_step set status = ${status}, decision = ${decision}, reason = ${reason || null}, delegated_to = ${decision === 'delegate' ? String(body.delegatedTo || '') || null : null}::uuid, decided_at = now() where id = ${id}::uuid and workspace_id = ${context.workspaceId}::uuid`)
  await db.execute(sql`insert into qms_audit_event (workspace_id, user_id, action, entity_type, entity_id, request_id, reason, metadata) values (${context.workspaceId}::uuid, ${context.user.id}::uuid, ${decision}, 'approval_step', ${id}::uuid, ${requestId}, ${reason || null}, ${JSON.stringify({ documentId: current.document_id })}::jsonb)`)
  return NextResponse.json({ ok: true, status, requestId }, { headers: { 'x-request-id': requestId } })
}
