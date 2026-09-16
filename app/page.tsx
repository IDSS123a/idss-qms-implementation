'use client'

import { useMemo, useState } from 'react'
import {
  Bell,
  BookOpen,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  FileCheck2,
  FileText,
  Gauge,
  Globe2,
  LayoutDashboard,
  Menu,
  MoreHorizontal,
  Plus,
  Search,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Sun,
  Users,
  X,
} from 'lucide-react'

const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard },
  { label: 'Document Control', icon: FileText, active: true, count: 128 },
  { label: 'Nonconformities & CAPA', icon: ClipboardCheck, count: 7 },
  { label: 'Internal Audits', icon: ShieldCheck },
  { label: 'Training', icon: BookOpen },
  { label: 'Equipment', icon: Gauge },
  { label: 'Management Review', icon: FileCheck2 },
]

const documents = [
  { id: 'QP-03', title: 'Documented Information Control', type: 'Procedure', owner: 'Quality Management', version: '04', status: 'Approved', date: '08 Sep 2026', color: 'cyan' },
  { id: 'QP-01', title: 'Quality Management System Manual', type: 'Manual', owner: 'Amina Hadžić', version: '03', status: 'Approved', date: '02 Sep 2026', color: 'cyan' },
  { id: 'WI-07', title: 'Incoming Material Inspection', type: 'Work instruction', owner: 'Production', version: '02', status: 'In review', date: '31 Aug 2026', color: 'yellow' },
  { id: 'FM-12', title: 'Corrective Action Request', type: 'Form', owner: 'Quality Management', version: '01', status: 'Draft', date: '28 Aug 2026', color: 'gray' },
  { id: 'QP-08', title: 'Internal Audit Procedure', type: 'Procedure', owner: 'Amina Hadžić', version: '02', status: 'Approved', date: '21 Aug 2026', color: 'cyan' },
]

function StatusBadge({ status }: { status: string }) {
  const styles = {
    Approved: 'bg-[#e8f8f7] text-[#087f78] dark:bg-[#073f3c] dark:text-[#62d9d1]',
    'In review': 'bg-[#fff6d8] text-[#9b6d00] dark:bg-[#473a08] dark:text-[#f6d56b]',
    Draft: 'bg-[#eef0f3] text-[#5e6873] dark:bg-[#2e3339] dark:text-[#b8c0ca]',
  }
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${styles[status as keyof typeof styles]}`}>{status}</span>
}

export default function Page() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [query, setQuery] = useState('')
  const [language, setLanguage] = useState('BS')
  const [activeSection, setActiveSection] = useState('Document Control')
  const [showCreate, setShowCreate] = useState(false)
  const filtered = useMemo(() => documents.filter((doc) => `${doc.id} ${doc.title} ${doc.owner}`.toLowerCase().includes(query.toLowerCase())), [query])

  return (
    <div className="min-h-screen bg-[#f5f6f8] text-[#20242a] dark:bg-[#121416] dark:text-[#f4f6f8]">
      <aside className={`${sidebarOpen ? 'w-[272px]' : 'w-[76px]'} fixed inset-y-0 left-0 z-30 hidden border-r border-[#dfe3e8] bg-white transition-[width] duration-200 dark:border-[#2a2e33] dark:bg-[#191c20] lg:flex lg:flex-col`}>
        <div className="flex h-[76px] items-center gap-3 border-b border-[#edf0f2] px-5 dark:border-[#2a2e33]">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center bg-[#e21b2d] text-white"><span className="text-lg font-black tracking-[-0.14em]">ID</span></div>
          {sidebarOpen && <div><div className="text-[15px] font-bold tracking-[-0.02em]">IDSS-QMS</div><div className="text-[10px] font-medium uppercase tracking-[0.18em] text-[#7b838d]">Quality system</div></div>}
        </div>
        <div className="flex-1 px-3 py-5">
          {sidebarOpen && <div className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-[#969da6]">Workspace</div>}
          <nav className="space-y-1" aria-label="Main navigation">
            {navItems.map(({ label, icon: Icon, count }) => { const active = activeSection === label; return <button key={label} onClick={() => setActiveSection(label)} className={`group flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-[13px] font-medium transition ${active ? 'bg-[#fff0f1] text-[#d7192b] dark:bg-[#3b1d22] dark:text-[#ff7180]' : 'text-[#67707b] hover:bg-[#f4f5f7] dark:text-[#aeb6c0] dark:hover:bg-[#252a2f]'}`}><Icon size={17} strokeWidth={active ? 2.4 : 1.8} /><span className={sidebarOpen ? 'flex-1' : 'sr-only'}>{label}</span>{sidebarOpen && count && <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${active ? 'bg-[#ffd9dd] text-[#c51c2d] dark:bg-[#692730] dark:text-[#ffabb3]' : 'bg-[#eef0f3] text-[#7b838d] dark:bg-[#30353b] dark:text-[#bac1c9]'}`}>{count}</span>}</button> })}
          </nav>
          {sidebarOpen && <div className="mb-3 mt-9 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-[#969da6]">System</div>}
          <button className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-[13px] font-medium text-[#67707b] hover:bg-[#f4f5f7] dark:text-[#aeb6c0] dark:hover:bg-[#252a2f]"><Settings2 size={17} strokeWidth={1.8} /><span className={sidebarOpen ? '' : 'sr-only'}>Settings</span></button>
        </div>
        <div className="border-t border-[#edf0f2] p-3 dark:border-[#2a2e33]"><button className="flex w-full items-center gap-3 rounded-md p-2 text-left hover:bg-[#f4f5f7] dark:hover:bg-[#252a2f]"><div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#d9e7f0] text-[11px] font-bold text-[#24536b]">AH</div>{sidebarOpen && <div className="min-w-0"><div className="truncate text-[12px] font-semibold">Amina Hadžić</div><div className="truncate text-[10px] text-[#858d96]">Quality Manager</div></div>}{sidebarOpen && <ChevronDown size={14} className="ml-auto text-[#9299a1]" />}</button></div>
      </aside>

      <main className={sidebarOpen ? 'lg:pl-[272px]' : 'lg:pl-[76px]'}>
        <header className="sticky top-0 z-20 flex h-[76px] items-center justify-between border-b border-[#dfe3e8] bg-white/95 px-5 backdrop-blur dark:border-[#2a2e33] dark:bg-[#191c20]/95 lg:px-8">
          <div className="flex items-center gap-3"><button onClick={() => setSidebarOpen(!sidebarOpen)} className="hidden rounded-md p-2 text-[#68727d] hover:bg-[#f0f2f4] dark:hover:bg-[#2a2e33] lg:block" aria-label="Toggle sidebar"><Menu size={18} /></button><button className="rounded-md p-2 text-[#68727d] lg:hidden" onClick={() => setSidebarOpen(true)} aria-label="Open menu"><Menu size={18} /></button><div className="hidden items-center gap-2 text-[12px] text-[#8b939c] sm:flex"><span>Workspace</span><ChevronRight size={13} /><span className="font-semibold text-[#30363d] dark:text-[#e3e7eb]">{activeSection}</span></div></div>
          <div className="flex items-center gap-2 sm:gap-4"><button className="hidden items-center gap-2 rounded-md border border-[#dfe3e8] px-3 py-2 text-[12px] text-[#7b838d] md:flex dark:border-[#343a41]"><Search size={14} /> <span>Search anything</span><span className="ml-5 rounded border border-[#dfe3e8] px-1.5 py-0.5 text-[10px] dark:border-[#343a41]">⌘ K</span></button><button className="rounded-md p-2 text-[#68727d] hover:bg-[#f0f2f4] dark:hover:bg-[#2a2e33]" aria-label="Notifications"><Bell size={17} /></button><button onClick={() => setLanguage(language === 'BS' ? 'EN' : 'BS')} className="flex items-center gap-1 rounded-md px-2 py-2 text-[11px] font-bold text-[#53606c] hover:bg-[#f0f2f4] dark:text-[#c0c7cf] dark:hover:bg-[#2a2e33]"><Globe2 size={15} />{language}</button><button onClick={() => document.documentElement.classList.toggle('dark')} className="rounded-md p-2 text-[#68727d] hover:bg-[#f0f2f4] dark:hover:bg-[#2a2e33]" aria-label="Toggle theme"><Sun size={17} /></button></div>
        </header>
        <div className="mx-auto max-w-[1500px] p-5 lg:p-8">
          <div className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.15em] text-[#89919a]"><FileText size={13} className="text-[#e21b2d]" /> QP-03 · Documented information</div><h1 className="text-[30px] font-bold tracking-[-0.04em]">Document Control</h1><p className="mt-1 text-[13px] text-[#747d87]">Manage the controlled documents and records of your quality management system.</p></div><button onClick={() => setShowCreate(true)} className="inline-flex items-center justify-center gap-2 bg-[#e21b2d] px-4 py-2.5 text-[12px] font-bold text-white shadow-sm shadow-[#e21b2d]/20 hover:bg-[#c91829]"><Plus size={16} /> New document</button></div>
          <section className="mb-7 grid grid-cols-2 gap-3 lg:grid-cols-4"><Stat label="Total documents" value="128" detail="+6 this quarter" accent="red" /><Stat label="Approved" value="94" detail="73.4% of library" accent="cyan" /><Stat label="In review" value="11" detail="3 due this week" accent="yellow" /><Stat label="Obsolete" value="23" detail="Needs archive review" accent="gray" /></section>
          <section className="overflow-hidden border border-[#dfe3e8] bg-white dark:border-[#2a2e33] dark:bg-[#191c20]"><div className="flex flex-col justify-between gap-4 border-b border-[#edf0f2] p-4 sm:flex-row sm:items-center dark:border-[#2a2e33]"><div><h2 className="text-[15px] font-bold">Master document list</h2><p className="mt-0.5 text-[11px] text-[#89919a]">Controlled documents · Last updated today at 09:42</p></div><div className="flex items-center gap-2"><div className="flex h-9 items-center gap-2 border border-[#dfe3e8] px-3 dark:border-[#343a41]"><Search size={14} className="text-[#89919a]" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Filter documents..." className="w-full bg-transparent text-[12px] outline-none placeholder:text-[#a1a8b0] sm:w-44" /></div><button className="flex h-9 items-center gap-2 border border-[#dfe3e8] px-3 text-[12px] font-semibold text-[#68727d] dark:border-[#343a41]"><SlidersHorizontal size={14} /> <span className="hidden sm:inline">Filters</span></button></div></div><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left"><thead><tr className="border-b border-[#edf0f2] text-[10px] font-bold uppercase tracking-[0.12em] text-[#9aa1a9] dark:border-[#2a2e33]"><th className="px-5 py-3 font-bold">Document</th><th className="px-4 py-3 font-bold">Type</th><th className="px-4 py-3 font-bold">Owner</th><th className="px-4 py-3 font-bold">Version</th><th className="px-4 py-3 font-bold">Status</th><th className="px-4 py-3 font-bold">Modified</th><th className="px-4 py-3"></th></tr></thead><tbody>{filtered.map((doc) => <tr key={doc.id} className="group border-b border-[#f0f2f4] last:border-0 hover:bg-[#fafbfc] dark:border-[#2a2e33] dark:hover:bg-[#20252a]"><td className="px-5 py-4"><div className="flex items-center gap-3"><div className={`flex h-8 w-8 shrink-0 items-center justify-center border text-[9px] font-bold ${doc.color === 'cyan' ? 'border-[#a9dfdc] bg-[#edfbfa] text-[#087f78]' : doc.color === 'yellow' ? 'border-[#ecd58d] bg-[#fff9e5] text-[#9b6d00]' : 'border-[#d8dde2] bg-[#f5f6f8] text-[#6b737c]'}`}>{doc.id.split('-')[0]}</div><div><div className="text-[13px] font-semibold">{doc.title}</div><div className="mt-0.5 text-[10px] font-medium text-[#8b939c]">{doc.id}</div></div></div></td><td className="px-4 py-4 text-[12px] text-[#6c7580]">{doc.type}</td><td className="px-4 py-4 text-[12px] text-[#6c7580]">{doc.owner}</td><td className="px-4 py-4 text-[12px] font-semibold">v{doc.version}</td><td className="px-4 py-4"><StatusBadge status={doc.status} /></td><td className="px-4 py-4 text-[11px] text-[#8b939c]">{doc.date}</td><td className="px-4 py-4"><button className="rounded p-1.5 text-[#9aa1a9] opacity-0 hover:bg-[#eef0f2] group-hover:opacity-100 dark:hover:bg-[#30353b]" aria-label={`More actions for ${doc.title}`}><MoreHorizontal size={16} /></button></td></tr>)}</tbody></table>{filtered.length === 0 && <div className="p-12 text-center text-[13px] text-[#89919a]">No documents match your search.</div>}</div><div className="flex items-center justify-between border-t border-[#edf0f2] px-5 py-3 text-[11px] text-[#89919a] dark:border-[#2a2e33]"><span>Showing 1–{filtered.length} of 128 documents</span><div className="flex items-center gap-1"><button className="rounded p-1.5 hover:bg-[#eef0f2] dark:hover:bg-[#30353b]" aria-label="Previous page"><ChevronLeft size={15} /></button><span className="px-2 font-semibold text-[#4c555f] dark:text-[#d7dce1]">1</span><button className="rounded p-1.5 hover:bg-[#eef0f2] dark:hover:bg-[#30353b]" aria-label="Next page"><ChevronRight size={15} /></button></div></div></section>
        </div>
      </main>
      {showCreate && <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#101317]/40 p-4"><div className="w-full max-w-md border border-[#dfe3e8] bg-white p-6 shadow-2xl dark:border-[#343a41] dark:bg-[#191c20]"><div className="mb-5 flex items-start justify-between"><div><h2 className="text-lg font-bold">Create new document</h2><p className="mt-1 text-[12px] text-[#89919a]">Start a controlled draft for review.</p></div><button onClick={() => setShowCreate(false)} aria-label="Close dialog"><X size={18} className="text-[#89919a]" /></button></div><div className="space-y-4"><label className="block"><span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-[#6d7680]">Document title</span><input className="h-10 w-full border border-[#dfe3e8] bg-transparent px-3 text-[13px] outline-none focus:border-[#e21b2d] dark:border-[#343a41]" placeholder="e.g. Supplier evaluation procedure" /></label><label className="block"><span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-[#6d7680]">Document type</span><select className="h-10 w-full border border-[#dfe3e8] bg-transparent px-3 text-[13px] outline-none dark:border-[#343a41]"><option>Procedure</option><option>Manual</option><option>Work instruction</option><option>Form</option></select></label></div><div className="mt-6 flex justify-end gap-2"><button onClick={() => setShowCreate(false)} className="border border-[#dfe3e8] px-4 py-2 text-[12px] font-semibold dark:border-[#343a41]">Cancel</button><button onClick={() => setShowCreate(false)} className="bg-[#e21b2d] px-4 py-2 text-[12px] font-bold text-white">Create draft</button></div></div></div>}
    </div>
  )
}

function Stat({ label, value, detail, accent }: { label: string; value: string; detail: string; accent: string }) {
  const colors: Record<string, string> = { red: 'bg-[#e21b2d]', cyan: 'bg-[#11aaa5]', yellow: 'bg-[#d6a900]', gray: 'bg-[#87909a]' }
  return <div className="relative overflow-hidden border border-[#dfe3e8] bg-white p-4 dark:border-[#2a2e33] dark:bg-[#191c20]"><div className={`absolute left-0 top-0 h-full w-1 ${colors[accent]}`} /><div className="pl-2"><div className="text-[11px] font-medium text-[#858d96]">{label}</div><div className="mt-2 text-[26px] font-bold tracking-[-0.04em]">{value}</div><div className="mt-1 text-[10px] font-semibold text-[#8b939c]">{detail}</div></div></div>
}
