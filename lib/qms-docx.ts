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
  responsibilities?: string
  procedure?: string
  records?: string
  references?: string
}

const red = 'C91829'
const border = { style: BorderStyle.SINGLE, size: 4, color: 'D9DEE3' }

function cell(text: string, bold = false) {
  return new TableCell({
    borders: { top: border, bottom: border, left: border, right: border },
    children: [new Paragraph({ children: [new TextRun({ text, bold, font: 'Arial', size: 20 })] })],
  })
}

function section(title: string, body: string) {
  return [
    new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: title, bold: true, color: red, font: 'Arial' })] }),
    new Paragraph({ spacing: { after: 180 }, children: [new TextRun({ text: body || 'Za popunu nakon potvrde procesa.', font: 'Arial', size: 22 })] }),
  ]
}

export async function createQmsDocx(input: QmsDocumentInput) {
  const code = input.code || 'QP-10'
  const document = new Document({
    styles: {
      default: { document: { run: { font: 'Arial', size: 22 } } },
    },
    sections: [{
      headers: { default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: `IDSS-QMS  |  ${code}`, bold: true, color: red, font: 'Arial', size: 18 })] })] }) },
      footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Kontrolisani dokument  |  Stranica ', font: 'Arial', size: 16 }), new TextRun({ children: [PageNumber.CURRENT] })] })] }) },
      children: [
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 260 }, children: [new TextRun({ text: input.title, bold: true, color: red, font: 'Arial', size: 34 })] }),
        new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'IDSS-QMS  |  CONTROLLED DOCUMENT', bold: true, color: red, font: 'Arial', size: 20 })] }),
        new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [new TableRow({ children: [cell('Šifra', true), cell(code), cell('Verzija', true), cell('01') ] }), new TableRow({ children: [cell('Tip', true), cell(input.type), cell('Status', true), cell('NACRT ZA PREGLED') ] }), new TableRow({ children: [cell('Vlasnik', true), cell(input.owner || 'Za potvrdu'), cell('Datum', true), cell(new Date().toLocaleDateString('bs-BA')) ] })] }),
        new Paragraph({ text: '' }),
        ...section('1. SVRHA', input.purpose || 'Definisati jedinstven način upravljanja predmetnom aktivnošću u skladu sa zahtjevima ISO 9001:2015.'),
        ...section('2. PODRUČJE PRIMJENE', input.scope || 'Primjenjuje se na relevantne procese, uloge i zapise organizacije.'),
        ...section('3. ODGOVORNOSTI', input.responsibilities || 'Rukovodstvo odobrava dokument; vlasnik procesa ga primjenjuje i održava; zaposleni vode propisane zapise.'),
        ...section('4. POSTUPAK', input.procedure || '4.1 Zahtjev i planiranje\n4.2 Izvršenje prema odobrenim kriterijima\n4.3 Provjera rezultata i postupanje po odstupanjima\n4.4 Čuvanje i kontrola zapisa'),
        ...section('5. ZAPISI', input.records || 'Naziv zapisa | Odgovorno lice | Mjesto čuvanja | Rok čuvanja\nZa popunu nakon potvrde organizacije.'),
        ...section('6. REFERENCE I PRILOZI', input.references || 'ISO 9001:2015 i povezani IDSS-QMS kontrolisani dokumenti.'),
        new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: '7. ISTORIJA IZMJENA I ODOBRENJE', bold: true, color: red, font: 'Arial' })] }),
        new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [new TableRow({ children: [cell('Verzija', true), cell('Datum', true), cell('Opis izmjene', true), cell('Odobrio', true)] }), new TableRow({ children: [cell('01'), cell(new Date().toLocaleDateString('bs-BA')), cell('Početni radni nacrt'), cell('Za potvrdu')] })] }),
        new Paragraph({ spacing: { before: 220 }, children: [new TextRun({ text: 'Napomena: Dokument je radni nacrt. Prije odobrenja potvrditi odgovorna lica, rokove, obrasce i stvarnu praksu.', italics: true, font: 'Arial', size: 18 })] }),
      ],
    }],
  })
  return Packer.toBuffer(document)
}
