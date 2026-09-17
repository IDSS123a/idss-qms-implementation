import { createUIMessageStream, createUIMessageStreamResponse, generateText, gateway } from 'ai'
import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'
import { getQmsContext } from '@/lib/qms-auth'
import { readFile } from 'node:fs/promises'
import { checkRateLimit } from '@/lib/rate-limit'
import path from 'node:path'

export const runtime = 'nodejs'

const MAX_BODY_BYTES = 256_000
const MAX_MESSAGES = 40
const MAX_TEXT_LENGTH = 8_000
const MODEL = 'openai/gpt-5-mini'

type ChatPart = { type?: unknown; text?: unknown }
type ChatMessage = { role?: unknown; parts?: unknown }

function getPrompt(body: unknown) {
  if (!body || typeof body !== 'object' || !Array.isArray((body as { messages?: unknown }).messages)) return null
  const messages = (body as { messages: unknown[] }).messages
  if (messages.length > MAX_MESSAGES) return null
  const latest = [...messages].reverse().find((message) => {
    if (!message || typeof message !== 'object') return false
    return (message as ChatMessage).role === 'user'
  }) as ChatMessage | undefined
  if (!latest || !Array.isArray(latest.parts)) return null
  const text = latest.parts.filter((part): part is ChatPart => Boolean(part) && typeof part === 'object' && (part as ChatPart).type === 'text')
    .map((part) => part.text).filter((text): text is string => typeof text === 'string').join(' ').trim()
  return text.length > 0 && text.length <= MAX_TEXT_LENGTH ? text : null
}

async function getReferenceLibrary(workspaceId: string | undefined, prompt: string) {
  const terms = prompt.toLowerCase().split(/\s+/).filter((term) => term.length > 3).slice(0, 8)
  const pattern = terms.length ? `%${terms.join('%')}%` : '%'
  const documents = workspaceId ? await db.execute(sql`select d.code, d.title, d.type, d.status, v.version, v.content from qms_document d left join lateral (select version, content from qms_document_version where document_id = d.id and workspace_id = d.workspace_id order by created_at desc limit 1) v on true where d.workspace_id = ${workspaceId}::uuid and lower(concat_ws(' ', d.code, d.title, d.type, d.content::text, v.content::text)) like ${pattern} order by d.updated_at desc limit 12`) : { rows: [] }
  const databaseReferences = documents.rows.map((item) => {
    const row = item as { code?: string; title?: string; type?: string; status?: string; version?: string; content?: unknown }
    return `[CITAT] IZVOR: ${row.code ?? 'Dokument'} | naziv: ${row.title ?? 'Bez naziva'} | tip: ${row.type ?? 'QMS'} | status: ${row.status ?? 'nepoznat'} | verzija: ${row.version ?? '—'} | odlomak: cijeli dokument\nSADRŽAJ: ${JSON.stringify(row.content ?? '').slice(0, 12000)}`
  })
  const chunks = workspaceId ? await db.execute(sql`select d.code, d.title, v.version, c.source_name, c.chunk_index, c.content from qms_document_chunk c join qms_document d on d.id = c.document_id left join lateral (select version from qms_document_version where document_id = d.id and workspace_id = d.workspace_id order by created_at desc limit 1) v on true where c.workspace_id = ${workspaceId}::uuid and lower(c.content) like ${pattern} order by d.updated_at desc, c.chunk_index asc limit 40`) : { rows: [] }
  const chunkReferences = chunks.rows.map((item) => {
    const row = item as { code?: string; title?: string; version?: string; source_name?: string; chunk_index?: string; content?: string }
    return `[CITAT] IZVOR: ${row.code ?? 'Dokument'} | naziv: ${row.title ?? row.source_name ?? 'Bez naziva'} | verzija: ${row.version ?? '—'} | odlomak: ${row.chunk_index ?? '—'}\nSADRŽAJ: ${(row.content ?? '').slice(0, 6000)}`
  })
  const manifestPath = path.join(process.cwd(), 'public', 'qms-manifest.json')
  const manifestText = await readFile(manifestPath, 'utf8')
  const manifest = JSON.parse(manifestText) as Array<{ path?: string; name?: string; code?: string }>
  const manifestReferences = manifest.filter((item) => typeof item.path === 'string' && typeof item.name === 'string')
    .map((item) => `[CITAT] IZVOR: ${item.code ?? 'Dokument'} | naziv: ${item.name} | verzija: — | odlomak: arhivska datoteka (${item.path})`)
  return [...databaseReferences, ...manifestReferences].join('\n')
}

const systemPrompt = `Ti si IDSS-QMS stručni AI asistent za upravljanje kvalitetom. Odgovaraj isključivo na bosanskom jeziku, latinicom, jasno i profesionalno. Korisnik želi izradu kompletnih QMS procedura po uzoru na postojeće procedure QP_01 do QP_09.

Kada korisnik traži novu proceduru, ne daj kratak nacrt. Za svaku činjeničnu tvrdnju koristi dostupni [CITAT] i navedi šifru, verziju i odlomak; ako citat ne postoji, napiši „Nije pronađeno u izvornoj dokumentaciji.“ Ne izmišljaj rokove, obrasce, zahtjeve ili ISO tumačenja. Prvo razjasni samo podatke koji stvarno nedostaju, a zatim izradi detaljan radni dokument sa najmanje: šifrom i nazivom, svrhom, područjem primjene, povezanim dokumentima i ISO 9001:2015 tačkama, definicijama, odgovornostima, ulazima i izlazima procesa, detaljnim koracima sa kriterijima i zapisima, rizicima i prilikama, pokazateljima uspješnosti, upravljanjem nesukladnostima, kontrolom dokumentovanih informacija, revizijom i odobravanjem. Obavezno predloži i kompletan paket pratećih dokumenata: obrasce, kontrolne liste, planove, registre, zapisnike, izvještaje i evidencije, sa šiframa, vlasnikom, mjestom čuvanja i rokom čuvanja.

Ne izmišljaj da je dokument stvarno odobren, potpisan ili usklađen ako to nije potvrđeno. Jasno označi pretpostavke, otvorena pitanja i status NACRT ZA PREGLED. Kada koristiš izvor, navedi ga na kraju odgovora u formatu [Izvor: šifra, verzija, naziv]. Ako podatak nije pronađen u priloženim QMS izvorima, napiši: „Nije pronađeno u izvornoj dokumentaciji.“ AI nikada ne odobrava niti objavljuje dokument. Koristi terminologiju QP, obrazac, zapis, registar, kontrolna lista, odgovorna osoba, rok čuvanja i revizija. Ne koristi hrvatizme ili srbizme kada postoji prirodan bosanski izraz.`

function createFallbackProcedure(prompt: string) {
  const qp10 = /qp[- _]?10|novozaposlen/i.test(prompt)
  if (!qp10) return `Nije moguće dobiti AI odgovor jer AI servis trenutno nije aktivan. Za zahtjev „${prompt}“ pripremite šifru procedure, naziv, vlasnika procesa i očekivane zapise, pa pokušajte ponovo.`
  return `NACRT ZA PREGLED\n\nQP-10 — UVOĐENJE NOVOZAPOSLENIH\n\n1. Svrha\nOva procedura utvrđuje način planiranja, prijema, uvođenja, osposobljavanja i praćenja rada novozaposlene osobe kako bi se osigurala njena kompetentnost i razumijevanje zahtjeva sistema upravljanja kvalitetom.\n\n2. Područje primjene\nPrimjenjuje se na sve novozaposlene osobe, pripravnike, osobe angažovane po ugovoru i osobe koje mijenjaju radno mjesto ili preuzimaju nove odgovornosti.\n\n3. Odgovornosti\n• Rukovodstvo odobrava potrebu za zapošljavanjem i obezbjeđuje resurse.\n• Odgovorna osoba procesa priprema plan uvođenja i prati njegovo izvršenje.\n• Neposredni rukovodilac definiše radne zadatke, rizike i potrebne kompetencije.\n• Mentor pruža praktične upute i evidentira napredak.\n• Novozaposlena osoba izvršava plan, postavlja pitanja i potvrđuje razumijevanje zahtjeva.\n\n4. Tok postupka\n1) Utvrditi radno mjesto, odgovornosti, ovlaštenja i potrebne kompetencije.\n2) Pripremiti radno mjesto, pristupe, opremu i obaveznu dokumentaciju.\n3) Održati uvodni razgovor o politici kvaliteta, ciljevima, rizicima, zaštiti podataka i pravilima rada.\n4) Predstaviti važeće procedure, radne upute, obrasce i način prijavljivanja nesukladnosti.\n5) Izraditi individualni plan osposobljavanja sa rokovima i odgovornim osobama.\n6) Provesti obuku i praktičnu provjeru kompetencija.\n7) Nakon probnog perioda izvršiti ocjenu osposobljenosti i odlučiti o dodatnim mjerama.\n\n5. Ulazi i izlazi\nUlazi su zahtjev za popunu radnog mjesta, opis posla, matrica kompetencija i plan osposobljavanja. Izlazi su osposobljena osoba, popunjen dosje uvođenja, procjena kompetencija i plan daljeg razvoja.\n\n6. Rizici i prilike\nRizici su rad bez potrebnih ovlaštenja, nepoznavanje kontrolisanih dokumenata i nepotpuna obuka. Mjere su provjera pristupa, mentorstvo, kontrolna lista i dokumentovana procjena. Prilika je brže uključivanje osobe u proces i rano prepoznavanje potreba za razvojem.\n\n7. Zapisi i pokazatelji\nČuvaju se plan uvođenja, kontrolna lista, evidencija obuke, provjera kompetencija i ocjena probnog perioda. Pokazatelji su procenat završenih planova, vrijeme do samostalnog rada i broj utvrđenih potreba za dodatnom obukom.\n\n8. Povezani zahtjevi\nISO 9001:2015: 5.3, 7.1.2, 7.2, 7.3, 7.5 i 8.1, uz provjeru primjenjivosti prema stvarnom procesu organizacije.\n\n9. Prateći dokumenti\n• OB-10-01 Plan uvođenja novozaposlene osobe\n• KL-10-01 Kontrolna lista prvog radnog dana\n• OB-10-02 Evidencija uvodne obuke\n• OB-10-03 Provjera kompetencija\n• REG-10-01 Registar osposobljenosti\n• ZAP-10-01 Zapisnik o ocjeni probnog perioda\n• IZV-10-01 Izvještaj o uspješnosti uvođenja\nZa svaki dokument treba odrediti vlasnika, mjesto čuvanja, pristup i rok čuvanja u skladu sa pravilima organizacije.\n\n10. Otvorena pitanja za potvrdu\nPotrebno je potvrditi vlasnika procedure, trajanje probnog perioda, način ocjenjivanja, rokove čuvanja zapisa i osobe ovlaštene za odobravanje.\n\nStatus: NACRT ZA PREGLED — nije odobreno niti potpisano.\n\nNapomena: AI servis trenutno nije dostupan zbog ograničenja računa Vercel AI Gatewaya, pa je prikazan sigurni QP-10 radni nacrt umjesto izmišljenog odgovora.`
}

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get('content-length') ?? 0)
  if (contentLength > MAX_BODY_BYTES) return new Response('Zahtjev je prevelik.', { status: 413 })
  if (!request.headers.get('content-type')?.toLowerCase().includes('application/json')) return new Response('Dozvoljen je samo JSON zahtjev.', { status: 415 })
  let body: unknown
  try {
    const raw = await request.text()
    if (new TextEncoder().encode(raw).byteLength > MAX_BODY_BYTES) return new Response('Zahtjev je prevelik.', { status: 413 })
    body = JSON.parse(raw)
  } catch { return new Response('Neispravan JSON zahtjev.', { status: 400 }) }
  const prompt = getPrompt(body)
  if (!prompt) return new Response('Poruka nije ispravna.', { status: 400 })
  const context = await getQmsContext(request)
  if (!context) return new Response('Prijava je obavezna.', { status: 401 })
  const rate = checkRateLimit(`chat:${context.user.id}`, 20)
  if (!rate.allowed) return new Response('Previše zahtjeva. Pokušajte ponovo za minut.', { status: 429, headers: { 'Retry-After': '60' } })
  const workspaceId = context.workspaceId

  try {
    const references = await getReferenceLibrary(workspaceId, prompt)
    const result = await generateText({
      model: gateway(MODEL),
      system: `${systemPrompt}\n\nSpisak dostupnih referentnih dokumenata iz arhive QP_01–QP_09:\n${references}`,
      prompt,
      maxOutputTokens: 9000,
    })
    if (workspaceId) await db.execute(sql`insert into qms_audit_event (workspace_id, user_id, action, entity_type, entity_id, metadata) values (${workspaceId}::uuid, ${context.user.id}::uuid, 'generate', 'ai_draft', null, ${JSON.stringify({ prompt: prompt.slice(0, 500), referenceCount: references.split('IZVOR:').length - 1 })}::jsonb)`)
    const stream = createUIMessageStream({ execute: ({ writer }) => { const id = crypto.randomUUID(); writer.write({ type: 'text-start', id }); writer.write({ type: 'text-delta', id, delta: result.text }); writer.write({ type: 'text-end', id }) } })
    return createUIMessageStreamResponse({ stream })
  } catch (error) {
    console.error('[v0] QMS AI generation failed:', error)
    const fallback = createFallbackProcedure(prompt)
    const stream = createUIMessageStream({ execute: ({ writer }) => { const id = crypto.randomUUID(); writer.write({ type: 'text-start', id }); writer.write({ type: 'text-delta', id, delta: fallback }); writer.write({ type: 'text-end', id }) } })
    return createUIMessageStreamResponse({ stream })
  }
}

export async function GET() { return new Response('Metoda nije dozvoljena.', { status: 405, headers: { Allow: 'POST' } }) }
export async function OPTIONS() { return new Response(null, { status: 204 }) }
