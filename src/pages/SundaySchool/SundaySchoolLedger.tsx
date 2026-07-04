import { useState, useEffect } from 'react'
import { onAuthStateChanged, type User } from 'firebase/auth'
import {
  collection, query, where, getDocs, addDoc, updateDoc, deleteDoc,
  doc, Timestamp, orderBy
} from 'firebase/firestore'
import { auth, db } from '../../firebase/firebase'
import NavigationBar from '../Home/NavigationBar/NavigationBar'
import { useCurrentUserRole } from './useCurrentUserRole' // adjust path to wherever you place the hook
import '../Ledger/components/LedgerTracker/LedgerTracker.css' 

// ════════════════════════════════════════════════════════════════
// Types
// ════════════════════════════════════════════════════════════════

interface LedgerEntry {
  id: string
  userId: string // Firebase auth uid of whoever recorded the entry
  category: string
  amount: number
  description: string
  dateAdded: Date
  dateModified: Date
  modifiedBy: string
}

interface EntryForm {
  category: string
  amount: string
  description: string
  dateAdded: string
}

const EMPTY_FORM: EntryForm = {
  category: '',
  amount: '',
  description: '',
  dateAdded: new Date().toISOString().slice(0, 10),
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

// Own dedicated collection for Sunday School ledger entries — no more
// shared 'LEDGER' collection + 'module' filter. Since this collection
// only ever holds Sunday School entries, queries only need to filter/sort
// on a single field (dateAdded), so no composite index is required.
const COLLECTION_NAME = 'SUNDAYSCHOOLLEDGER'

function fmt(n: number) {
  return '₱' + n.toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export default function SundaySchoolLedger() {
  // The ledger is straight financial record-keeping, so the whole
  // add/edit/delete flow is gated to Admin/Moderator. Member/Viewer get
  // read-only access to the table and totals.
  const { role, loading: roleLoading, canEditFinancials } = useCurrentUserRole()

  const now = new Date()
  const [curMonth, setCurMonth] = useState(now.getMonth())
  const [curYear, setCurYear] = useState(now.getFullYear())
  const [entries, setEntries] = useState<LedgerEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<EntryForm>(EMPTY_FORM)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  // Income total para sa net balance — galing sa SUNDAYSCHOOL_INCOME collection
  const [incomeTotal, setIncomeTotal] = useState(0)
  const [incomeLoading, setIncomeLoading] = useState(false)

  const years = Array.from({ length: 7 }, (_, i) => now.getFullYear() - 3 + i)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, user => setCurrentUser(user))
    return () => unsub()
  }, [])

  useEffect(() => {
    if (!currentUser) return
    fetchEntries()
    fetchIncomeTotal()
  }, [currentUser, curMonth, curYear])

  async function fetchEntries() {
    setLoading(true)
    try {
      const start = new Date(curYear, curMonth, 1)
      const end = new Date(curYear, curMonth + 1, 0, 23, 59, 59)
      // Single-field filter + sort (dateAdded only) — Firestore's built-in
      // single-field index covers this, so no composite index is needed.
      const q = query(
        collection(db, COLLECTION_NAME),
        where('dateAdded', '>=', Timestamp.fromDate(start)),
        where('dateAdded', '<=', Timestamp.fromDate(end)),
        orderBy('dateAdded', 'asc')
      )
      const snap = await getDocs(q)
      const list: LedgerEntry[] = []
      snap.forEach(d => {
        const data = d.data()
        list.push({
          id: d.id,
          userId: data.userId ?? '',
          category: data.category ?? '',
          amount: data.amount ?? 0,
          description: data.description ?? '',
          dateAdded: (data.dateAdded as Timestamp).toDate(),
          dateModified: (data.dateModified as Timestamp)?.toDate() ?? new Date(),
          modifiedBy: data.modifiedBy ?? '',
        })
      })
      setEntries(list)
    } catch (err: any) {
      console.error('fetchEntries error:', err?.message)
    } finally {
      setLoading(false)
    }
  }

  // Kunin ang total income ng Sunday School para sa buwang ito, para sa net balance.
  // Hiwalay itong collection (SUNDAYSCHOOL_INCOME) sa SundaySchoolLedger (expenses).
  async function fetchIncomeTotal() {
    setIncomeLoading(true)
    try {
      const start = new Date(curYear, curMonth, 1)
      const end = new Date(curYear, curMonth + 1, 0, 23, 59, 59)
      const q = query(
        collection(db, 'SUNDAYSCHOOL_INCOME'),
        where('dateAdded', '>=', Timestamp.fromDate(start)),
        where('dateAdded', '<=', Timestamp.fromDate(end))
      )
      const snap = await getDocs(q)
      let total = 0
      snap.forEach(d => {
        total += d.data().amount ?? 0
      })
      setIncomeTotal(total)
    } catch (err: any) {
      console.error('fetchIncomeTotal error:', err?.message)
    } finally {
      setIncomeLoading(false)
    }
  }

  async function handleSave() {
    if (!canEditFinancials) {
      console.warn('Blocked ledger save: current role lacks financial edit rights.')
      return
    }
    if (!form.amount || !form.description.trim()) return
    if (!currentUser) return
    setSaving(true)
    try {
      const dateAdded = new Date(form.dateAdded + 'T00:00:00')
      const payload = {
        category: form.category.trim(),
        amount: parseFloat(form.amount) || 0,
        description: form.description.trim(),
        dateAdded: Timestamp.fromDate(dateAdded),
        dateModified: Timestamp.fromDate(new Date()),
        modifiedBy: currentUser.displayName ?? currentUser.email ?? '',
        userId: currentUser.uid,
      }
      if (editingId) {
        await updateDoc(doc(db, COLLECTION_NAME, editingId), payload)
      } else {
        await addDoc(collection(db, COLLECTION_NAME), payload)
      }
      setForm(EMPTY_FORM)
      setEditingId(null)
      setShowForm(false)
      await fetchEntries()
    } catch (err: any) {
      console.error('handleSave error:', err?.message)
    } finally {
      setSaving(false)
    }
  }

  function handleEdit(entry: LedgerEntry) {
    setForm({
      category: entry.category,
      amount: String(entry.amount),
      description: entry.description,
      dateAdded: entry.dateAdded.toISOString().slice(0, 10),
    })
    setEditingId(entry.id)
    setShowForm(true)
  }

  async function handleDelete(id: string) {
    if (!canEditFinancials) {
      console.warn('Blocked ledger delete: current role lacks financial edit rights.')
      return
    }
    try {
      await deleteDoc(doc(db, COLLECTION_NAME, id))
      setDeleteConfirm(null)
      await fetchEntries()
    } catch (err: any) {
      console.error('handleDelete error:', err?.message)
    }
  }

  function handleCancel() {
    setForm(EMPTY_FORM)
    setEditingId(null)
    setShowForm(false)
  }

  const totalExpenses = entries.reduce((s, e) => s + e.amount, 0)
  const netBalance = incomeTotal - totalExpenses

  return (
    <div className="app-layout">
      <NavigationBar />
      <main className="main-content">
        <div className="ldg-root">


          {/* Header */}
          <div className="ldg-header">
            <div className="ldg-header-left">
              <span className="ldg-eyebrow">Sunday School</span>
              <h1 className="ldg-title">Ledger</h1>
            </div>
            <div className="ldg-header-right">
              <select className="ldg-select" value={curMonth} onChange={e => setCurMonth(Number(e.target.value))}>
                {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
              </select>
              <select className="ldg-select" value={curYear} onChange={e => setCurYear(Number(e.target.value))}>
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
              {canEditFinancials && (
                <button className="ldg-add-btn" onClick={() => { setShowForm(true); setEditingId(null); setForm(EMPTY_FORM) }}>
                  <i className="fa-solid fa-plus" aria-hidden="true" />
                  Add Entry
                </button>
              )}
            </div>
          </div>

          {/* Summary strip */}
          <div className="ldg-summary-strip">
            <div className="ldg-kpi">
              <span className="ldg-kpi-label">Income</span>
              <span className="ldg-kpi-value ldg-kpi-value--green">
                {incomeLoading ? '…' : fmt(incomeTotal)}
              </span>
            </div>
            <div className="ldg-kpi">
              <span className="ldg-kpi-label">Expenses</span>
              <span className="ldg-kpi-value ldg-kpi-value--red">{fmt(totalExpenses)}</span>
            </div>
            <div className={`ldg-kpi ${netBalance < 0 ? 'ldg-kpi--neg' : 'ldg-kpi--pos'}`}>
              <span className="ldg-kpi-label">Net Balance</span>
              <span className={`ldg-kpi-value ${netBalance < 0 ? 'ldg-kpi-value--red' : 'ldg-kpi-value--green'}`}>
                {fmt(netBalance)}
              </span>
            </div>
            <div className="ldg-kpi">
              <span className="ldg-kpi-label">Entries</span>
              <span className="ldg-kpi-value">{entries.length}</span>
            </div>
          </div>

          {/* Add / Edit Form — Admin/Moderator lang, hindi na lahat ng naka-login */}
          {showForm && canEditFinancials && (
            <div className="ldg-form-card">
              <h2 className="ldg-form-title">{editingId ? 'Edit Entry' : 'New Entry'}</h2>
              <div className="ldg-form-grid">
                <div className="ldg-field">
                  <label>Date</label>
                  <input
                    type="date"
                    value={form.dateAdded}
                    onChange={e => setForm(f => ({ ...f, dateAdded: e.target.value }))}
                  />
                </div>
                <div className="ldg-field">
                  <label>Amount (₱)</label>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    placeholder="0.00"
                    value={form.amount}
                    onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                  />
                </div>
                <div className="ldg-field">
                  <label>Category</label>
                  <input
                    type="text"
                    placeholder="e.g. Snacks, Materials..."
                    value={form.category}
                    onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                  />
                </div>
                <div className="ldg-field ldg-field--full">
                  <label>Description</label>
                  <input
                    type="text"
                    placeholder="Brief description"
                    value={form.description}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  />
                </div>
              </div>
              <div className="ldg-form-actions">
                <button className="ldg-cancel-btn" onClick={handleCancel}>Cancel</button>
                <button
                  className="ldg-save-btn"
                  onClick={handleSave}
                  disabled={saving || !form.amount || !form.description.trim()}
                >
                  {saving ? 'Saving…' : editingId ? 'Save Changes' : 'Add Entry'}
                </button>
              </div>
            </div>
          )}

          {/* Table */}
          <div className="ldg-table-card">
            {loading ? (
              <div className="ldg-loading">
                <div className="ldg-spinner" />
                <span>Loading entries…</span>
              </div>
            ) : entries.length === 0 ? (
              <div className="ldg-empty">
                <i className="fa-regular fa-folder-open ldg-empty-icon" aria-hidden="true" />
                <p>No entries for {MONTHS[curMonth]} {curYear}.</p>
                {canEditFinancials && (
                  <button className="ldg-add-btn" onClick={() => setShowForm(true)}>
                    + Add Entry
                  </button>
                )}
              </div>
            ) : (
              <div className="ldg-table-scroll">
                <table className="ldg-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Category</th>
                      <th>Description</th>
                      <th>Modified By</th>
                      <th className="ldg-th-amount">Amount</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map(e => (
                      <tr key={e.id}>
                        <td className="ldg-td-date">
                          {e.dateAdded.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </td>
                        <td>
                          {e.category
                            ? <span className="ldg-category-pill">{e.category}</span>
                            : <span className="ldg-dash">—</span>
                          }
                        </td>
                        <td className="ldg-td-desc">{e.description}</td>
                        <td className="ldg-td-by">{e.modifiedBy || <span className="ldg-dash">—</span>}</td>
                        <td className="ldg-td-amount" style={{ color: '#dc2626' }}>
                          − {fmt(e.amount)}
                        </td>
                        <td className="ldg-td-actions">
                          {canEditFinancials ? (
                            <>
                              <button className="ldg-icon-btn" onClick={() => handleEdit(e)} title="Edit">
                                <i className="fa-regular fa-pen-to-square" aria-hidden="true" />
                              </button>
                              {deleteConfirm === e.id ? (
                                <span className="ldg-delete-confirm">
                                  <button className="ldg-icon-btn ldg-confirm-yes" onClick={() => handleDelete(e.id)}>Delete</button>
                                  <button className="ldg-icon-btn ldg-confirm-no" onClick={() => setDeleteConfirm(null)}>Cancel</button>
                                </span>
                              ) : (
                                <button className="ldg-icon-btn" onClick={() => setDeleteConfirm(e.id)} title="Delete">
                                  <i className="fa-regular fa-trash-can" aria-hidden="true" />
                                </button>
                              )}
                            </>
                          ) : (
                            <span className="ldg-dash">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={4} className="ldg-tfoot-label">
                        Total Expenses — {MONTHS[curMonth]} {curYear}
                      </td>
                      <td className="ldg-tfoot-amount" style={{ color: '#dc2626' }}>
                        {fmt(totalExpenses)}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>

        </div>
      </main>
    </div>
  )
}