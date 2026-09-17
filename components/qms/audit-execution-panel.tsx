'use client'

import { useState } from 'react'

type Item = { id: string; item_no: number; requirement: string; result: string; evidence?: string | null; notes?: string | null }

export function AuditExecutionPanel({ auditId }: { auditId?: string }) {
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const load = async () => { if (!auditId) return; setLoading(true); setError(''); try { const response = await fetch(`/api/qms/audits/checklist?auditId=${encodeURIComponent(auditId)}`); const data = await response.json(); if (!response.ok) throw new Error(data.error); setItems(data.checklist ?? []) } catch (value) { setError(value instanceof Error ? value.message : 'Checklist nije dostupna.') } finally { setLoading(false) } }
  const update = async (id: string, result: string) => { const response = await fetch('/api/qms/audits/checklist', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id, result }) }); if (!response.ok) return; setItems((current) => current.map((item) => item.id === id ? { ...item, result } : item)) }
  return <section className="border border-[#dfe3e8] bg-white p-5 dark:border-[#2a2e33] dark:bg-[#191c20]"><div className="flex items-center justify-between gap-3"><div><h2 className="text-sm font-bold">Audit checklist</h2><p className="mt-1 text-xs text-[#89919a]">Dokaz, nalaz i rezultat po kriteriju audita.</p></div><button type="button" onClick={load} className="border border-[#dfe3e8] px-3 py-2 text-xs font-bold">Učitaj</button></div>{loading ? <p className="mt-4 text-xs text-[#89919a]">Učitavanje…</p> : error ? <p role="alert" className="mt-4 text-xs text-[#c91829]">{error}</p> : <div className="mt-4 space-y-2">{items.length === 0 ? <p className="text-xs text-[#89919a]">Nema checklist stavki za izabrani audit.</p> : items.map((item) => <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 border-t border-[#edf0f2] pt-3 text-xs"><span className="min-w-0 flex-1"><b>{item.item_no}.</b> {item.requirement}</span><select aria-label={`Rezultat stavke ${item.item_no}`} value={item.result} onChange={(event) => update(item.id, event.target.value)} className="border border-[#c7cdd3] bg-transparent px-2 py-1"><option value="pending">Na čekanju</option><option value="conforming">Usklađeno</option><option value="nonconforming">Nesukladnost</option><option value="not_applicable">Nije primjenjivo</option></select></div>)}</div>}</section>
}
