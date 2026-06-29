// Parses the "Calendar of Activities" Excel sheet (e.g. MINISTRY_PLAN_2025-2026.xlsx)
// into a flat list of importable calendar events, using each row's cell fill
// color to infer the category (per the sheet's own color-guide legend).
//
// Sheet layout assumptions (matches the '2025-2026' tab as currently built):
//   Column A: day number (e.g. 15), a day range string (e.g. "17-21"),
//             or — for month-divider rows — a full date (1st of month).
//   Column B: day-of-week / time label (free text, kept as-is)
//   Column C: activity title (this cell's fill color drives the category)
//   Column D: in-charge
//   Column E: place
//   Column F: allocated budget (free text/number, kept as-is)
//
// A "month divider" row is column A containing a date AND column C empty.
// Any row with column A as a date but column C non-empty is treated as a
// normal activity on that exact date (covers a few rows in the source file
// where a full date was typed instead of a plain day number).

import * as XLSX from 'xlsx'

export type ImportCategoryName =
  | 'National'
  | 'District'
  | 'Local'
  | 'Pledges & Special Offerings'
  | 'Departmental Meetings'

export type ParsedImportEvent = {
  // One row per calendar date this event occupies (multi-day rows are
  // pre-expanded here, same convention as the app's own NewActivityDraft).
  date: string // 'YYYY-MM-DD'
  time: string // free text from column B, e.g. 'Sun | 2-5 PM'
  title: string
  inCharge: string
  place: string
  budget: string
  category: ImportCategoryName
  sourceRow: number // 1-based Excel row, for traceability in the preview UI
}

export type ImportIssue = {
  sourceRow: number
  rawDateValue: string
  title: string
  reason: string
}

export type ImportResult = {
  events: ParsedImportEvent[]
  issues: ImportIssue[]
}

// Default category color guide, used only as a fallback for newly-created
// categories during import. If a category with this name already exists in
// Firestore, its existing color is left untouched.
export const DEFAULT_CATEGORY_COLORS: Record<ImportCategoryName, string> = {
  National: '#525252',
  District: '#7c3aed',
  Local: '#16a34a',
  'Pledges & Special Offerings': '#dc2626',
  'Departmental Meetings': '#d97706',
}

// ARGB fill colors as they appear in this specific workbook's color guide.
// '00000000' is openpyxl/xlsx's representation of "no fill" (transparent),
// which this sheet uses interchangeably with explicit white for National.
const FILL_TO_CATEGORY: Record<string, ImportCategoryName> = {
  '00000000': 'National',
  FFFFFFFF: 'National',
  FFB4A7D6: 'District',
  FFB6D7A8: 'Local',
  FFEA9999: 'Pledges & Special Offerings',
  FFFFE599: 'Departmental Meetings',
}

function getFillArgb(cell: XLSX.CellObject | undefined): string {
  const fill = (cell as any)?.s?.fgColor?.rgb
  if (typeof fill === 'string') return `FF${fill}`.slice(-8).toUpperCase()
  return '00000000'
}

function categoryForCell(cell: XLSX.CellObject | undefined): ImportCategoryName {
  const argb = getFillArgb(cell)
  return FILL_TO_CATEGORY[argb] ?? 'National'
}

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

function toKey(year: number, month: number, day: number): string {
  return `${year}-${pad2(month)}-${pad2(day)}`
}

// Excel serial-date cells come through as JS Date objects when using
// { cellDates: true } on read. This converts that to a local Y/M/D triple
// without timezone drift.
function excelDateParts(value: Date): { year: number; month: number; day: number } {
  return { year: value.getFullYear(), month: value.getMonth() + 1, day: value.getDate() }
}

// Parses column A for a single row into one or more day numbers within the
// current month context. Returns null (with an issue logged by the caller)
// if the value can't be confidently parsed.
function parseDayField(
  raw: unknown,
): { kind: 'days'; days: number[] } | { kind: 'exact'; year: number; month: number; day: number } | null {
  if (raw instanceof Date) {
    const { year, month, day } = excelDateParts(raw)
    return { kind: 'exact', year, month, day }
  }
  if (typeof raw === 'number') {
    return { kind: 'days', days: [raw] }
  }
  if (typeof raw === 'string') {
    const trimmed = raw.trim()
    // Day range, e.g. "17-21" -> [17, 18, 19, 20, 21]
    const rangeMatch = trimmed.match(/^(\d{1,2})\s*-\s*(\d{1,2})$/)
    if (rangeMatch) {
      const start = Number(rangeMatch[1])
      const end = Number(rangeMatch[2])
      if (start <= end) {
        const days: number[] = []
        for (let d = start; d <= end; d++) days.push(d)
        return { kind: 'days', days }
      }
    }
    // Plain single day as a string, e.g. "15"
    if (/^\d{1,2}$/.test(trimmed)) {
      return { kind: 'days', days: [Number(trimmed)] }
    }
    // "20/27" style — two distinct days in the same month, not a range.
    const slashMatch = trimmed.match(/^(\d{1,2})\s*\/\s*(\d{1,2})$/)
    if (slashMatch) {
      return { kind: 'days', days: [Number(slashMatch[1]), Number(slashMatch[2])] }
    }
  }
  return null
}

function cellText(cell: XLSX.CellObject | undefined): string {
  if (!cell || cell.v === undefined || cell.v === null) return ''
  return String(cell.v).trim()
}

// Picks the most likely "calendar of activities" sheet when no explicit
// sheet name is given: the sheet whose column C (Activity) has the most
// non-empty rows. This avoids hardcoding a specific sheet name/template,
// so files with a differently-named sheet still import correctly.
function pickBestSheet(workbook: XLSX.WorkBook): { name: string; sheet: XLSX.WorkSheet } | null {
  let best: { name: string; sheet: XLSX.WorkSheet; score: number } | null = null

  for (const name of workbook.SheetNames) {
    const sheet = workbook.Sheets[name]
    if (!sheet || !sheet['!ref']) continue
    const range = XLSX.utils.decode_range(sheet['!ref'])
    let score = 0
    for (let r = range.s.r; r <= range.e.r; r++) {
      const cell = sheet[XLSX.utils.encode_cell({ r, c: 2 })]
      if (cell && cell.v !== undefined && cell.v !== null && String(cell.v).trim() !== '') score++
    }
    if (!best || score > best.score) best = { name, sheet, score }
  }

  return best ? { name: best.name, sheet: best.sheet } : null
}

export function parseMinistryPlanWorkbook(arrayBuffer: ArrayBuffer, sheetName?: string): ImportResult {
  const workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: true, cellStyles: true })

  let sheet: XLSX.WorkSheet | undefined
  if (sheetName) {
    sheet = workbook.Sheets[sheetName]
    if (!sheet) {
      return {
        events: [],
        issues: [{ sourceRow: 0, rawDateValue: '', title: '', reason: `Sheet "${sheetName}" not found in workbook.` }],
      }
    }
  } else {
    const picked = pickBestSheet(workbook)
    if (!picked) {
      return {
        events: [],
        issues: [{ sourceRow: 0, rawDateValue: '', title: '', reason: 'No usable sheet found in this file.' }],
      }
    }
    sheet = picked.sheet
  }

  const range = XLSX.utils.decode_range(sheet['!ref'] ?? 'A1:A1')
  const events: ParsedImportEvent[] = []
  const issues: ImportIssue[] = []

  let currentMonth: number | null = null
  let currentYear: number | null = null

  for (let r = range.s.r; r <= range.e.r; r++) {
    const rowNum = r + 1 // 1-based for human-readable references
    const cellA = sheet[XLSX.utils.encode_cell({ r, c: 0 })]
    const cellB = sheet[XLSX.utils.encode_cell({ r, c: 1 })]
    const cellC = sheet[XLSX.utils.encode_cell({ r, c: 2 })]
    const cellD = sheet[XLSX.utils.encode_cell({ r, c: 3 })]
    const cellE = sheet[XLSX.utils.encode_cell({ r, c: 4 })]
    const cellF = sheet[XLSX.utils.encode_cell({ r, c: 5 })]

    const title = cellText(cellC)

    // Header row (e.g. "DATE" / "ACTIVITY" / ...). Skip it outright rather
    // than letting it fall through to the "no date found" issue bucket.
    if (cellText(cellA).toUpperCase() === 'DATE' && title.toUpperCase() === 'ACTIVITY') {
      continue
    }

    // Month-divider row: date in column A, nothing in column C.
    if (!title && cellA?.v instanceof Date) {
      const { year, month } = excelDateParts(cellA.v)
      currentYear = year
      currentMonth = month
      continue
    }

    if (!title) continue // blank/separator row

    const parsedDay = parseDayField(cellA?.v)
    const rawDateValue = cellA?.v instanceof Date ? cellA.v.toISOString() : String(cellA?.v ?? '')

    if (!parsedDay) {
      issues.push({
        sourceRow: rowNum,
        rawDateValue,
        title,
        reason: 'Could not determine a date for this row — needs a date assigned manually.',
      })
      continue
    }

    const category = categoryForCell(cellC)
    const time = cellText(cellB)
    const inCharge = cellText(cellD)
    const place = cellText(cellE)
    const budget = cellText(cellF)

    let dateKeys: string[] = []

    if (parsedDay.kind === 'exact') {
      dateKeys = [toKey(parsedDay.year, parsedDay.month, parsedDay.day)]
    } else {
      if (currentYear === null || currentMonth === null) {
        issues.push({
          sourceRow: rowNum,
          rawDateValue,
          title,
          reason: 'No month context found before this row — needs a date assigned manually.',
        })
        continue
      }
      dateKeys = parsedDay.days.map((d) => toKey(currentYear as number, currentMonth as number, d))
    }

    for (const date of dateKeys) {
      events.push({ date, time, title, inCharge, place, budget, category, sourceRow: rowNum })
    }
  }

  return { events, issues }
} 