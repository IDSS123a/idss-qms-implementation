export type QmsRole = 'superadmin' | 'admin' | 'user'

export const ROLE_LABELS: Record<QmsRole, string> = {
  superadmin: 'Superadmin',
  admin: 'Admin',
  user: 'Korisnik',
}

export const ROLE_PERMISSIONS: Record<QmsRole, string[]> = {
  superadmin: ['all'],
  admin: ['view', 'create', 'edit', 'export', 'manage_users', 'view_statistics'],
  user: ['view', 'create', 'export'],
}

export const QMS_PEOPLE = [
  { name: 'Direktor', email: 'direktor@idss.ba', role: 'superadmin' as const },
  { name: 'Azra Morić', email: 'info-mejtas@montessorihouse.ba', role: 'admin' as const },
  { name: 'Medina Karaga', email: 'psiholog@idss.ba', role: 'user' as const },
  { name: 'Adnana Agić', email: 'pedagog@idss.ba', role: 'user' as const },
  { name: 'Anesa Karaman', email: 'info@idss.ba', role: 'user' as const },
  { name: 'Azra Rahmanović', email: 'financije@idss.ba', role: 'user' as const },
]

export function roleForEmail(email?: string | null): QmsRole {
  const match = QMS_PEOPLE.find((person) => person.email.toLowerCase() === email?.toLowerCase())
  return match?.role ?? 'user'
}

export function permissionsForRole(role: QmsRole) {
  return ROLE_PERMISSIONS[role]
}

export function can(role: QmsRole, permission: string) {
  return role === 'superadmin' || ROLE_PERMISSIONS[role].includes(permission)
}
