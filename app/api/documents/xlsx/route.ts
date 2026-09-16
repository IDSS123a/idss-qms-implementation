import { NextResponse } from 'next/server'
import { createQmsWorkbook, type QmsWorkbookInput } from '@/lib/qms-xlsx'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  try {
    const input = await request.json() as Partial<QmsWorkbookInput>
    if (!input.title?.trim() || !input.code?.trim()) {
      return NextResponse.json({ error: 'Naziv i šifra dokumenta su obavezni.' }, { status: 400 })
    }
    const buffer = createQmsWorkbook({
      title: input.title.trim(), code: input.code.trim(), version: input.version, status: input.status,
      owner: input.owner, date: input.date, purpose: input.purpose, scope: input.scope,
      definitions: input.definitions, responsibilities: input.responsibilities, procedure: input.procedure,
      records: input.records, references: input.references, distribution: input.distribution, appendices: input.appendices,
    })
    const filename = `${input.code.trim().replace(/[^a-zA-Z0-9_-]+/g, '_')}_kontrolisani_dokument.xlsx`
    return new NextResponse(buffer, { status: 200, headers: { 'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'Content-Disposition': `attachment; filename="${filename}"`, 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('[v0] XLSX generation failed:', error)
    return NextResponse.json({ error: 'XLSX dokument nije moguće kreirati.' }, { status: 500 })
  }
}
