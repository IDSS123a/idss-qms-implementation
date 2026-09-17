"use client"

export function AiActionChips({ onSelect }: { onSelect: (prompt: string) => void }) {
  const actions = [
    ['Pripremi nacrt procedure', 'Pripremi NACRT ZA PREGLED procedure na osnovu dostupnih QMS izvora. Prvo navedi nedostajuće podatke.'],
    ['Dodaj prateće obrasce', 'Predloži kompletan paket pratećih obrazaca, kontrolnih lista i registara za traženu proceduru, uz citate izvora.'],
    ['Provjeri prema QP primjerima', 'Provjeri traženi nacrt prema dostupnim QP primjerima i navedi samo potvrđene razlike i otvorena pitanja.'],
  ] as const
  return <div className="flex flex-wrap gap-2 border-b border-[#edf0f2] pb-3 dark:border-[#2a2e33]">{actions.map(([label, prompt]) => <button key={label} type="button" onClick={() => onSelect(prompt)} className="border border-[#c7cdd3] px-2.5 py-1.5 text-[10px] font-bold text-[#65707b] transition-colors hover:border-[#e21b2d] hover:text-[#c91829] focus:outline-none focus:ring-2 focus:ring-[#e21b2d]/30 dark:border-[#343a41] dark:text-[#b8c0c8]">{label}</button>)}</div>
}
