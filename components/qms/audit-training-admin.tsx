'use client'

import { useEffect, useState } from 'react'
import { AuditExecutionPanel } from '@/components/qms/audit-execution-panel'

type Audit = { id: string; reference: string; title: string; status: string; planned_date?: string | null; conclusion?: string | null }
type Training = { id: string; reference: string; title: string; status: string; due_date?: string | null; attendance_confirmed: boolean; competency_confirmed: boolean; assessment_result?: string | null }

export function AuditTrainingAdmin() {
  const [audits, setAudits] = useState<Audit[]>([])
  const [trainings, setTrainings] = useState<Training[]>([])
  const [selectedAudit, setSelectedAudit] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const [auditsResponse, trainingResponse] = await Promise.all([fetch('/api/qms/audits'), fetch('/api/qms/training')])
      const auditsValue = await auditsResponse.json()
      const trainingValue = await trainingResponse.json()
      setAudits(auditsValue.audits ?? [])
      setTrainings(trainingValue.trainings ?? [])
      if (!selectedAudit && auditsValue.audits?.[0]) setSelectedAudit(auditsValue.audits[0].id)
    } catch { setMessage('Podaci audita i obuka nisu dostupni.') } finally { setLoading(false) }
  }

  useEffect(() => { void load() }, [])

  const completeTraining = async (training: Training) => {
    const response = await fetch('/api/qms/training/complete', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: training.id, attendanceConfirmed: true, competencyConfirmed: true, assessmentResult: 'Potvrđeno u administraciji' }) })
    if (!response.ok) { setMessage('Obuku nije moguće završiti.'); return }
    setMessage(`Obuka ${training.reference} je završena.`)
    void load()
  }

  return <section className="mt-5 space-y-5" aria-label="Administracija audita i obuka">
    <div className="grid gap-5 lg:grid-cols-2">
      <div className="border border-[#d9dee4] bg-white p-5 dark:border-[#343a41] dark:bg-[#191c20]"><div className="text-[11px] font-bold uppercase tracking-[.15em] text-[#e21b2d]">Audit izvršenje</div><div className="mt-1 flex items-center justify-between gap-3"><h2 className="text-lg font-bold">Planovi i checklist</h2><button type="button" onClick={() => void load()} className="border border-[#c7cdd3] px-3 py-2 text-xs font-bold">Osvježi</button></div>{loading ? <p className="mt-4 text-xs text-[#89919a]">Učitavanje…</p> : <><label className="mt-4 block text-xs font-bold" htmlFor="audit-select">Izabrani audit</label><select id="audit-select" value={selectedAudit} onChange={(event) => setSelectedAudit(event.target.value)} className="mt-2 w-full border border-[#c7cdd3] bg-transparent px-3 py-2 text-xs"><option value="">Odaberite audit</option>{audits.map((audit) => <option key={audit.id} value={audit.id}>{audit.reference} · {audit.title} · {audit.status}</option>)}</select><div className="mt-3 text-xs text-[#747d87]">{audits.length} planiranih audita. Checklist se izvršava za izabrani audit.</div></>}</div>
      <div className="border border-[#d9dee4] bg-white p-5 dark:border-[#343a41] dark:bg-[#191c20]"><div className="text-[11px] font-bold uppercase tracking-[.15em] text-[#e21b2d]">Obuke</div><h2 className="mt-1 text-lg font-bold">Potvrda kompetentnosti</h2>{trainings.length === 0 ? <p className="mt-4 text-xs text-[#89919a]">Nema dodijeljenih obuka.</p> : <div className="mt-4 space-y-2">{trainings.slice(0, 6).map((training) => <div key={training.id} className="border-t border-[#eef0f2] pt-3 text-xs"><div className="flex items-center justify-between gap-3"><div><b>{training.reference}</b> · {training.title}<div className="mt-1 text-[#89919a]">Status: {training.status} · Prisustvo: {training.attendance_confirmed ? 'da' : 'ne'} · Kompetencija: {training.competency_confirmed ? 'da' : 'ne'}</div></div>{training.status !== 'completed' && <button type="button" onClick={() => void completeTraining(training)} className="shrink-0 bg-[#e21b2d] px-3 py-2 text-[10px] font-bold text-white">Završi</button>}</div></div>)}</div>}{message && <p role="status" className="mt-3 text-xs text-[#c91829]">{message}</p>}</div>
    </div>
    {selectedAudit && <AuditExecutionPanel auditId={selectedAudit} />}
  </section>
}
