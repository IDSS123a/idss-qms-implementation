import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { QMS_PEOPLE, ROLE_LABELS, roleForEmail } from '@/lib/rbac'

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return NextResponse.json({ user: null, people: QMS_PEOPLE })

  const role = roleForEmail(session.user.email)
  return NextResponse.json({
    user: { id: session.user.id, name: session.user.name, email: session.user.email, role, roleLabel: ROLE_LABELS[role] },
    people: QMS_PEOPLE,
  })
}
