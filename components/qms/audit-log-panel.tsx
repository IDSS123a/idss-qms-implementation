'use client'

import { useEffect, useState } from 'react'

export function AuditLogPanel() {
  const [events, setEvents] = useState<Array<{ id: string; action: string; entity_type: string; user_name?: string; created_at: string; request_id?: string }>>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => { fetch('/api/qms/audit-log?limit=25').then((response) => response.ok ? response.json() : { events: [] }).then((value) => setEvents(value.events ?? [])).catch(() => setEvents([])).finally(() => setLoading(false)) }, [])
  return <section className="mt-5 border border-[#dfe3e8] bg-white p-5 dark:border-[#2a2e33] dark:bg-[#191c20]"><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-sm font-bold">Revizijski trag</h2><p className="mt-1 text-xs text-[#89919a]">Append-only događaji sa korisnikom, radnjom i request ID-em.</p></div><a href="/api/qms/audit-log?format=csv" className="border border-[#dfe3e8] px-3 py-2 text-xs font-bold dark:border-[#343a41]">CSV export</a></div>{loading ? <div className="py-6 text-xs text-[#89919a]">Učitavanje revizijskog traga…</div> : events.length === 0 ? <div className="py-6 text-xs text-[#89919a]">Nema zabilježenih događaja.</div> : <div className="overflow-x-auto"><table className="w-full min-w-[620px] text-left text-xs"><thead className="border-b border-[#edf0f2] text-[#89919a]"><tr><th className="py-2">Vrijeme</th><th>Akcija</th><th>Entitet</th><th>Korisnik</th><th>Request ID</th></tr></thead><tbody>{events.map((event) => <tr key={event.id} className="border-b border-[#edf0f2] last:border-0"><td className="py-3">{new Date(event.created_at).toLocaleString('bs-BA')}</td><td className="font-bold">{event.action}</td><td>{event.entity_type}</td><td>{event.user_name || '—'}</td><td className="font-mono text-[10px] text-[#89919a]">{event.request_id || '—'}</td></tr>)}</tbody></table></div>}</section>
}
