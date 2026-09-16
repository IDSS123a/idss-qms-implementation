import { createUIMessageStream, createUIMessageStreamResponse, generateText } from 'ai'

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

async function getReferenceLibrary() {
  const response = await fetch(new URL('/qms-manifest.json', process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000'))
  if (!response.ok) return 'Referentna biblioteka nije dostupna.'
  const manifest = await response.json() as Array<{ path?: string; name?: string; code?: string }>
  return manifest.filter((item) => typeof item.path === 'string' && typeof item.name === 'string')
    .map((item) => `${item.code ?? 'Dokument'} | ${item.path} | ${item.name}`).join('\n')
}

const systemPrompt = `Ti si IDSS-QMS stručni AI asistent za upravljanje kvalitetom. Odgovaraj isključivo na bosanskom jeziku, latinicom, jasno i profesionalno. Korisnik želi izradu kompletnih QMS procedura po uzoru na postojeće procedure QP_01 do QP_09.

Kada korisnik traži novu proceduru, ne daj kratak nacrt. Prvo razjasni samo podatke koji stvarno nedostaju, a zatim izradi detaljan radni dokument sa najmanje: šifrom i nazivom, svrhom, područjem primjene, povezanim dokumentima i ISO 9001:2015 tačkama, definicijama, odgovornostima, ulazima i izlazima procesa, detaljnim koracima sa kriterijima i zapisima, rizicima i prilikama, pokazateljima uspješnosti, upravljanjem nesukladnostima, kontrolom dokumentovanih informacija, revizijom i odobravanjem. Obavezno predloži i kompletan paket pratećih dokumenata: obrasce, kontrolne liste, planove, registre, zapisnike, izvještaje i evidencije, sa šiframa, vlasnikom, mjestom čuvanja i rokom čuvanja.

Ne izmišljaj da je dokument stvarno odobren, potpisan ili usklađen ako to nije potvrđeno. Jasno označi pretpostavke, otvorena pitanja i status NACRT ZA PREGLED. Koristi terminologiju QP, obrazac, zapis, registar, kontrolna lista, odgovorna osoba, rok čuvanja i revizija. Ne koristi hrvatizme ili srbizme kada postoji prirodan bosanski izraz.`

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

  try {
    const references = await getReferenceLibrary()
    const result = await generateText({
      model: MODEL,
      system: `${systemPrompt}\n\nSpisak dostupnih referentnih dokumenata iz arhive QP_01–QP_09:\n${references}`,
      prompt,
      maxOutputTokens: 9000,
    })
    const stream = createUIMessageStream({ execute: ({ writer }) => { const id = crypto.randomUUID(); writer.write({ type: 'text-start', id }); writer.write({ type: 'text-delta', id, delta: result.text }); writer.write({ type: 'text-end', id }) } })
    return createUIMessageStreamResponse({ stream })
  } catch (error) {
    console.error('[v0] QMS AI generation failed:', error)
    return new Response('AI asistent trenutno nije dostupan. Pokušajte ponovo.', { status: 503 })
  }
}

export async function GET() { return new Response('Metoda nije dozvoljena.', { status: 405, headers: { Allow: 'POST' } }) }
export async function OPTIONS() { return new Response(null, { status: 204 }) }
