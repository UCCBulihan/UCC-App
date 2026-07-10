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
//
// IMPORTANT — category colors are NOT assumed to be stable across files.
// Different years' workbooks have reused the same "color guide" idea but
// swapped which color means which category (e.g. District/Local swapped
// between the 2025-2026 and 2026-2027 templates), and some add categories
// that didn't exist before (e.g. "Mission"). So on every import we first
// look for the sheet's own color-guide legend (a row near the top where
// each category name is typed into a cell shaded with its own color) and
// build the color->category mapping from THAT, specific to this file. The
// static FILL_TO_CATEGORY table below is only a fallback for files that
// don't have a machine-readable legend (older files where the "color
// guide" was just descriptive text, not individually-colored cells).

import * as XLSX from 'xlsx'

// No longer a fixed set — categories are whatever names the workbook's own
// legend defines (plus whatever already exists in Firestore). Kept as a
// named type (rather than switching every call site to plain `string`) so
// intent stays clear at call sites.
export type ImportCategoryName = string

export type CategoryDefaults = {
  color: string
  icon: string
}

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
  // False when this row's color didn't exactly match a legend entry and
  // had to be resolved via closest-color guessing. Combined with
  // categoryMatchDistance, lets the conflicts step decide whether to
  // trust the guess silently or ask the user to confirm/reassign it.
  categoryExactMatch: boolean
  categoryMatchDistance: number
  sourceRow: number // 1-based Excel row, for traceability in the preview UI
}

export type ImportIssue = {
  sourceRow: number
  rawDateValue: string
  title: string
  reason: string
}

export type UncertainCategoryRow = {
  sourceRow: number
  title: string
  guessedCategory: ImportCategoryName
  distance: number
}

export type ImportResult = {
  events: ParsedImportEvent[]
  issues: ImportIssue[]
  // Default color/icon for every category this file's legend (or fallback
  // table) defines — including brand-new ones like "Mission" that don't
  // exist in Firestore yet. Keyed by category name. Callers should use
  // this instead of any hardcoded color/icon table when creating new
  // categories or rendering preview swatches, since colors are specific
  // to the file that was just parsed.
  categoryDefaults: Record<string, CategoryDefaults>
  // Rows whose category couldn't be matched exactly against the legend
  // and whose closest-color guess wasn't confident enough to trust
  // silently (see CONFIDENT_MATCH_DISTANCE). The row still gets the
  // guessed category by default, but callers should let the user review
  // and override these before importing.
  uncertainRows: UncertainCategoryRow[]
}

// Fallback icon for a small set of well-known category names — applied
// only when a file's legend introduces one of these names but doesn't
// (can't) specify an icon of its own, since icons aren't color-codeable.
// Anything outside this list defaults to no icon (a plain color dot in
// the UI), which is a perfectly valid look and avoids guessing wrong.
const KNOWN_CATEGORY_ICONS: Record<string, string> = {
  National: 'fa-solid fa-globe',
  District: 'fa-solid fa-map-marker-alt',
  Local: 'fa-solid fa-church',
  'Pledges & Special Offerings': 'fa-solid fa-hand-holding-dollar',
  'Departmental Meetings': 'fa-solid fa-briefcase',
}

// Retained for backwards compatibility with any existing callers/imports
// elsewhere in the app. New code should prefer the per-file
// `categoryDefaults` returned by parseMinistryPlanWorkbook instead, since
// these static tables can't reflect a given file's actual legend colors
// or categories it doesn't know about (e.g. "Mission").
export const DEFAULT_CATEGORY_COLORS: Record<string, string> = {
  National: '#525252',
  District: '#7c3aed',
  Local: '#16a34a',
  'Pledges & Special Offerings': '#dc2626',
  'Departmental Meetings': '#d97706',
}

export const DEFAULT_CATEGORY_ICONS: Record<string, string> = KNOWN_CATEGORY_ICONS

// Fallback ARGB fill colors, used only when a workbook has no
// machine-readable color-guide legend of its own (see header comment).
// '00000000' is openpyxl/xlsx's representation of "no fill" (transparent),
// which older sheets used interchangeably with explicit white for National.
const FALLBACK_FILL_TO_CATEGORY: Record<string, ImportCategoryName> = {
  '000000': 'National', // no-fill / transparent, normalized
  FFFFFF: 'National',
  B4A7D6: 'District',
  B6D7A8: 'Local',
  EA9999: 'Pledges & Special Offerings',
  FFE599: 'Departmental Meetings',
}

// Normalizes any color string xlsx/openpyxl might hand back — 6-char RGB
// ("B4A7D6"), 8-char ARGB with alpha first ("FFB4A7D6"), or 8-char ARGB
// with a different/zeroed alpha byte ("00B4A7D6", seen in some workbooks
// exported by other tools) — down to a plain 6-char RGB, uppercase. Alpha
// is intentionally ignored: it varies between files/exporters for reasons
// that have nothing to do with the actual highlight color the sheet's
// author picked.
function normalizeRgb6(raw: string | undefined | null): string | null {
  if (!raw || typeof raw !== 'string') return null
  const hex = raw.replace(/[^0-9a-fA-F]/g, '')
  if (hex.length < 6) return null
  return hex.slice(-6).toUpperCase()
}

function getCellRgb6(cell: XLSX.CellObject | undefined): string | null {
  const fill = (cell as any)?.s?.fgColor?.rgb
  return normalizeRgb6(typeof fill === 'string' ? fill : undefined)
}

function cellText(cell: XLSX.CellObject | undefined): string {
  if (!cell || cell.v === undefined || cell.v === null) return ''
  return String(cell.v).trim()
}

function rgbDistance(a: string, b: string): number {
  const ar = parseInt(a.slice(0, 2), 16)
  const ag = parseInt(a.slice(2, 4), 16)
  const ab = parseInt(a.slice(4, 6), 16)
  const br = parseInt(b.slice(0, 2), 16)
  const bg = parseInt(b.slice(2, 4), 16)
  const bb = parseInt(b.slice(4, 6), 16)
  return Math.sqrt((ar - br) ** 2 + (ag - bg) ** 2 + (ab - bb) ** 2)
}

// Scans the top of the sheet for a "color guide" legend: a row where at
// least two cells each hold a short category name AND are shaded with a
// distinct, non-transparent fill color. Returns the map of normalized
// RGB6 -> category name AND that row's index (0-based, matching `range`),
// so the main parsing loop can skip it outright — otherwise its own
// label cells (e.g. column A = "National", column C = "Local") get
// mistaken for an ordinary activity row with an unparseable date.
// Returns null if no such row is found (older files typed the legend as
// one plain paragraph of text instead of individually colored cells,
// which this can't machine-read).
function findLegendMap(sheet: XLSX.WorkSheet, range: XLSX.Range): { map: Map<string, string>; rowIndex: number } | null {
  const searchEndRow = Math.min(range.e.r, range.s.r + 25)

  // Prefer scanning near an explicit "Color Guide" label if we can find
  // one, but fall back to scanning the whole top-of-sheet window
  // regardless — the label wording isn't guaranteed either.
  for (let r = range.s.r; r <= searchEndRow; r++) {
    const candidates: { rgb: string; name: string }[] = []
    for (let c = range.s.c; c <= Math.min(range.e.c, range.s.c + 12); c++) {
      const cell = sheet[XLSX.utils.encode_cell({ r, c })]
      const text = cellText(cell)
      const rgb = getCellRgb6(cell)
      if (!text || !rgb) continue
      if (text.length > 45 || text.includes('\n')) continue // not a short legend label
      const upper = text.toUpperCase()
      if (upper === 'DATE' || upper === 'ACTIVITY' || upper === 'DAY' || upper === 'IN-CHARGE' || upper === 'PLACE') continue
      candidates.push({ rgb, name: text })
    }
    // A real legend row has several distinctly-colored short labels next
    // to each other. Require at least 2 distinct colors to avoid false
    // positives on ordinary single-color header rows.
    const distinctColors = new Set(candidates.map((c) => c.rgb))
    if (candidates.length >= 2 && distinctColors.size >= 2) {
      const map = new Map<string, string>()
      for (const { rgb, name } of candidates) map.set(rgb, name)
      return { map, rowIndex: r }
    }
  }

  return null
}

// A closest-color match under this RGB distance (out of a max of ~441) is
// treated as a confident, silent auto-correction — e.g. a cell that's
// clearly the same intended color with minor export/rounding drift. Above
// it, the match is too much of a guess to apply silently, so the row gets
// flagged in the conflicts step for the user to confirm or reassign.
const CONFIDENT_MATCH_DISTANCE = 50

type CategoryResolution = {
  category: ImportCategoryName
  exact: boolean
  distance: number // 0 for exact matches
}

// Resolves a cell's category using the file's own legend when available,
// exact-matching first, then falling back to the closest legend color by
// RGB distance (handles stray/off-guide colors like a manually-tweaked
// cell that's close to, but not exactly, one of the legend's colors).
// Only falls all the way back to 'National' when there's no fill at all.
function resolveCategory(rgb6: string | null, legend: Map<string, string>): CategoryResolution {
  if (!rgb6) return { category: 'National', exact: true, distance: 0 }
  const exact = legend.get(rgb6)
  if (exact) return { category: exact, exact: true, distance: 0 }

  let best: { name: string; dist: number } | null = null
  for (const [legendRgb, name] of legend) {
    const dist = rgbDistance(rgb6, legendRgb)
    if (!best || dist < best.dist) best = { name, dist }
  }
  if (!best) return { category: 'National', exact: true, distance: 0 }
  return { category: best.name, exact: false, distance: best.dist }
}

// Levenshtein edit distance, used only for detecting "probably the same
// category, slightly different spelling" (e.g. "and" vs "&") — not for
// the exact/case/whitespace matching that normalizeCategoryKey covers.
function levenshtein(a: string, b: string): number {
  const dp: number[][] = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0))
  for (let i = 0; i <= a.length; i++) dp[i][0] = i
  for (let j = 0; j <= b.length; j++) dp[0][j] = j
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] : 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1])
    }
  }
  return dp[a.length][b.length]
}

// Returns a 0–1 similarity score between two category names (1 = identical
// once case/whitespace-normalized, 0 = nothing alike). Used to surface
// "possible duplicate" conflicts — e.g. a file's "Pledges and Special
// Offering" vs an existing "Pledges & Special Offerings" — without
// silently merging them and without treating every genuinely-new category
// name as a false alarm.
export function categoryNameSimilarity(a: string, b: string): number {
  const na = normalizeCategoryKey(a)
  const nb = normalizeCategoryKey(b)
  if (na === nb) return 1
  const dist = levenshtein(na, nb)
  const maxLen = Math.max(na.length, nb.length) || 1
  return 1 - dist / maxLen
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

const MONTH_NAME_TO_NUMBER: Record<string, number> = {
  january: 1, jan: 1,
  february: 2, feb: 2,
  march: 3, mar: 3,
  april: 4, apr: 4,
  may: 5,
  june: 6, jun: 6,
  july: 7, jul: 7,
  august: 8, aug: 8,
  september: 9, sep: 9, sept: 9,
  october: 10, oct: 10,
  november: 11, nov: 11,
  december: 12, dec: 12,
}

// Some templates use an actual Excel date for month-divider rows (older
// template); others just type the month as plain text, e.g. "JUNE 2026"
// (newer template — the '2026-2027' file has none of these as real
// dates at all). Matches "<month name> <4-digit year>" exactly, so it
// doesn't misfire on other header/footer text elsewhere on the sheet
// (multi-word titles, "2026-2027" ranges, budget lines, etc.).
function parseMonthYearText(raw: string): { year: number; month: number } | null {
  const match = raw.trim().match(/^([A-Za-z]+)\.?\s+(\d{4})$/)
  if (!match) return null
  const month = MONTH_NAME_TO_NUMBER[match[1].toLowerCase()]
  if (!month) return null
  return { year: Number(match[2]), month }
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

function buildCategoryDefaults(legend: Map<string, string>): Record<string, CategoryDefaults> {
  const defaults: Record<string, CategoryDefaults> = {}
  for (const [rgb6, name] of legend) {
    defaults[name] = {
      color: `#${rgb6.toLowerCase()}`,
      icon: KNOWN_CATEGORY_ICONS[name] ?? '',
    }
  }
  return defaults
}

// Normalizes a category name for MATCHING purposes only — never for
// display. Case differences ("MISSION" vs "Mission"), extra/missing
// spaces, and leading/trailing whitespace shouldn't cause a file's legend
// to be treated as introducing a brand-new category when an equivalent
// one already exists in Firestore. Callers should still show/store the
// original (un-normalized) spelling.
export function normalizeCategoryKey(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ')
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
        categoryDefaults: {},
        uncertainRows: [],
      }
    }
  } else {
    const picked = pickBestSheet(workbook)
    if (!picked) {
      return {
        events: [],
        issues: [{ sourceRow: 0, rawDateValue: '', title: '', reason: 'No usable sheet found in this file.' }],
        categoryDefaults: {},
        uncertainRows: [],
      }
    }
    sheet = picked.sheet
  }

  const range = XLSX.utils.decode_range(sheet['!ref'] ?? 'A1:A1')

  // Prefer this file's own legend; fall back to the static table (already
  // normalized to 6-char RGB keys) for files without a colored legend row.
  const legendResult = findLegendMap(sheet, range)
  const legend = legendResult?.map ?? new Map(Object.entries(FALLBACK_FILL_TO_CATEGORY))
  const legendRowIndex = legendResult?.rowIndex ?? null
  const categoryDefaults = buildCategoryDefaults(legend)

  const events: ParsedImportEvent[] = []
  const issues: ImportIssue[] = []
  const uncertainRows: UncertainCategoryRow[] = []

  let currentMonth: number | null = null
  let currentYear: number | null = null

  for (let r = range.s.r; r <= range.e.r; r++) {
    if (legendRowIndex !== null && r === legendRowIndex) continue // the legend row's own cells, not an activity

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

    // Month-divider row: nothing in column C, and column A is either a
    // real date (older template) or a plain "MONTH YEAR" text label
    // (newer template, e.g. "JUNE 2026"). Anything else with an empty
    // title — blank rows, footer/signature lines — is just skipped.
    if (!title) {
      if (cellA?.v instanceof Date) {
        const { year, month } = excelDateParts(cellA.v)
        currentYear = year
        currentMonth = month
        continue
      }
      const monthYear = parseMonthYearText(cellText(cellA))
      if (monthYear) {
        currentYear = monthYear.year
        currentMonth = monthYear.month
        continue
      }
      continue // blank/separator row
    }

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

    const resolution = resolveCategory(getCellRgb6(cellC), legend)
    const time = cellText(cellB)
    const inCharge = cellText(cellD)
    const place = cellText(cellE)
    const budget = cellText(cellF)

    if (!resolution.exact && resolution.distance > CONFIDENT_MATCH_DISTANCE) {
      uncertainRows.push({
        sourceRow: rowNum,
        title,
        guessedCategory: resolution.category,
        distance: resolution.distance,
      })
    }

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
      events.push({
        date,
        time,
        title,
        inCharge,
        place,
        budget,
        category: resolution.category,
        categoryExactMatch: resolution.exact,
        categoryMatchDistance: resolution.distance,
        sourceRow: rowNum,
      })
    }
  }

  return { events, issues, categoryDefaults, uncertainRows }
}