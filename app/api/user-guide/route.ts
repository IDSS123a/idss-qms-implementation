import { NextResponse } from 'next/server'

const sections = [
  ['01  KONTROLNA TABLA', 'Pregled metrika, obavijesti, zadataka, rizika i CAPA aktivnosti. Koristite dashboard kao početnu tačku za svakodnevni pregled QMS sistema.'],
  ['02  BIBLIOTEKA DOKUMENATA', 'Pretražite kontrolisane dokumente, otvorite historiju verzija, uporedite verzije i pratite tok draft, pregleda, odobrenja i objave.'],
  ['03  ROKOVI I ZADACI', 'Kreirajte zadatke sa rokom i prioritetom. Filtrirajte otvorene ili završene zadatke, sortirajte ih i označite završene obaveze.'],
  ['04  ADMINISTRACIJA', 'Administratori upravljaju korisnicima, revizijskim tragom, obukama, kompetencijama, odobrenjima i enterprise kontrolama.'],
  ['05  IZVOZ I IZVJEŠTAJI', 'Preuzmite izvještaje u TXT, XLSX, JSON ili ICS formatima, zavisno od namjene i potrebnog nivoa obrade.'],
  ['06  AI ASISTENT', 'AI priprema nacrte na osnovu QMS izvora. Svaki rezultat je nacrt za pregled i ne može samostalno odobriti ili objaviti dokument.'],
]

function escapePdf(value: string) {
  return value.replaceAll('\\', '\\\\').replaceAll('(', '\\(').replaceAll(')', '\\)').replaceAll('č', 'c').replaceAll('ć', 'c').replaceAll('ž', 'z').replaceAll('š', 's').replaceAll('đ', 'd')
}

function createPdf() {
  const lines = ['IDSS-QMS KORISNICKO UPUTSTVO', 'Sistem upravljanja kvalitetom', '', 'Sadrzaj i prakticni koraci', '']
  sections.forEach(([title, text]) => { lines.push(title, ...text.match(/.{1,88}(?:\s|$)/g) ?? [text], '') })
  const pageHeight = 792
  const content = lines.map((line, index) => `BT /F1 ${index === 0 ? 20 : index === 1 ? 11 : 10} Tf 54 ${pageHeight - 60 - index * 20} Td (${escapePdf(line)}) Tj ET`).join('\n')
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
  ]
  let pdf = '%PDF-1.4\n'
  const offsets = [0]
  objects.forEach((object, index) => { offsets[index + 1] = pdf.length; pdf += `${index + 1} 0 obj\n${object}\nendobj\n` })
  const xref = pdf.length
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.slice(1).map((offset) => `${String(offset).padStart(10, '0')} 00000 n `).join('\n')}\ntrailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`
  return pdf
}

export async function GET() {
  return new NextResponse(createPdf(), { headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': 'attachment; filename="IDSS-QMS-Uputstvo.pdf"', 'Cache-Control': 'no-store' } })
}
