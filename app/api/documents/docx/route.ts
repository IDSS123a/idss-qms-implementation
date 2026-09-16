import { createQmsDocx, type QmsDocumentInput } from '@/lib/qms-docx'

export const runtime = 'nodejs'

const MAX_TEXT = 12_000

function readInput(value: unknown): QmsDocumentInput | null {
  if (!value || typeof value !== 'object') return null
  const input = value as Record<string, unknown>
  if (typeof input.title !== 'string' || input.title.trim().length < 3 || input.title.length > 200) return null
  const text = (key: string) => typeof input[key] === 'string' ? input[key].slice(0, MAX_TEXT) : undefined
  return { title: input.title.trim(), type: typeof input.type === 'string' ? input.type.slice(0, 80) : 'Procedura', code: text('code'), owner: text('owner'), purpose: text('purpose'), scope: text('scope'), definitions: text('definitions'), responsibilities: text('responsibilities'), procedure: text('procedure'), records: text('records'), references: text('references'), distribution: text('distribution'), appendices: text('appendices') }
}

export async function POST(request: Request) {
  try {
    const input = readInput(await request.json())
    if (!input) return Response.json({ error: 'Invalid document payload' }, { status: 400 })
    const buffer = await createQmsDocx(input)
    const filename = `${(input.code || 'QMS-DRAFT').replace(/[^A-Za-z0-9_-]/g, '-')}-${input.title.replace(/[^A-Za-z0-9_-]/g, '-').slice(0, 70)}.docx`
    return new Response(buffer as BodyInit, { headers: { 'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'Content-Disposition': `attachment; filename="${filename}"`, 'Cache-Control': 'no-store' } })
  } catch {
    return Response.json({ error: 'DOCX generation failed' }, { status: 500 })
  }
}

export async function GET() {
  return new Response('Method Not Allowed', { status: 405, headers: { Allow: 'POST' } })
}
