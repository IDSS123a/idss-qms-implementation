import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'
import { can } from '@/lib/rbac'
import { getQmsContext } from '@/lib/qms-auth'
import { qmsError } from '@/lib/qms-http'

export async function PATCH(request: Request) {
  const context = await getQmsContext(request)
  const requestId = context?.requestId ?? request.headers.get('x-request-id') ?? crypto.randomUUID()
  if (!context) return qmsError('Prijava je obavezna.', 401, requestId)
  if (!context.workspaceId || !can(context.role, 'edit')) return qmsError('Nemate dozvolu za obuku.', 403, requestId)
  const body = await request.json().catch(() => ({})) as Record<string, unknown>
  const id = typeof body.id === 'string' ? body.id : ''
  const attendanceConfirmed = body.attendanceConfirmed === true
  const competencyConfirmed = body.competencyConfirmed === true
  const assessmentResult = typeof body.assessmentResult === 'string' ? body.assessmentResult.trim().slice(0, 500) : null
  const evidence = typeof body.evidence === 'string' ? body.evidence.trim().slice(0, 2000) : null
  if (!/^[0-9a-f-]{36}$/i.test(id) || !assessmentResult) return qmsError('Obuka i rezultat testa su obavezni.', 422, requestId)
  const status = attendanceConfirmed && competencyConfirmed ? 'completed' : 'in_progress'
  const updated = await db.execute(sql`update qms_training set attendance_confirmed = ${attendanceConfirmed}, competency_confirmed = ${competencyConfirmed}, assessment_result = ${assessmentResult}, evidence = coalesce(${evidence}, evidence), completed_at = case when ${status} = 'completed' then now() else completed_at end, status = ${status}, updated_at = now() where id = ${id}::uuid and workspace_id = ${context.workspaceId}::uuid returning id, reference, title, status, attendance_confirmed, competency_confirmed, assessment_result, completed_at, evidence`)
  if (!updated.rows[0]) return qmsError('Obuka nije pronađena.', 404, requestId)
  await db.execute(sql`insert into qms_audit_event (workspace_id, user_id, action, entity_type, entity_id, metadata) values (${context.workspaceId}::uuid, ${context.user.id}::uuid, 'complete', 'training', ${id}::uuid, ${JSON.stringify({ attendanceConfirmed, competencyConfirmed, assessmentResult })}::jsonb)`)
  return NextResponse.json({ training: updated.rows[0], requestId })
}
