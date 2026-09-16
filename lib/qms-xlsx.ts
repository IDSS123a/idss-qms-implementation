import { utils, write } from 'xlsx'

export type QmsWorkbookInput = {
  title: string
  code: string
  version?: string
  status?: string
  owner?: string
  date?: string
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

const bosnianLines = (value = '') => value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
const safe = (value: string | undefined, fallback = 'Nije uneseno') => value?.trim() || fallback

function applySheetLayout(sheet: ReturnType<typeof utils.aoa_to_sheet>, widths: number[]) {
  sheet['!cols'] = widths.map((wch) => ({ wch }))
  sheet['!rows'] = [{ hpt: 28 }, ...Array(80).fill({ hpt: 20 })]
}

export function createQmsWorkbook(input: QmsWorkbookInput) {
  const workbook = utils.book_new()
  const title = safe(input.title, 'Kontrolisani dokument')
  const code = safe(input.code, 'QP-XX')
  const version = safe(input.version, '01')
  const status = safe(input.status, 'NACRT ZA PREGLED')
  const date = safe(input.date, new Date().toLocaleDateString('bs-BA'))

  const cover = utils.aoa_to_sheet([
    ['IDSS-QMS', 'KONTROLISANI DOKUMENT'],
    ['Naziv dokumenta', title],
    ['Šifra dokumenta', code],
    ['Verzija', version],
    ['Status', status],
    ['Vlasnik dokumenta', safe(input.owner)],
    ['Datum', date],
    [],
    ['Napomena o kontroli', 'Ovaj radni dokument podliježe pregledu, odobrenju, kontroli verzije i kontroli pristupa u sistemu IDSS-QMS.'],
    ['Izradio', 'IDSS-QMS'],
  ])
  applySheetLayout(cover, [28, 85])
  utils.book_append_sheet(workbook, cover, 'Naslovnica')

  const control = utils.aoa_to_sheet([
    ['KONTROLA DOKUMENTA', ''],
    ['Naziv dokumenta', title], ['Šifra', code], ['Verzija', version], ['Status', status], ['Datum stupanja na snagu', date],
    ['Vlasnik procesa', safe(input.owner)], ['Distribucija', safe(input.distribution)],
    [], ['ISTORIJA IZMJENA', ''], ['Verzija', 'Opis izmjene', 'Datum', 'Odobrio'], ['01', 'Početno izdanje / nacrt za pregled', date, 'Za potvrdu'],
    [], ['ODOBRENJE', ''], ['Pregledao', 'Za potvrdu'], ['Odobrio', 'Za potvrdu'], ['Datum odobrenja', 'Za potvrdu'],
  ])
  control['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 1 } }, { s: { r: 9, c: 0 }, e: { r: 9, c: 3 } }, { s: { r: 13, c: 0 }, e: { r: 13, c: 1 } }]
  applySheetLayout(control, [32, 52, 20, 24])
  utils.book_append_sheet(workbook, control, 'Kontrola dokumenta')

  const procedureRows: (string | number)[][] = [
    ['PROCEDURA', ''], ['Naziv', title], ['Šifra', code], ['Verzija', version], [],
    ['1. SVRHA', safe(input.purpose)], ['2. PODRUČJE PRIMJENE', safe(input.scope)], ['3. TERMINI I DEFINICIJE', safe(input.definitions)],
    ['4. ODGOVORNOSTI I OVLAŠTENJA', safe(input.responsibilities)], ['5. OPIS RADA / POSTUPAK', ''],
    ...bosnianLines(input.procedure).map((line, index) => [`5.${index + 1}`, line]),
    [], ['6. DOKUMENTOVANE INFORMACIJE', safe(input.records)], ['7. REFERENCE', safe(input.references)], ['8. PRILOZI', safe(input.appendices)],
  ]
  const procedure = utils.aoa_to_sheet(procedureRows)
  procedure['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 1 } }]
  applySheetLayout(procedure, [34, 115])
  utils.book_append_sheet(workbook, procedure, 'Procedura')

  const records = utils.aoa_to_sheet([
    ['DOKUMENTOVANE INFORMACIJE', '', '', ''], ['Naziv zapisa / obrasca', 'Oznaka', 'Rok čuvanja', 'Mjesto čuvanja'],
    ...bosnianLines(input.records).map((record, index) => [record, `${code}.ZP-${String(index + 1).padStart(2, '0')}`, 'Za potvrdu', 'Arhiva IDSS-QMS']),
    ...(bosnianLines(input.records).length ? [] : [['Za dopunu prema stvarnoj praksi', 'Za potvrdu', 'Za potvrdu', 'Za potvrdu']]),
  ])
  applySheetLayout(records, [48, 24, 24, 34])
  utils.book_append_sheet(workbook, records, 'Zapisi i obrasci')

  const appendices = utils.aoa_to_sheet([
    ['PRILOZI I PRATEĆI DOKUMENTI', ''], ['Naziv', 'Status'],
    ...bosnianLines(input.appendices).map((item) => [item, 'Za izradu / potvrdu']),
    ...(bosnianLines(input.appendices).length ? [] : [['Prateći obrazac, kontrolna lista ili registar', 'Za definisanje']]),
  ])
  applySheetLayout(appendices, [80, 28])
  utils.book_append_sheet(workbook, appendices, 'Prilozi')

  return write(workbook, { type: 'buffer', bookType: 'xlsx' })
}
