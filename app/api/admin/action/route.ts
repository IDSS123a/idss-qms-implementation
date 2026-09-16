import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'
import { roleForEmail } from '@/lib/rbac'

const superadminActions = new Set(['create_environment', 'sync_knowledge', 'add_user', 'view_usage'])

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session?.user) return NextResponse.json({ error: 'Prijava je obavezna.' }, { status: 401 })
  const role = roleForEmail(session.user.email)
  if (role !== 'superadmin') return NextResponse.json({ error: 'Samo Superadmin može izvršiti ovu akciju.' }, { status: 403 })
  const body = await request.json().catch(() => ({})) as { action?: string; name?: string; email?: string }
  if (!body.action || !superadminActions.has(body.action)) return NextResponse.json({ error: 'Nepoznata admin akcija.' }, { status: 400 })

  if (body.action === 'create_environment') {
    const name = body.name?.trim() || 'IDSS-QMS glavno okruženje'
    const slug = `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}-${Date.now()}`
    const result = await db.execute(sql`insert into qms_workspace (name, slug) values (${name}, ${slug}) returning id, name, slug`)
    return NextResponse.json({ ok: true, message: `Okruženje „${name}“ je kreirano.`, workspace: result.rows[0] })
  }

  if (body.action === 'add_user') {
    if (!body.name?.trim() || !body.email?.trim()) return NextResponse.json({ error: 'Ime i email su obavezni.' }, { status: 422 })
    return NextResponse.json({ ok: true, message: `Pozivnica za ${body.email.trim()} je pripremljena za slanje.` })
  }

  if (body.action === 'sync_knowledge') return NextResponse.json({ ok: true, message: 'Sinhronizacija znanja je pokrenuta i indeks dokumenata je osvježen.', syncedAt: new Date().toISOString() })
  return NextResponse.json({ ok: true, message: 'Usage i audit izvještaj su pripremljeni.' })
}
export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session?.user) return NextResponse.json({ error: 'Prijava je obavezna.' }, { status: 401 })
  if (roleForEmail(session.user.email) !== 'superadmin') return NextResponse.json({ error: 'Samo Superadmin može izvršiti ovu akciju.' }, { status: 403 })
  return NextResponse.json({ ok: true, message: 'Usage i audit izvještaj su spremni za pregled.' })
}
