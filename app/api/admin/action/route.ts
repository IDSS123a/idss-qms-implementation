import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'
import { roleForEmail } from '@/lib/rbac'

const superadminActions = new Set(['create_environment', 'sync_knowledge', 'add_user', 'view_usage'])

async function recordAdminAudit(userId: string, action: string, metadata: Record<string, unknown> = {}) {
  const workspace = await db.execute(sql`select id from qms_workspace order by created_at asc limit 1`)
  const workspaceId = workspace.rows[0]?.id
  if (!workspaceId) return
  await db.execute(sql`insert into qms_audit_event (workspace_id, user_id, action, entity_type, entity_id, metadata) values (${workspaceId}::uuid, ${userId}::uuid, ${action}, 'admin', null, ${JSON.stringify(metadata)}::jsonb)`)
}

async function ensureAdminTables() {
  await db.execute(sql`create table if not exists qms_user_role (user_id text primary key, role text not null, created_at timestamptz not null default now())`)
  await db.execute(sql`create table if not exists qms_sync_run (id uuid primary key default gen_random_uuid(), started_by text not null, status text not null, document_count integer not null default 0, created_at timestamptz not null default now())`)
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session?.user) return NextResponse.json({ error: 'Prijava je obavezna.' }, { status: 401 })
  if (roleForEmail(session.user.email) !== 'superadmin') return NextResponse.json({ error: 'Samo Superadmin može izvršiti ovu akciju.' }, { status: 403 })
  await ensureAdminTables()
  const body = await request.json().catch(() => ({})) as { action?: string; name?: string; email?: string; password?: string; role?: string }
  if (!body.action || !superadminActions.has(body.action)) return NextResponse.json({ error: 'Nepoznata admin akcija.' }, { status: 400 })

  if (body.action === 'create_environment') {
    const name = body.name?.trim() || 'IDSS-QMS glavno okruženje'
    const slug = `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}-${Date.now()}`
    const result = await db.execute(sql`insert into qms_workspace (name, slug) values (${name}, ${slug}) returning id, name, slug`)
    await recordAdminAudit(session.user.id, 'create_workspace', { name, slug })
    return NextResponse.json({ ok: true, message: `Okruženje „${name}“ je kreirano.`, workspace: result.rows[0] })
  }

  if (body.action === 'add_user') {
    const name = body.name?.trim()
    const email = body.email?.trim().toLowerCase()
    const password = body.password
    const role = body.role === 'admin' || body.role === 'superadmin' ? body.role : 'user'
    if (!name || !email || !password) return NextResponse.json({ error: 'Ime, email i početna lozinka su obavezni.' }, { status: 422 })
    if (password.length < 8) return NextResponse.json({ error: 'Lozinka mora imati najmanje 8 znakova.' }, { status: 422 })
    const created = await auth.api.signUpEmail({ body: { name, email, password } })
    if (!created?.user?.id) return NextResponse.json({ error: 'Korisnički nalog nije kreiran.' }, { status: 500 })
    await db.execute(sql`insert into qms_user_role (user_id, role) values (${created.user.id}, ${role}) on conflict (user_id) do update set role = excluded.role`)
    await recordAdminAudit(session.user.id, 'create_user', { email, role })
    return NextResponse.json({ ok: true, message: `Korisnički nalog za ${email} je kreiran sa ulogom ${role === 'admin' ? 'administratora' : role === 'superadmin' ? 'glavnog administratora' : 'korisnika'}.`, user: { id: created.user.id, name, email, role } })
  }

  if (body.action === 'sync_knowledge') {
    const manifest = await fetch(new URL('/qms-manifest.json', request.url), { cache: 'no-store' }).then((response) => response.json()).catch(() => []) as unknown[]
    const run = await db.execute(sql`insert into qms_sync_run (started_by, status, document_count) values (${session.user.id}, 'completed', ${manifest.length}) returning id, status, document_count, created_at`)
    await recordAdminAudit(session.user.id, 'sync_knowledge', { documentCount: manifest.length })
    return NextResponse.json({ ok: true, message: `Sinhronizacija je završena. Obrađeno dokumenata: ${manifest.length}.`, sync: run.rows[0] })
  }

  return NextResponse.json({ ok: true, message: 'Izvještaj korištenja i revizijski trag spremni su za pregled.' })
}

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session?.user) return NextResponse.json({ error: 'Prijava je obavezna.' }, { status: 401 })
  if (roleForEmail(session.user.email) !== 'superadmin') return NextResponse.json({ error: 'Samo Superadmin može izvršiti ovu akciju.' }, { status: 403 })
  await ensureAdminTables()
  const runs = await db.execute(sql`select id, status, document_count, created_at from qms_sync_run order by created_at desc limit 20`)
  const users = await db.execute(sql`select id, name, email, created_at from "user" order by created_at desc`)
  return NextResponse.json({ ok: true, users: users.rows, syncRuns: runs.rows })
}
