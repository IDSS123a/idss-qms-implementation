import { createUIMessageStream, createUIMessageStreamResponse } from 'ai'

export const runtime = 'nodejs'

const MAX_BODY_BYTES = 256_000
const MAX_MESSAGES = 40
const MAX_TEXT_LENGTH = 8_000

function isGreeting(prompt: string) {
  return /^(hi|hey|hello|hy|zdravo|pozdrav|ćao|cao|dobar dan|dobro jutro|dobro veče)[\s!,.?]*$/iu.test(prompt)
}

function isDocumentRequest(prompt: string) {
  return /\b(napiši|napisi|kreiraj|izradi|generiši|generisi|napravi|draft|create|write|procedure|proceduru|postupak|uputstvo|obrazac|policy|politiku|dokument)\b/iu.test(prompt)
}

function buildReply(prompt: string) {
  if (isGreeting(prompt)) {
    return 'Zdravo. Ja sam IDSS-QMS asistent. Mogu pomoći sa pregledom dokumenata, analizom ISO 9001 zahtjeva ili izradom novog QMS dokumenta. Neću kreirati dokument dok mi izričito ne kažeš šta treba izraditi.\n\nPrimjer: „Napiši proceduru za evaluaciju dobavljača za proizvodni proces.“'
  }

  if (!isDocumentRequest(prompt)) {
    return 'Razumio sam poruku, ali nije jasno da li želiš novi dokument. Mogu: (1) objasniti postojeći QMS dokument, (2) pronaći relevantan dokument iz arhive, (3) predložiti poboljšanje ili (4) napisati novi dokument.\n\nAko želiš novi dokument, navedi tip, temu, proces, odgovornu ulogu i organizacijski kontekst.'
  }

  const subject = prompt.match(/QP[- ]?\d+/i)?.[0]?.toUpperCase().replace(' ', '-') ?? 'QP-10'
  const title = prompt.replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, 90) || 'Novi QMS dokument'
  return `PRIJEDLOG NOVOG DOKUMENTA — NACRT ZA POTVRDU

IDSS-QMS
ŠIFRA DOKUMENTA: ${subject}
NAZIV: ${title}
VERZIJA: 01
STATUS: NACRT ZA PREGLED
VLASNIK: Za potvrdu

1. SVRHA
Definisati jedinstven način upravljanja predmetnom aktivnošću u skladu sa zahtjevima ISO 9001:2015.

2. PODRUČJE PRIMJENE
Primjenjuje se na sve relevantne procese i zaposlene organizacije.

3. ODGOVORNOSTI
Rukovodstvo odobrava dokument; vlasnik procesa ga primjenjuje i održava; zaposleni vode propisane zapise.

4. POSTUPAK
4.1 Zahtjev i planiranje
4.2 Izvršenje prema odobrenim kriterijima
4.3 Provjera rezultata i postupanje po odstupanjima
4.4 Čuvanje i kontrola zapisa

5. ZAPISI
Naziv zapisa | Odgovorno lice | Mjesto čuvanja | Rok čuvanja
Za popunu nakon potvrde organizacije.

6. PRILOZI
Za popunu prema stvarnom procesu.

Napomena: Ovo je radni nacrt. Prije odobrenja potvrditi odgovorna lica, rokove, obrasce i stvarnu praksu. Dokument nije kreiran niti odobren bez tvoje potvrde.`
}

function getPrompt(body: unknown) {
  if (!body || typeof body !== 'object' || !Array.isArray((body as { messages?: unknown }).messages)) return null
  const messages = (body as { messages: unknown[] }).messages
  if (messages.length > MAX_MESSAGES) return null
  const latest = [...messages].reverse().find((message) => {
    if (!message || typeof message !== 'object') return false
    return (message as { role?: unknown }).role === 'user'
  })
  if (!latest || typeof latest !== 'object') return null
  const parts = (latest as { parts?: unknown }).parts
  if (!Array.isArray(parts)) return null
  const text = parts.filter((part) => part && typeof part === 'object' && (part as { type?: unknown }).type === 'text')
    .map((part) => (part as { text?: unknown }).text)
    .filter((text): text is string => typeof text === 'string')
    .join(' ')
    .trim()
  return text.length > 0 && text.length <= MAX_TEXT_LENGTH ? text : null
}

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get('content-length') ?? 0)
  if (contentLength > MAX_BODY_BYTES) return new Response('Request too large', { status: 413 })
  if (!request.headers.get('content-type')?.toLowerCase().includes('application/json')) {
    return new Response('Content-Type must be application/json', { status: 415 })
  }

  let body: unknown
  try {
    const raw = await request.text()
    if (new TextEncoder().encode(raw).byteLength > MAX_BODY_BYTES) return new Response('Request too large', { status: 413 })
    body = JSON.parse(raw)
  } catch {
    return new Response('Invalid JSON', { status: 400 })
  }

  const prompt = getPrompt(body)
  if (!prompt) return new Response('Invalid message payload', { status: 400 })

  const response = buildReply(prompt)
  const stream = createUIMessageStream({
    execute: ({ writer }) => {
      const id = crypto.randomUUID()
      writer.write({ type: 'text-start', id })
      writer.write({ type: 'text-delta', id, delta: response })
      writer.write({ type: 'text-end', id })
    },
  })
  return createUIMessageStreamResponse({ stream })
}

export async function GET() {
  return new Response('Method Not Allowed', { status: 405, headers: { Allow: 'POST' } })
}

export async function OPTIONS() {
  return new Response(null, { status: 204 })
}
