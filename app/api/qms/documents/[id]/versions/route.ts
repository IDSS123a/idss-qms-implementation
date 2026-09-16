import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'
import { can, roleForEmail, type QmsRole } from '@/lib/rbac'

export const runtime = 'nodejs'

async function getContext(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session?.user) return null
  const workspace = await db.execute(sql`select id from qms_workspace order by created_at asc limit 1`)
  const storedRole = await db.execute(sql`select role from qms_user_role where user_id = ${session.user.id}::uuid limit 1`)
  const candidate = String(storedRole.rows[0]?.role ?? roleForEmail(session.user.email))
  const role = (['superadmin', 'admin', 'user'].includes(candidate) ? candidate : 'user') as QmsRole
  return { user: session.user, role, workspaceId: workspace.rows[0]?.id as string | undefined }
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getContext(request)
  if (!context) return NextResponse.json({ error: 'Prijava je obavezna.' }, { status: 401 })
  if (!context.workspaceId || !can(context.role, 'view')) return NextResponse.json({ error: 'Nemate dozvolu za pregled verzija.' }, { status: 403 })
  const { id } = await params
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: 'Neispravan ID dokumenta.' }, { status: 422 })
  const versions = await db.execute(sql`select id, document_id, version, status, title, change_reason, effective_date, next_review_date, created_by, created_at from qms_document_version where document_id = ${id}::uuid and workspace_id = ${context.workspaceId}::uuid order by created_at desc`)
  return NextResponse.json({ versions: versions.rows })
}
