type DashboardMetricsValue = {
  documents: number
  openTasks: number
  overdueTasks: number
  approvedDocuments: number
  activeCapa: number
  openRisks: number
}

export function DashboardMetrics({ metrics }: { metrics: DashboardMetricsValue | null }) {
  const cards = [
    ['Dokumenti', metrics?.documents ?? 0, 'Ukupno u QMS registru'],
    ['Otvoreni zadaci', metrics?.openTasks ?? 0, 'Aktivne obaveze'],
    ['Zakašnjeli rokovi', metrics?.overdueTasks ?? 0, 'Potrebna pažnja'],
    ['Odobreni dokumenti', metrics?.approvedDocuments ?? 0, 'Odobreno ili objavljeno'],
    ['Aktivni CAPA', metrics?.activeCapa ?? 0, 'Korektivne mjere'],
    ['Otvoreni rizici', metrics?.openRisks ?? 0, 'Registar rizika'],
  ] as const

  return <section aria-label="QMS pokazatelji" className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
    {cards.map(([label, value, description]) => <article key={label} className="border border-[#dfe3e8] bg-white p-4 dark:border-[#2a2e33] dark:bg-[#191c20]"><div className="text-[10px] font-bold uppercase tracking-[.12em] text-[#89919a]">{label}</div><div className="mt-2 text-2xl font-bold tracking-tight">{value}</div><div className="mt-1 text-xs text-[#89919a]">{description}</div></article>)}
  </section>
}
