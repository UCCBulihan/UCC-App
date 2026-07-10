import { useState, type ChangeEvent, type CSSProperties } from 'react'
import {
  collection,
  addDoc,
  doc,
  updateDoc,
  writeBatch,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from '../../firebase/firebase'
import {
  parseMinistryPlanWorkbook,
  normalizeCategoryKey,
  categoryNameSimilarity,
  type ParsedImportEvent,
  type ImportIssue,
  type ImportCategoryName,
  type CategoryDefaults,
  type UncertainCategoryRow,
} from './importExcel'
import { getIconColor } from './categoryIcons'

type Category = {
  id: string
  name: string
  color: string
  icon?: string
}

type Props = {
  categories: Category[]
  onClose: () => void
  // Called after a successful import so the calendar can refresh its
  // category list (in case new ones were created) without a full reload.
  // Receives the earliest imported date ('YYYY-MM-DD'), if any, so the
  // calendar can jump straight to the month where the activities landed
  // — otherwise they'd be invisible if you're viewing a different month.
  onImported: (firstImportedDate?: string) => void
}

type RowState = ParsedImportEvent & {
  included: boolean
}

// A category name in this file that doesn't exactly match an existing one
// but is close enough in spelling that it might be the same category,
// typed slightly differently (e.g. "and" vs "&"). Purely a suggestion —
// the user decides whether to merge or keep it separate.
type NameConflict = {
  fileCategory: string
  suggestedExisting: Category
  similarity: number
}
type NameConflictResolution = 'use_existing' | 'create_new'

// An existing category whose stored color doesn't match the color this
// file's own legend assigns to the same category name.
type ColorConflict = {
  category: string
  existingColor: string
  fileColor: string
}
type ColorConflictResolution = 'keep' | 'update'

type Step = 'pick' | 'conflicts' | 'preview' | 'saving' | 'done' | 'error'

// A closest-color guess is only trusted silently up to this point (see
// CONFIDENT_MATCH_DISTANCE in importExcel.ts) — this is just the display
// threshold check, kept in sync conceptually, not a separate tunable.
const NAME_SIMILARITY_CONFLICT_THRESHOLD = 0.6

export default function ImportActivitiesModal({ categories, onClose, onImported }: Props) {
  const [step, setStep] = useState<Step>('pick')
  const [fileName, setFileName] = useState<string | null>(null)
  const [rows, setRows] = useState<RowState[]>([])
  const [issues, setIssues] = useState<ImportIssue[]>([])
  // Default color/icon per category as defined by THIS file's own legend
  // (falls back to the built-in table only for files with no colored
  // legend row — see importExcel.ts). Colors and even which categories
  // exist can differ from one imported file to the next, so this is
  // re-derived on every parse rather than using a fixed table.
  const [categoryDefaults, setCategoryDefaults] = useState<Record<string, CategoryDefaults>>({})
  const [issueDates, setIssueDates] = useState<Record<number, string>>({})
  const [parseError, setParseError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [savedCount, setSavedCount] = useState(0)
  const [saveProgress, setSaveProgress] = useState<{ done: number; total: number }>({ done: 0, total: 0 })

  // Conflicts detected right after parsing, and the user's decision for
  // each (pre-filled with a safe default so "Continue" always works even
  // if the user doesn't touch anything).
  const [nameConflicts, setNameConflicts] = useState<NameConflict[]>([])
  const [nameConflictResolutions, setNameConflictResolutions] = useState<Record<string, NameConflictResolution>>({})
  const [colorConflicts, setColorConflicts] = useState<ColorConflict[]>([])
  const [colorConflictResolutions, setColorConflictResolutions] = useState<Record<string, ColorConflictResolution>>({})
  const [uncertainRows, setUncertainRows] = useState<UncertainCategoryRow[]>([])
  const [uncertainRowResolutions, setUncertainRowResolutions] = useState<Record<number, string>>({})

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    setParseError(null)

    const reader = new FileReader()
    reader.onload = () => {
      try {
        const buffer = reader.result as ArrayBuffer
        const {
          events,
          issues: parsedIssues,
          categoryDefaults: parsedDefaults,
          uncertainRows: parsedUncertain,
        } = parseMinistryPlanWorkbook(buffer)
        if (events.length === 0 && parsedIssues.length === 0) {
          setParseError('No activities were found in this file. Make sure it has a "2025-2026" sheet in the expected format.')
          return
        }
        setRows(events.map((e) => ({ ...e, included: true })))
        setIssues(parsedIssues)
        setCategoryDefaults(parsedDefaults)
        setIssueDates({})
        setUncertainRows(parsedUncertain)
        setUncertainRowResolutions(Object.fromEntries(parsedUncertain.map((u) => [u.sourceRow, u.guessedCategory])))

        const byNormalized = new Map(categories.map((c) => [normalizeCategoryKey(c.name), c]))
        const usedNames = Array.from(new Set(events.map((e) => e.category)))
        const brandNewNames = usedNames.filter((n) => !byNormalized.has(normalizeCategoryKey(n)))

        // A brand-new category name might just be a slightly different
        // spelling of one that already exists (e.g. "and" vs "&") — flag
        // those for review instead of silently creating a near-duplicate.
        const detectedNameConflicts: NameConflict[] = []
        for (const name of brandNewNames) {
          let best: { cat: Category; sim: number } | null = null
          for (const c of categories) {
            const sim = categoryNameSimilarity(name, c.name)
            if (!best || sim > best.sim) best = { cat: c, sim }
          }
          if (best && best.sim >= NAME_SIMILARITY_CONFLICT_THRESHOLD) {
            detectedNameConflicts.push({ fileCategory: name, suggestedExisting: best.cat, similarity: best.sim })
          }
        }

        // For names that DO match an existing category, check whether
        // this file's own legend disagrees with the color already saved
        // for that category.
        const detectedColorConflicts: ColorConflict[] = []
        for (const name of usedNames) {
          const existing = byNormalized.get(normalizeCategoryKey(name))
          if (!existing) continue
          const fileColor = parsedDefaults[name]?.color
          if (!fileColor || !existing.color) continue
          if (fileColor.toLowerCase() !== existing.color.toLowerCase()) {
            detectedColorConflicts.push({ category: name, existingColor: existing.color, fileColor })
          }
        }

        setNameConflicts(detectedNameConflicts)
        setNameConflictResolutions(Object.fromEntries(detectedNameConflicts.map((c) => [c.fileCategory, 'create_new'])))
        setColorConflicts(detectedColorConflicts)
        setColorConflictResolutions(Object.fromEntries(detectedColorConflicts.map((c) => [c.category, 'keep'])))

        const hasConflicts =
          detectedNameConflicts.length > 0 || detectedColorConflicts.length > 0 || parsedUncertain.length > 0
        setStep(hasConflicts ? 'conflicts' : 'preview')
      } catch (err) {
        setParseError('Could not read this file. Make sure it is a valid .xlsx file exported from the ministry plan template.')
      }
    }
    reader.onerror = () => {
      setParseError('Could not read this file. Please try again.')
    }
    reader.readAsArrayBuffer(file)
  }

  function handleContinueFromConflicts() {
    // Bakes the user's conflict decisions into the row data before moving
    // on: name-conflict rows get remapped to the existing category's
    // canonical spelling if merged, and uncertain rows get whatever
    // category the user confirmed or reassigned.
    setRows((prev) =>
      prev.map((r) => {
        let category = r.category

        const nameConflict = nameConflicts.find((c) => c.fileCategory === r.category)
        if (nameConflict && nameConflictResolutions[nameConflict.fileCategory] === 'use_existing') {
          category = nameConflict.suggestedExisting.name
        }

        const isUncertainRow = uncertainRows.some((u) => u.sourceRow === r.sourceRow)
        if (isUncertainRow && uncertainRowResolutions[r.sourceRow]) {
          category = uncertainRowResolutions[r.sourceRow]
        }

        return category === r.category ? r : { ...r, category }
      }),
    )
    setStep('preview')
  }

  function toggleRow(index: number) {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, included: !r.included } : r)))
  }

  function toggleAll(included: boolean) {
    setRows((prev) => prev.map((r) => ({ ...r, included })))
  }

  function updateIssueDate(sourceRow: number, date: string) {
    setIssueDates((prev) => ({ ...prev, [sourceRow]: date }))
  }

  const includedCount = rows.filter((r) => r.included).length
  // Matched loosely (case/whitespace-insensitive) so a file whose legend
  // spells a category "MISSION" or "Mission " still resolves to an
  // existing "Mission" category instead of creating a near-duplicate.
  const categoryByNormalizedName = new Map(categories.map((c) => [normalizeCategoryKey(c.name), c]))
  const usedCategoryNames = new Set<ImportCategoryName>(rows.filter((r) => r.included).map((r) => r.category))
  const newCategoryNames = Array.from(usedCategoryNames).filter(
    (name) => !categoryByNormalizedName.has(normalizeCategoryKey(name)),
  )
  // Every category name any row in this file could end up under, for the
  // "reassign this row" dropdown in the conflicts step.
  const allCategoryOptions = Array.from(
    new Set([...categories.map((c) => c.name), ...Object.keys(categoryDefaults)]),
  ).sort((a, b) => a.localeCompare(b))

  async function ensureCategoriesExist(): Promise<Map<string, string>> {
    // Returns a map of category name (as it appears on the parsed rows)
    // -> Firestore doc id, creating any categories that don't already
    // exist. Existing categories are matched loosely by name so minor
    // spelling/casing differences from the file's legend don't spawn
    // duplicates.
    const idByName = new Map<string, string>()
    for (const name of usedCategoryNames) {
      const existing = categoryByNormalizedName.get(normalizeCategoryKey(name))
      if (!existing) continue
      idByName.set(name, existing.id)

      // If the user confirmed updating this category's color to match
      // what this file's legend shows, apply it now.
      const colorConflict = colorConflicts.find((c) => c.category === name)
      if (colorConflict && colorConflictResolutions[colorConflict.category] === 'update') {
        await updateDoc(doc(db, 'CATEGORIES', existing.id), { color: colorConflict.fileColor })
      }
    }

    for (const name of newCategoryNames) {
      // Falls back to a neutral gray only if this category somehow isn't
      // in categoryDefaults either (shouldn't happen — every category a
      // row can resolve to comes from the same legend that built this
      // map — but better a plain gray than a broken Firestore write).
      const defaults = categoryDefaults[name]
      const docRef = await addDoc(collection(db, 'CATEGORIES'), {
        name,
        color: defaults?.color ?? '#888888',
        icon: defaults?.icon ?? '',
        createdAt: serverTimestamp(),
      })
      idByName.set(name, docRef.id)
    }

    return idByName
  }

  // Firestore allows at most 500 writes per batch — stay comfortably under
  // that so a single commit never gets rejected for size.
  const BATCH_LIMIT = 450

  async function handleConfirmImport() {
    setStep('saving')
    setSaveError(null)
    setSaveProgress({ done: 0, total: 0 })

    try {
      const idByName = await ensureCategoriesExist()

      // Resolve the final (row, date) pairs to save first, so the progress
      // total reflects only what's actually going to be written.
      const toSave: { row: RowState; date: string }[] = []
      for (const row of rows) {
        if (!row.included) continue

        // Rows with an unresolved date issue are skipped unless the user
        // supplied a date for them in the preview screen.
        const isIssueRow = issues.some((i) => i.sourceRow === row.sourceRow)
        const date = isIssueRow ? issueDates[row.sourceRow] : row.date
        if (!date) continue

        toSave.push({ row, date })
      }

      setSaveProgress({ done: 0, total: toSave.length })

      let count = 0
      let firstImportedDate: string | undefined

      // Commit in chunks instead of one addDoc per row (which was awaiting
      // a full network round-trip per activity — painfully slow for a
      // full year's worth of rows). Each chunk is a single round-trip.
      for (let i = 0; i < toSave.length; i += BATCH_LIMIT) {
        const chunk = toSave.slice(i, i + BATCH_LIMIT)
        const batch = writeBatch(db)

        for (const { row, date } of chunk) {
          const ref = doc(collection(db, 'CALENDAR_EVENTS'))
          batch.set(ref, {
            title: row.title,
            date,
            time: row.time || 'Whole day',
            categoryId: idByName.get(row.category) ?? null,
            inCharge: row.inCharge || null,
            place: row.place || null,
            budget: row.budget || null,
            createdAt: serverTimestamp(),
          })
          if (!firstImportedDate || date < firstImportedDate) firstImportedDate = date
        }

        await batch.commit()
        count += chunk.length
        setSaveProgress({ done: count, total: toSave.length })
      }

      setSavedCount(count)
      setStep('done')
      onImported(firstImportedDate)
    } catch (err) {
      setSaveError('Something went wrong while saving. Some activities may not have been imported — please check your calendar before retrying.')
      setStep('error')
    }
  }

  // Rows that have a parse issue (no usable date) are rendered separately
  // at the top of the preview so they can't be missed.
  const issueRows = rows.filter((r) => issues.some((i) => i.sourceRow === r.sourceRow))
  const normalRows = rows.filter((r) => !issues.some((i) => i.sourceRow === r.sourceRow))

  return (
    <div className="calendar-modal-overlay" onClick={onClose}>
      <div
        className="calendar-modal calendar-modal-wide"
        role="dialog"
        aria-modal="true"
        aria-labelledby="import-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="calendar-modal-header">
          <h2 className="calendar-modal-title" id="import-modal-title">
            Import activities from Excel
          </h2>
          <button type="button" className="calendar-modal-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        {step === 'pick' && (
          <div className="calendar-modal-body">
            <p className="calendar-import-hint">
              Select an Excel (.xlsx) file with your activities. Each row's highlight color is used to assign it a
              category.
            </p>
            <label className="calendar-import-filepicker">
              <input type="file" accept=".xlsx" onChange={handleFileChange} />
              {fileName ? `Selected: ${fileName}` : 'Choose .xlsx file'}
            </label>
            {parseError && <p className="calendar-field-error">{parseError}</p>}
          </div>
        )}

        {step === 'conflicts' && (
          <>
            <div className="calendar-modal-body calendar-import-preview">
              <p className="calendar-import-hint">
                A few things in this file need a quick decision before importing. Sensible defaults are already
                selected — change any of them if needed, then continue.
              </p>

              {nameConflicts.length > 0 && (
                <div className="calendar-import-issues">
                  <h3 className="calendar-import-issues-title">Possible duplicate categories ({nameConflicts.length})</h3>
                  <p className="calendar-import-hint">
                    These category names from the file don't exactly match an existing one, but look similar.
                  </p>
                  <div className="calendar-conflict-list">
                    {nameConflicts.map((c) => (
                      <div key={c.fileCategory} className="calendar-conflict-card">
                        <p className="calendar-conflict-card-title">
                          "{c.fileCategory}" (from file) vs existing "{c.suggestedExisting.name}"
                        </p>
                        <div className="calendar-conflict-options">
                          <label className="calendar-conflict-option">
                            <input
                              type="radio"
                              name={`name-conflict-${c.fileCategory}`}
                              checked={nameConflictResolutions[c.fileCategory] !== 'use_existing'}
                              onChange={() =>
                                setNameConflictResolutions((prev) => ({ ...prev, [c.fileCategory]: 'create_new' }))
                              }
                            />
                            Create as new category
                          </label>
                          <label className="calendar-conflict-option">
                            <input
                              type="radio"
                              name={`name-conflict-${c.fileCategory}`}
                              checked={nameConflictResolutions[c.fileCategory] === 'use_existing'}
                              onChange={() =>
                                setNameConflictResolutions((prev) => ({ ...prev, [c.fileCategory]: 'use_existing' }))
                              }
                            />
                            Use existing "{c.suggestedExisting.name}"
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {colorConflicts.length > 0 && (
                <div className="calendar-import-issues">
                  <h3 className="calendar-import-issues-title">Color differs from existing ({colorConflicts.length})</h3>
                  <p className="calendar-import-hint">
                    This file's own color guide shows a different color for these than what's already saved.
                  </p>
                  <div className="calendar-conflict-list">
                    {colorConflicts.map((c) => (
                      <div key={c.category} className="calendar-conflict-card">
                        <p className="calendar-conflict-card-title">"{c.category}"</p>
                        <div className="calendar-conflict-color-compare">
                          <span
                            className="calendar-conflict-swatch"
                            style={{ background: c.existingColor } as CSSProperties}
                          />
                          <span>existing</span>
                          <span aria-hidden="true">vs</span>
                          <span
                            className="calendar-conflict-swatch"
                            style={{ background: c.fileColor } as CSSProperties}
                          />
                          <span>this file</span>
                        </div>
                        <div className="calendar-conflict-options">
                          <label className="calendar-conflict-option">
                            <input
                              type="radio"
                              name={`color-conflict-${c.category}`}
                              checked={colorConflictResolutions[c.category] !== 'update'}
                              onChange={() => setColorConflictResolutions((prev) => ({ ...prev, [c.category]: 'keep' }))}
                            />
                            Keep existing color
                          </label>
                          <label className="calendar-conflict-option">
                            <input
                              type="radio"
                              name={`color-conflict-${c.category}`}
                              checked={colorConflictResolutions[c.category] === 'update'}
                              onChange={() => setColorConflictResolutions((prev) => ({ ...prev, [c.category]: 'update' }))}
                            />
                            Update to this file's color
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {uncertainRows.length > 0 && (
                <div className="calendar-import-issues">
                  <h3 className="calendar-import-issues-title">Uncertain category match ({uncertainRows.length})</h3>
                  <p className="calendar-import-hint">
                    This row's highlight color wasn't a confident match for any category. Confirm or reassign it.
                  </p>
                  <div className="calendar-conflict-list">
                    {uncertainRows.map((u) => (
                      <div key={u.sourceRow} className="calendar-conflict-card calendar-conflict-card-row">
                        <span className="calendar-conflict-card-title">{u.title}</span>
                        <select
                          className="calendar-input"
                          value={uncertainRowResolutions[u.sourceRow] ?? u.guessedCategory}
                          onChange={(e) =>
                            setUncertainRowResolutions((prev) => ({ ...prev, [u.sourceRow]: e.target.value }))
                          }
                        >
                          {allCategoryOptions.map((name) => (
                            <option key={name} value={name}>
                              {name}
                            </option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="calendar-modal-footer">
              <button type="button" className="calendar-btn calendar-btn-ghost" onClick={() => setStep('pick')}>
                Back
              </button>
              <button type="button" className="calendar-btn calendar-btn-primary" onClick={handleContinueFromConflicts}>
                Continue
              </button>
            </div>
          </>
        )}

        {step === 'preview' && (
          <>
            <div className="calendar-modal-body calendar-import-preview">
              <div className="calendar-import-summary">
                <span>
                  <strong>{includedCount}</strong> of {rows.length} activities selected
                </span>
                <div className="calendar-import-summary-actions">
                  <button type="button" className="calendar-add-category-link" onClick={() => toggleAll(true)}>
                    Select all
                  </button>
                  <button type="button" className="calendar-add-category-link" onClick={() => toggleAll(false)}>
                    Deselect all
                  </button>
                </div>
              </div>

              {newCategoryNames.length > 0 && (
                <p className="calendar-import-hint">
                  These categories don't exist yet and will be created automatically: {newCategoryNames.join(', ')}.
                </p>
              )}

              {issueRows.length > 0 && (
                <div className="calendar-import-issues">
                  <h3 className="calendar-import-issues-title">
                    Needs a date ({issueRows.length})
                  </h3>
                  <p className="calendar-import-hint">
                    These rows didn't have a usable date in the spreadsheet. Assign one below to include them, or
                    leave blank to skip.
                  </p>
                  {issueRows.map((row) => (
                    <div key={row.sourceRow} className="calendar-import-issue-row">
                      <input
                        type="checkbox"
                        checked={row.included}
                        onChange={() => toggleRow(rows.indexOf(row))}
                      />
                      <div className="calendar-import-issue-group">
                        <span className="calendar-import-issue-title">{row.title}</span>
                        <input
                          type="date"
                          className="calendar-input calendar-import-issue-date"
                          value={issueDates[row.sourceRow] ?? ''}
                          onChange={(e) => updateIssueDate(row.sourceRow, e.target.value)}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <table className="calendar-import-table">
                <thead>
                  <tr>
                    <th></th>
                    <th>Date</th>
                    <th>Activity</th>
                    <th>Category</th>
                    <th>In-charge</th>
                    <th>Place</th>
                  </tr>
                </thead>
                <tbody>
                  {normalRows.map((row) => {
                    const actualIndex = rows.indexOf(row)
                    const existingCategory = categoryByNormalizedName.get(normalizeCategoryKey(row.category))
                    const defaults = categoryDefaults[row.category]
                    const existingColor = existingCategory?.color ?? defaults?.color ?? '#888888'
                    const existingIcon = existingCategory?.icon ?? defaults?.icon ?? ''
                    return (
                      <tr key={`${row.sourceRow}-${row.date}`} className={row.included ? '' : 'calendar-import-row-excluded'}>
                        <td className="calendar-import-cell-checkbox">
                          <input type="checkbox" checked={row.included} onChange={() => toggleRow(actualIndex)} />
                        </td>
                        <td data-label="Date">{row.date}</td>
                        <td data-label="Activity" className="calendar-import-cell-title">{row.title}</td>
                        <td data-label="Category">
                          {existingIcon ? (
                            <i
                              className={existingIcon}
                              style={{ color: getIconColor(existingIcon, existingColor), marginRight: 6 } as CSSProperties}
                            />
                          ) : (
                            <span
                              className="calendar-category-chip-dot"
                              style={{ background: existingColor, display: 'inline-block', marginRight: 6 } as CSSProperties}
                            />
                          )}
                          {row.category}
                        </td>
                        <td data-label="In-charge">{row.inCharge}</td>
                        <td data-label="Place">{row.place}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <div className="calendar-modal-footer">
              <button type="button" className="calendar-btn calendar-btn-ghost" onClick={() => setStep('pick')}>
                Back
              </button>
              <button
                type="button"
                className="calendar-btn calendar-btn-primary"
                onClick={handleConfirmImport}
                disabled={includedCount === 0}
              >
                Import {includedCount} {includedCount === 1 ? 'activity' : 'activities'}
              </button>
            </div>
          </>
        )}

        {step === 'saving' && (
          <div className="calendar-modal-body">
            <p className="calendar-import-hint">
              {saveProgress.total > 0
                ? `Saving ${saveProgress.done} of ${saveProgress.total} activities…`
                : 'Preparing…'}
            </p>
            <div className="calendar-import-progress-track">
              <div
                className="calendar-import-progress-fill"
                style={{
                  width: saveProgress.total > 0 ? `${(saveProgress.done / saveProgress.total) * 100}%` : '0%',
                } as CSSProperties}
              />
            </div>
          </div>
        )}

        {step === 'done' && (
          <>
            <div className="calendar-modal-body">
              <p className="calendar-import-hint">
                Imported {savedCount} {savedCount === 1 ? 'activity' : 'activities'} successfully.
              </p>
            </div>
            <div className="calendar-modal-footer">
              <button type="button" className="calendar-btn calendar-btn-primary" onClick={onClose}>
                Done
              </button>
            </div>
          </>
        )}

        {step === 'error' && (
          <>
            <div className="calendar-modal-body">
              <p className="calendar-field-error">{saveError}</p>
            </div>
            <div className="calendar-modal-footer">
              <button type="button" className="calendar-btn calendar-btn-ghost" onClick={onClose}>
                Close
              </button>
              <button type="button" className="calendar-btn calendar-btn-primary" onClick={handleConfirmImport}>
                Retry
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}