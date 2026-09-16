import { createUIMessageStream, createUIMessageStreamResponse } from 'ai'

function buildDraft(prompt: string) {
  const subject = prompt.match(/QP[- ]?\d+/i)?.[0]?.toUpperCase().replace(' ', '-') ?? 'QP-10'
  return `IDSS-QMS\nŠIFRA DOKUMENTA: ${subject}\nNAZIV: ${prompt.slice(0, 90)}\nVERZIJA: 01\nSTATUS: NACRT ZA PREGLED\nVLASNIK: Za potvrdu\n\n1. SVRHA\nDefinisati jedinstven način upravljanja predmetnom aktivnošću u skladu sa zahtjevima ISO 9001:2015.\n\n2. PODRUČJE PRIMJENE\nPrimjenjuje se na sve relevantne procese i zaposlene organizacije.\n\n3. ODGOVORNOSTI\nRukovodstvo odobrava dokument; vlasnik procesa ga primjenjuje i održava; zaposleni vode propisane zapise.\n\n4. POSTUPAK\n4.1 Zahtjev i planiranje\n4.2 Izvršenje prema odobrenim kriterijima\n4.3 Provjera rezultata i postupanje po odstupanjima\n4.4 Čuvanje i kontrola zapisa\n\n5. ZAPISI\nNaziv zapisa | Odgovorno lice | Mjesto čuvanja | Rok čuvanja\nZa popunu nakon potvrde organizacije.\n\n6. PRILOZI\nZa popunu prema stvarnom procesu.\n\nNapomena: Ovo je radni nacrt. Prije odobrenja potvrditi odgovorna lica, rokove, obrasce i stvarnu praksu.`
}

export async function POST(request: Request) {
  const { messages } = await request.json()
  const latest = [...messages].reverse().find((message: { role: string }) => message.role === 'user')
  const prompt = latest?.parts?.filter((part: { type: string }) => part.type === 'text').map((part: { text: string }) => part.text).join(' ') ?? 'Novi QMS dokument'
  const response = buildDraft(prompt)
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
