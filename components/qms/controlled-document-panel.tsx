'use client'

import { Download, GitCompare, History } from 'lucide-react'

type DocumentRow = { id: string; title: string; code: string; type: string; status: string; version?: string | null; updated_at: string }

type Props = {
  documents: DocumentRow[]
  loading: boolean
  onHistory: (document: DocumentRow) => void
  onAdvance: (document: DocumentRow, status: string) => void
  onExport: (document: DocumentRow) => void
}

const nextStatus: Record<string, { label: string; status: string }> = {
  draft: { label: 'Pošalji na pregled', status: 'in_review' },
  in_review: { label: 'Odobri', status: 'approved' },
  approved: { label: 'Objavi', status: 'published' },
  published: { label: 'Povuci', status: 'obsolete' },
}

export function ControlledDocumentPanel({ documents, loading, onHistory, onAdvance, onExport }: Props) {
  return <section className="border border-[#dfe3e8] bg-white p-5 dark:border-[#2a2e33] dark:bg-[#191c20]">
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-sm font-bold">Kontrolisani registar</h2><p className="mt-1 text-xs text-[#89919a]">Verzije, statusi i sljedivost dokumenata iz QMS baze.</p></div><span className="text-xs font-bold text-[#65707b]">{documents.length} zapisa</span></div>
    {loading ? <div className="py-8 text-center text-xs text-[#89919a]">Učitavanje registra…</div> : documents.length === 0 ? <div className="border-t border-[#edf0f2] py-8 text-center text-xs text-[#89919a]">Nema dokumenata u ovom workspace-u.</div> : <div className="space-y-3">{documents.map((document) => { const action = nextStatus[document.status]; return <article key={document.id} className="border-t border-[#edf0f2] pt-3 dark:border-[#2a2e33]"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="text-[10px] font-bold uppercase tracking-wide text-[#c91829]">{document.code} · {document.type}</div><h3 className="mt-1 text-sm font-bold">{document.title}</h3><p className="mt-1 text-xs text-[#89919a]">Verzija {document.version ?? '—'} · ažurirano {new Date(document.updated_at).toLocaleDateString('bs-BA')}</p></div><span className="bg-[#eef7f1] px-2 py-1 text-[10px] font-bold uppercase text-[#247a45]">{document.status}</span></div><div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={() => onHistory(document)} className="inline-flex items-center gap-1 border border-[#dfe3e8] px-2.5 py-1.5 text-[10px] font-bold dark:border-[#343a41]"><History size={13} /> Historija</button>{action && <button type="button" onClick={() => onAdvance(document, action.status)} className="border border-[#e21b2d] px-2.5 py-1.5 text-[10px] font-bold text-[#c91829]">{action.label}</button>}<button type="button" onClick={() => onExport(document)} className="inline-flex items-center gap-1 bg-[#20242a] px-2.5 py-1.5 text-[10px] font-bold text-white"><Download size={13} /> Kontrolisani izvoz</button><button type="button" disabled className="inline-flex items-center gap-1 border border-[#dfe3e8] px-2.5 py-1.5 text-[10px] font-bold text-[#89919a] dark:border-[#343a41]" title="Poređenje se bira iz historije verzija"><GitCompare size={13} /> Poredi verzije</button></div></article> })}</div>}
  </section>
}
