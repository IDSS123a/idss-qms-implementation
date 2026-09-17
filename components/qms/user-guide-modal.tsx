'use client'

import { useState } from 'react'
import { X, ChevronRight, Download, FileText, LayoutDashboard, FolderOpen, Calendar, Users, Download as DownloadIcon } from 'lucide-react'

interface GuideStep {
  id: string
  title: string
  description: string
  icon: typeof LayoutDashboard
  details: string[]
  tips?: string[]
}

const guideSteps: GuideStep[] = [
  {
    id: 'dashboard',
    title: 'Kontrolna tabla',
    description: 'Početna stranica sa pregledom svih ključnih pokazatelja',
    icon: LayoutDashboard,
    details: [
      'Prikazuje metrike sistema: broj dokumenata, otvorenih zadataka i odobrenih dokumenata',
      'Sekcija "Centar obavijesti" prikazuje nove obavijesti sa prioritetima',
      'Brzi pristup zadacima i dokumentima preko skraćenih listi',
      'Grafički prikazi rizika i CAPA aktivnosti'
    ],
    tips: [
      'Kliknite na bilo koji element da vidite više detalja',
      'Obavijesti se ažuriraju u realnom vremenu',
      'Možete filtrirati obavijesti po prioritetu'
    ]
  },
  {
    id: 'documents',
    title: 'Biblioteka dokumenata',
    description: 'Upravljanje kontrolisanim informacijama i verzijama',
    icon: FolderOpen,
    details: [
      'Pristupite svim kontrolisanim dokumentima iz ISO 9001:2015 arhive',
      'Pretraživanje i filtriranje po šifri ili nazivu dokumenta',
      'Pregledaj historiju verzija za svaki dokument',
      'Poredi razlike između verzija',
      'Kontroliši tok odobravanja (draft → in_review → approved → published)'
    ],
    tips: [
      'Koristite pretragu za brže pronalaženje dokumenata',
      'Historija verzija omogućava vraćanje na starije verzije',
      'Svaki dokument može biti preuzet u JSON formatu'
    ]
  },
  {
    id: 'tasks',
    title: 'Rokovi i zadaci',
    description: 'Upravljanje operativnim obavezama i rokovima',
    icon: Calendar,
    details: [
      'Kreirajte nove zadatke sa rokom dospijeća i prioritetom',
      'Filtrirajte zadatke po statusu (otvoreni/završeni)',
      'Sortirajte po roku ili prioritetu',
      'Označite zadatke kao završene',
      'Pratite koji su zadaci zakašnjeli',
      'Definirajte prioritete: Visok, Srednji, Nizak'
    ],
    tips: [
      'Zadaci sa visokim prioritetom i prošlim rokom su označeni crvenom bojom',
      'Srednji prioritet je standardan za rutinske zadatke',
      'Možete preuzeti sve zadatke kao kalendar ICS datoteku'
    ]
  },
  {
    id: 'admin',
    title: 'Administracija',
    description: 'Upravljanje korisnicima, ulogama i revizijskim tragom',
    icon: Users,
    details: [
      'Pregled svih korisnika i njihovih uloga (Superadmin, Admin, Korisnik)',
      'Prikaz dozvola po ulozi',
      'Revizijski trag svih aktivnosti u sistemu',
      'Upravljanje treningom i procjenom kompetencija',
      'Praćenje odobrenja dokumenata',
      'Enterprise kontrole (API ključevi, krisni backup)',
      'Pregled svih operacija po korisniku, datumu i tipu'
    ],
    tips: [
      'Samo Superadmin može pristupiti svim kontrolama',
      'Revizijski trag je nepromenljiv i koristi se za compliance',
      'Redovno pregledajte revizijski trag',
      'Enterprise funkcije se mogu deaktivirati ako nisu potrebne'
    ]
  },
  {
    id: 'exports',
    title: 'Izvoz i izvještaji',
    description: 'Generisanje i preuzimanje izvještaja',
    icon: DownloadIcon,
    details: [
      'Izvještaj o statusu QMS-a - sažetak dokumenata i usklađenosti',
      'Glavni registar dokumenata - list svih kontrolisanih dokumenata',
      'Paket dokaza za provjeru - metapodaci arhive',
      'Preuzimanje u TXT ili XLSX formatu',
      'Izvoz pojedinačnih dokumenata kao JSON',
      'Izvoz kalendara zadataka kao ICS datoteku'
    ],
    tips: [
      'XLSX izvještaji su idealni za Excel analizu',
      'TXT izvještaji su jednostavni za brz pregled',
      'JSON paket je prikladan za integracije',
      'Svi izvještaji sadrže timestamp kreiranja'
    ]
  },
  {
    id: 'ai',
    title: 'AI Asistent',
    description: 'Inteligentna pomoć za QMS operacije',
    icon: FileText,
    details: [
      'Pristup AI asistentnom iz bilo kojeg ekrana (desna kolona ili mobilno)',
      'Zahtjevajte nove procedure i dokumente generisane sa AI',
      'Dobijajte preporuke za poboljšanja',
      'Pretražujte postojeće procedure sa pitanjima',
      'Učitajte postojeće dokumente kao referencu',
      'Kontekstno svesne preporuke na osnovu vašeg QMS sistema'
    ],
    tips: [
      'AI asistent je uvijek dostupan u desnom uglu ekrana',
      'Možete proslijediti postojeće dokumente kao referencu',
      'Odgovori se temelje na ISO 9001:2015 standardu',
      'Kvaliteta odgovora se poboljšava sa više interakcije'
    ]
  }
]

export function UserGuideModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [currentStep, setCurrentStep] = useState(0)

  const step = guideSteps[currentStep]
  const Icon = step.icon

  const downloadPDF = async () => {
    const response = await fetch('/api/user-guide')
    if (!response.ok) return
    const blob = await response.blob()
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'IDSS-QMS-Uputstvo.pdf'
    link.click()
    URL.revokeObjectURL(url)
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#101317]/60 p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="guide-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className="w-full max-w-4xl space-y-0 border border-[#dfe3e8] bg-[#f5f6f8] dark:border-[#343a41] dark:bg-[#191c20]" style={{ borderRadius: '20px', boxShadow: '18px 18px 42px rgba(15, 23, 42, 0.18), -18px -18px 42px rgba(255, 255, 255, 0.92)' }}>
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-[#edf0f2] px-6 py-5 dark:border-[#2a2e33]" style={{ borderTopLeftRadius: '20px', borderTopRightRadius: '20px' }}>
          <div>
            <div className="mb-2 text-[10px] font-bold uppercase tracking-[.15em] text-[#e21b2d]">Interaktivno uputstvo</div>
            <h2 id="guide-title" className="text-2xl font-bold">
              IDSS-QMS Korisničko Uputstvo
            </h2>
            <p className="mt-2 text-sm text-[#89919a]">Detaljno objašnjenje svih funkcija i mogućnosti sistema • {currentStep + 1} od {guideSteps.length}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center border border-[#c7cdd3] bg-white text-[#4d5964] transition-colors hover:border-[#e21b2d] hover:bg-[#fff0f2] hover:text-[#e21b2d] dark:border-[#4a525b] dark:bg-[#191c20] dark:text-[#d8dde2] dark:hover:bg-[#321b1f]"
            aria-label="Zatvori uputstvo"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="max-h-[60vh] overflow-y-auto px-6 py-5 dark:border-[#2a2e33]">
          <div className="flex items-start gap-5">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-[#f5f6f8] text-[#e21b2d] dark:bg-[#262c33]">
              <Icon size={28} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-2xl font-bold">{step.title}</h3>
              <p className="mt-1 text-sm text-[#89919a]">{step.description}</p>

              <div className="mt-6 space-y-4">
                <div>
                  <h4 className="text-sm font-bold text-[#20242a] dark:text-[#f4f6f8]">Kako funkcionira:</h4>
                  <ul className="mt-3 space-y-2">
                    {step.details.map((detail, idx) => (
                      <li key={idx} className="flex gap-3 text-sm leading-5 text-[#65707b] dark:text-[#b8c0c8]">
                        <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#e8f8f7] text-[10px] font-bold text-[#087f78]">
                          {idx + 1}
                        </span>
                        {detail}
                      </li>
                    ))}
                  </ul>
                </div>

                {step.tips && (
                  <div className="mt-6 rounded-2xl border border-[#dfe3e8] bg-[#fffaf0] p-4 dark:border-[#343a41] dark:bg-[#2b2517]">
                    <h4 className="text-sm font-bold text-[#b7791f] dark:text-[#d8c58b]">Saveti i trikovi:</h4>
                    <ul className="mt-3 space-y-2">
                      {step.tips.map((tip, idx) => (
                        <li key={idx} className="flex gap-2 text-xs leading-4 text-[#6f5a2a] dark:text-[#d8c58b]">
                          <span className="mt-0.5 shrink-0">•</span>
                          {tip}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="border-t border-[#edf0f2] px-6 py-4 dark:border-[#2a2e33]">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex gap-1">
              {guideSteps.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentStep(idx)}
                  className={`h-2 w-2 rounded-full transition-colors ${
                    idx === currentStep ? 'bg-[#e21b2d]' : 'bg-[#dfe3e8] dark:bg-[#343a41]'
                  }`}
                  aria-label={`Idi na korak ${idx + 1}`}
                />
              ))}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
                disabled={currentStep === 0}
                className="inline-flex h-9 items-center gap-2 border border-[#dfe3e8] px-3 text-xs font-bold text-[#65707b] disabled:opacity-50 hover:border-[#e21b2d] dark:border-[#343a41] dark:text-[#b8c0c8]"
              >
                Prethodno
              </button>
              <button
                onClick={() => setCurrentStep(Math.min(guideSteps.length - 1, currentStep + 1))}
                disabled={currentStep === guideSteps.length - 1}
                className="inline-flex h-9 items-center gap-2 border border-[#dfe3e8] px-3 text-xs font-bold text-[#65707b] disabled:opacity-50 hover:border-[#e21b2d] dark:border-[#343a41] dark:text-[#b8c0c8]"
              >
                Sljedeće <ChevronRight size={15} />
              </button>
            </div>
          </div>
          <button
            onClick={downloadPDF}
            className="w-full inline-flex items-center justify-center gap-2 bg-[#e21b2d] px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-[#c91728]"
          >
            <DownloadIcon size={15} /> Preuzmi kompletno uputstvo kao PDF
          </button>
        </div>

        {/* Hidden PDF content for download */}
        <div aria-hidden="true" style={{ display: 'none', padding: '20px' }}>
          <div style={{ textAlign: 'center', marginBottom: '30px' }}>
            <h1 style={{ fontSize: '32px', fontWeight: 'bold', margin: '10px 0' }}>IDSS-QMS</h1>
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', margin: '10px 0' }}>Korisničko Uputstvo</h2>
            <p style={{ fontSize: '12px', color: '#666' }}>Sistem Upravljanja Kvalitetom</p>
            <p style={{ fontSize: '12px', color: '#999', marginTop: '20px' }}>{new Date().toLocaleDateString('bs-BA')}</p>
          </div>

          {guideSteps.map((guideStep, idx) => (
            <div key={guideStep.id} style={{ pageBreakInside: 'avoid', marginBottom: '30px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '10px', color: '#e21b2d' }}>
                {idx + 1}. {guideStep.title}
              </h3>
              <p style={{ fontSize: '12px', color: '#666', marginBottom: '15px' }}>{guideStep.description}</p>

              <h4 style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '8px', marginTop: '15px' }}>Kako funkcionira:</h4>
              <ol style={{ fontSize: '11px', color: '#333', marginLeft: '20px', lineHeight: '1.6' }}>
                {guideStep.details.map((detail, detailIdx) => (
                  <li key={detailIdx} style={{ marginBottom: '6px' }}>
                    {detail}
                  </li>
                ))}
              </ol>

              {guideStep.tips && (
                <>
                  <h4 style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '8px', marginTop: '12px', color: '#b7791f' }}>Saveti i trikovi:</h4>
                  <ul style={{ fontSize: '11px', color: '#666', marginLeft: '20px', lineHeight: '1.6' }}>
                    {guideStep.tips.map((tip, tipIdx) => (
                      <li key={tipIdx} style={{ marginBottom: '4px' }}>
                        {tip}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          ))}

          <div style={{ marginTop: '40px', paddingTop: '20px', borderTop: '1px solid #ddd', fontSize: '10px', color: '#999', textAlign: 'center' }}>
            <p>IDSS-QMS Korisničko Uputstvo • Verzija 1.0</p>
            <p>Generirano: {new Date().toLocaleString('bs-BA')}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
