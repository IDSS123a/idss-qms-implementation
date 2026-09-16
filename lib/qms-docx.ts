import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  Header,
  HeadingLevel,
  Packer,
  PageNumber,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from 'docx'

export type QmsDocumentInput = {
  title: string
  type: string
  code?: string
  owner?: string
  purpose?: string
  scope?: string
  definitions?: string
  responsibilities?: string
  procedure?: string
  records?: string
  references?: string
  distribution?: string
  appendices?: string
}

const red = 'C91829'
const ink = '17212B'
const muted = '5E6B76'
const border = { style: BorderStyle.SINGLE, size: 4, color: 'CBD3D9' }
const cellMargins = { top: 100, bottom: 100, left: 120, right: 120 }

function textRuns(value: string, size = 21) {
  return value.split(/\n+/).filter(Boolean).flatMap((line, index, lines) => [
    new TextRun({ text: line, font: 'Arial', size }),
    ...(index < lines.length - 1 ? [new TextRun({ break: 1 })] : []),
  ])
}

function cell(value: string, bold = false) {
  return new TableCell({
    margins: cellMargins,
    borders: { top: border, bottom: border, left: border, right: border },
    children: [new Paragraph({ spacing: { after: 0 }, children: [new TextRun({ text: value, bold, font: 'Arial', size: 20, color: bold ? ink : muted })] })],
  })
}

function heading(number: string, title: string) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 260, after: 120 },
    children: [new TextRun({ text: `${number}  ${title}`, bold: true, color: red, font: 'Arial', size: 25 })],
  })
}

function body(value: string, placeholder: string) {
  return new Paragraph({
    spacing: { after: 150, line: 276 },
    children: textRuns(value.trim() || placeholder),
  })
}

function infoTable(input: QmsDocumentInput, code: string) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({ children: [cell('Šifra', true), cell(code), cell('Verzija', true), cell('01')] }),
      new TableRow({ children: [cell('Vrsta dokumenta', true), cell(input.type || 'Procedura'), cell('Status', true), cell('NACRT ZA PREGLED')] }),
      new TableRow({ children: [cell('Vlasnik procesa', true), cell(input.owner || 'Za potvrdu'), cell('Datum', true), cell(new Date().toLocaleDateString('bs-BA'))] }),
    ],
  })
}

function recordsTable(value: string) {
  const rows = value.split('\n').map((line) => line.trim()).filter(Boolean)
  const data = rows.length ? rows : ['Za popunu nakon potvrde organizacije.']
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({ children: [cell('Naziv zapisa', true), cell('Oznaka obrasca', true), cell('Rok čuvanja', true), cell('Mjesto čuvanja', true), cell('Odgovorno lice', true)] }),
      ...data.map((line) => new TableRow({ children: [cell(line), cell('Za potvrdu'), cell('Za potvrdu'), cell('Za potvrdu'), cell(inputOwner(line))] })),
    ],
  })
}

function inputOwner(line: string) {
  return /zapisnik|izvještaj/i.test(line) ? 'Vlasnik procesa' : 'Odgovorno lice'
}

export async function createQmsDocx(input: QmsDocumentInput) {
  const code = input.code || 'QP-10'
  const document = new Document({
    creator: 'IDSS-QMS',
    title: input.title,
    subject: 'Kontrolisani dokument sistema upravljanja kvalitetom',
    styles: { default: { document: { run: { font: 'Arial', size: 21, color: ink } } } },
    sections: [{
      properties: { page: { margin: { top: 900, right: 900, bottom: 900, left: 900 } } },
      headers: { default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: `IDSS-QMS  |  ${code}`, bold: true, color: red, font: 'Arial', size: 18 })] })] }) },
      footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Kontrolisani dokument  |  Stranica ', font: 'Arial', size: 16, color: muted }), new TextRun({ children: [PageNumber.CURRENT], font: 'Arial', size: 16 })] })] }) },
      children: [
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 80 }, children: [new TextRun({ text: 'PROCEDURA', bold: true, color: red, font: 'Arial', size: 18 })] }),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 120 }, children: [new TextRun({ text: input.title, bold: true, color: ink, font: 'Arial', size: 31 })] }),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 260 }, children: [new TextRun({ text: 'IDSS-QMS  |  KONTROLISANI DOKUMENT', bold: true, color: muted, font: 'Arial', size: 18 })] }),
        infoTable(input, code),
        heading('0.', 'DISTRIBUCIJA I KONTROLA'),
        body(input.distribution || 'Kontrolisana kopija čuva se u sistemu IDSS-QMS. Pristup, distribuciju i povlačenje kopija odobrava vlasnik procesa. Odštampani primjerak smatra se nekontrolisanim osim ako je posebno označen i evidentiran.', 'Za potvrdu pravila distribucije i kontrole.'),
        heading('1.', 'SVRHA'), body(input.purpose || '', 'Definisati jedinstven način upravljanja predmetnom aktivnošću u skladu sa zahtjevima ISO 9001:2015.'),
        heading('2.', 'PODRUČJE PRIMJENE'), body(input.scope || '', 'Procedura se primjenjuje na sve relevantne procese, uloge i dokumentovane informacije organizacije.'),
        heading('3.', 'TERMINI I DEFINICIJE'), body(input.definitions || '', 'Koristiti termine i definicije iz ISO 9001:2015 i važećeg poslovnika kvaliteta.'),
        heading('4.', 'REFERENTNA DOKUMENTA'), body(input.references || '', 'ISO 9001:2015; Poslovnik kvaliteta; Procedura upravljanja dokumentovanim informacijama; povezani obrasci i zapisi.'),
        heading('5.', 'OPIS RADA'), body(input.procedure || '', '5.1 Priprema i planiranje\n5.2 Izvršenje prema odobrenim kriterijima\n5.3 Provjera rezultata i postupanje po odstupanjima\n5.4 Čuvanje i kontrola dokumentovanih informacija'),
        heading('6.', 'ODGOVORNOSTI I OVLAŠTENJA'), body(input.responsibilities || '', 'Rukovodstvo obezbjeđuje resurse i odobrava proceduru. Vlasnik procesa održava proceduru, prati njenu primjenu i pokreće izmjene. Izvršioci postupaju prema odobrenim koracima i vode propisane zapise.'),
        heading('7.', 'DOKUMENTOVANE INFORMACIJE'), recordsTable(input.records || ''),
        heading('8.', 'PRILOZI'), body(input.appendices || '', 'Prilozi se označavaju šifrom procedure i rednim brojem, a prije upotrebe moraju imati vlasnika, verziju, status i pravila čuvanja.'),
        heading('9.', 'ISTORIJA IZMJENA I ODOBRENJE'),
        new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [new TableRow({ children: [cell('Verzija', true), cell('Datum', true), cell('Opis izmjene', true), cell('Odobrio', true)] }), new TableRow({ children: [cell('01'), cell(new Date().toLocaleDateString('bs-BA')), cell('Početni radni nacrt'), cell('Za potvrdu')] })] }),
        new Paragraph({ spacing: { before: 220 }, children: [new TextRun({ text: 'Napomena: Dokument je radni nacrt. Prije odobrenja potvrditi odgovorna lica, rokove, obrasce, zapise, distribuciju i stvarnu praksu organizacije.', italics: true, font: 'Arial', size: 18, color: muted })] }),
      ],
    }],
  })
  return Packer.toBuffer(document)
}
