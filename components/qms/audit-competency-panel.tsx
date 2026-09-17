'use client'

import { useEffect, useState } from 'react'

type Competency = { id: string; role_name: string; process: string | null; competency: string; required_level: number; status: string }
type Package = { id: string; title: string; integrity_hash: string; created_at: string }

export function AuditCompetencyPanel() {
  const [competencies, setCompetencies] = useState<Competency[]>([])
  const [packages, setPackages] = useState<Package[]>([])
  useEffect(() => { Promise.all([fetch('/api/qms/competencies'), fetch('/api/qms/audit-packages')]).then(async ([a, b]) => { const [competencyData, packageData] = await Promise.all([a.json(), b.json()]); setCompetencies(competencyData.competencies ?? []); setPackages(packageData.packages ?? []) }).catch(() => undefined) }, [])
  return <section className="mt-5 grid gap-5 lg:grid-cols-2" aria-label="Auditi i kompetencije"><div className="border border-[#d9dee4] bg-white p-5"><div className="text-[11px] font-bold uppercase tracking-[.15em] text-[#e21b2d]">Kompetencije</div><h2 className="mt-1 text-lg font-bold">Matrica kompetencija</h2><div className="mt-4 space-y-2">{competencies.length ? competencies.slice(0, 6).map((item) => <div key={item.id} className="flex items-center justify-between border-t border-[#eef0f2] py-2 text-sm"><span>{item.role_name} · {item.competency}</span><span className="text-xs text-[#747d87]">Nivo {item.required_level} · {item.status}</span></div>) : <p className="mt-3 text-sm text-[#747d87]">Nema evidentiranih kompetencija.</p>}</div></div><div className="border border-[#d9dee4] bg-white p-5"><div className="text-[11px] font-bold uppercase tracking-[.15em] text-[#e21b2d]">Audit-ready</div><h2 className="mt-1 text-lg font-bold">Paketi dokaza</h2><div className="mt-4 space-y-2">{packages.length ? packages.slice(0, 6).map((item) => <div key={item.id} className="border-t border-[#eef0f2] py-2 text-sm"><div className="font-medium">{item.title}</div><div className="truncate text-xs text-[#747d87]">SHA-256: {item.integrity_hash}</div></div>) : <p className="mt-3 text-sm text-[#747d87]">Nema kreiranih audit paketa.</p>}</div></div></section>
}
