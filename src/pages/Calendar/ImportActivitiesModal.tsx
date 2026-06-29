import { useState, type ChangeEvent, type CSSProperties } from 'react'
import {
  collection,
  addDoc,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from '../../firebase/firebase'
import {
  parseMinistryPlanWorkbook,
  DEFAULT_CATEGORY_COLORS,
  type ParsedImportEvent,
  type ImportIssue,
  type ImportCategoryName,
} from './importExcel'

type Category = {
  id: string
  name: string
  color: string
}

type Props = {
  categories: Category[]
  onClose: () => void
  // Called after a successful import so the calendar can refresh its
  // category list (in case new ones were created) without a full reload.
  onImported: () => void
}

type RowState = ParsedImportEvent & {
  included: boolean
}

type Step = 'pick' | 'preview' | 'saving' | 'done' | 'error'

export default function ImportActivitiesModal({ categories, onClose, onImported }: Props) {
  const [step, setStep] = useState<Step>('pick')
  const [fileName, setFileName] = useState<string | null>(null)
  const [rows, setRows] = useState<RowState[]>([])
  const [issues, setIssues] = useState<ImportIssue[]>([])
  const [issueDates, setIssueDates] = useState<Record<number, string>>({})
  const [parseError, setParseError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [savedCount, setSavedCount] = useState(0)

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    setParseError(null)

    const reader = new FileReader()
    reader.onload = () => {
      try {
        const buffer = reader.result as ArrayBuffer
        const { events, issues: parsedIssues } = parseMinistryPlanWorkbook(buffer)
        if (events.length === 0 && parsedIssues.length === 0) {
          setParseError('No activities were found in this file. Make sure it has a "2025-2026" sheet in the expected format.')
          return
        }
        setRows(events.map((e) => ({ ...e, included: true })))
        setIssues(parsedIssues)
        setIssueDates({})
        setStep('preview')
      } catch (err) {
        setParseError('Could not read this file. Make sure it is a valid .xlsx file exported from the ministry plan template.')
      }
    }
    reader.onerror = () => {
      setParseError('Could not read this file. Please try again.')
    }
    reader.readAsArrayBuffer(file)
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
  const categoryByName = new Map(categories.map((c) => [c.name, c]))
  const usedCategoryNames = new Set<ImportCategoryName>(rows.filter((r) => r.included).map((r) => r.category))
  const newCategoryNames = Array.from(usedCategoryNames).filter((name) => !categoryByName.has(name))

  async function ensureCategoriesExist(): Promise<Map<string, string>> {
    // Returns a map of category name -> Firestore doc id, creating any
    // categories that don't already exist (matched by exact name).
    const idByName = new Map<string, string>()
    categories.forEach((c) => idByName.set(c.name, c.id))

    for (const name of newCategoryNames) {
      const docRef = await addDoc(collection(db, 'CATEGORIES'), {
        name,
        color: DEFAULT_CATEGORY_COLORS[name],
        createdAt: serverTimestamp(),
      })
      idByName.set(name, docRef.id)
    }

    return idByName
  }

  async function handleConfirmImport() {
    setStep('saving')
    setSaveError(null)

    try {
      const idByName = await ensureCategoriesExist()
      let count = 0

      for (const row of rows) {
        if (!row.included) continue

        // Rows with an unresolved date issue are skipped unless the user
        // supplied a date for them in the preview screen.
        const isIssueRow = issues.some((i) => i.sourceRow === row.sourceRow)
        const date = isIssueRow ? issueDates[row.sourceRow] : row.date
        if (!date) continue

        await addDoc(collection(db, 'CALENDAR_EVENTS'), {
          title: row.title,
          date,
          time: row.time || 'Whole day',
          categoryId: idByName.get(row.category) ?? null,
          inCharge: row.inCharge || null,
          place: row.place || null,
          budget: row.budget || null,
          createdAt: serverTimestamp(),
        })
        count += 1
      }

      setSavedCount(count)
      setStep('done')
      onImported()
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
                    const existingColor = categoryByName.get(row.category)?.color ?? DEFAULT_CATEGORY_COLORS[row.category]
                    return (
                      <tr key={`${row.sourceRow}-${row.date}`} className={row.included ? '' : 'calendar-import-row-excluded'}>
                        <td className="calendar-import-cell-checkbox">
                          <input type="checkbox" checked={row.included} onChange={() => toggleRow(actualIndex)} />
                        </td>
                        <td data-label="Date">{row.date}</td>
                        <td data-label="Activity" className="calendar-import-cell-title">{row.title}</td>
                        <td data-label="Category">
                          <span
                            className="calendar-category-chip-dot"
                            style={{ background: existingColor, display: 'inline-block', marginRight: 6 } as CSSProperties}
                          />
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
            <p className="calendar-import-hint">Saving activities…</p>
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