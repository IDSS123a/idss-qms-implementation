'use client'

import { useEffect, useState } from 'react'

type Analytics = { capa: Array<{ status: string; count: number }>; risks: Array<{ likelihood: number; impact: number; count: number }>; aging: Array<{ bucket: string; count: number }> }

export function CapaRiskPanel() {
  const [data, setData] = useState<Analytics | null>(null)
  useEffect(() => { fetch('/api/qms/analytics').then((response) => response.ok ? response.json() : null).then((value) => setData(value?.analytics ?? null)).catch(() => setData(null)) }, [])
  const totalRisks = data?.risks.reduce((sum, item) => sum + item.count, 0) ?? 0
  const maxRisk = Math.max(...(data?.risks.map((item) => item.count) ?? [1]), 1)
  return <section className="mt-5 grid gap-5 xl:grid-cols-[1fr_1fr]">
    <div className="border border-[#dfe3e8] bg-white p-5 dark:border-[#2a2e33] dark:bg-[#191c20]"><div className="flex items-center justify-between"><div><h2 className="text-sm font-bold">CAPA aging i trend</h2><p className="mt-1 text-xs text-[#89919a]">Otvorene mjere prema roku</p></div><span className="text-xs font-bold text-[#c91829]">{data?.capa.reduce((sum, item) => sum + item.count, 0) ?? '—'} ukupno</span></div><div className="mt-5 grid grid-cols-3 gap-2">{['overdue', 'next_30_days', 'later'].map((bucket) => { const item = data?.aging.find((entry) => entry.bucket === bucket); return <div key={bucket} className="border border-[#edf0f2] p-3 dark:border-[#2a2e33]"><div className="text-lg font-bold">{item?.count ?? 0}</div><div className="mt-1 text-[10px] font-bold uppercase tracking-wide text-[#89919a]">{bucket === 'overdue' ? 'Zakašnjelo' : bucket === 'next_30_days' ? '30 dana' : 'Kasnije'}</div></div> })}</div></div>
    <div className="border border-[#dfe3e8] bg-white p-5 dark:border-[#2a2e33] dark:bg-[#191c20]"><div className="flex items-center justify-between"><div><h2 className="text-sm font-bold">Heatmap rizika</h2><p className="mt-1 text-xs text-[#89919a]">Vjerovatnoća × posljedica</p></div><span className="text-xs font-bold text-[#65707b]">{totalRisks} rizika</span></div><div className="mt-5 grid grid-cols-5 gap-1">{[5,4,3,2,1].flatMap((likelihood) => [1,2,3,4,5].map((impact) => { const item = data?.risks.find((entry) => Number(entry.likelihood) === likelihood && Number(entry.impact) === impact); const count = item?.count ?? 0; const intensity = Math.min(90, 12 + Math.round((count / maxRisk) * 78)); return <div key={`${likelihood}-${impact}`} title={`Vjerovatnoća ${likelihood}, posljedica ${impact}: ${count}`} className="flex aspect-square items-center justify-center text-[10px] font-bold" style={{ backgroundColor: `hsl(${Math.max(0, 120 - likelihood * impact * 4)} 72% ${100 - intensity / 2}%)` }}>{count || ''}</div> }))}</div><div className="mt-2 flex justify-between text-[10px] text-[#89919a]"><span>Niži rizik</span><span>Viši rizik</span></div></div>
  </section>
}
