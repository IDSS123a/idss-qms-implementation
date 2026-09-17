import * as XLSX from 'xlsx'
import mammoth from 'mammoth'
import { PDFParse } from 'pdf-parse'

const MAX_TEXT = 120_000

export async function extractQmsText(file: File) {
  const buffer = Buffer.from(await file.arrayBuffer())
  const type = file.type.toLowerCase()
  const name = file.name.toLowerCase()
  let text = ''
  if (type.includes('pdf') || name.endsWith('.pdf')) {
    const parser = new PDFParse({ data: buffer })
    const result = await parser.getText()
    await parser.destroy()
    text = result.text
  } else if (type.includes('wordprocessingml') || name.endsWith('.docx')) {
    text = (await mammoth.extractRawText({ buffer })).value
  } else if (type.includes('sheet') || name.endsWith('.xlsx') || name.endsWith('.xls')) {
    const workbook = XLSX.read(buffer, { type: 'buffer' })
    text = workbook.SheetNames.map((sheetName) => `${sheetName}\n${XLSX.utils.sheet_to_csv(workbook.Sheets[sheetName])}`).join('\n\n')
  } else if (type.startsWith('text/') || name.endsWith('.txt') || name.endsWith('.csv')) {
    text = buffer.toString('utf8')
  } else {
    throw new Error('Nepodržan format. Podržani su PDF, DOCX, XLSX, XLS, CSV i TXT.')
  }
  return text.replace(/\u0000/g, '').replace(/\r/g, '').slice(0, MAX_TEXT).trim()
}

export function chunkQmsText(text: string, size = 1800, overlap = 240) {
  const chunks: string[] = []
  for (let start = 0; start < text.length; start += size - overlap) chunks.push(text.slice(start, start + size).trim())
  return chunks.filter(Boolean)
}
