import { useState, useEffect } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import {
  collection, query, where, getDocs, addDoc, updateDoc, deleteDoc,
  doc, Timestamp, orderBy
} from 'firebase/firestore';
import { auth, db } from '../../../../firebase/firebase';
import { useCurrentUserRole } from '../../../Pledges/hooks/useCurrentUserRole';
import './LedgerTracker.css';

type EntryType = 'EXPENSE' | 'LOAN_OUT' | 'REPAYMENT';

interface LedgerEntry {
  id: string;
  userId: number;
  type: EntryType;
  category: string;
  amount: number;
  description: string;
  dateAdded: Date;
  dateModified: Date;
  modifiedBy: string;
}

interface EntryForm {
  type: EntryType;
  category: string;
  amount: string;
  description: string;
  dateAdded: string;
}

const EMPTY_FORM: EntryForm = {
  type: 'EXPENSE',
  category: '',
  amount: '',
  description: '',
  dateAdded: new Date().toISOString().slice(0, 10),
};

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
];

const TYPE_CONFIG: Record<EntryType, { label: string; color: string; bg: string; sign: string }> = {
  EXPENSE:   { label: 'Expense',   color: '#dc2626', bg: '#fef2f2', sign: '−' },
  LOAN_OUT:  { label: 'Loan Out',  color: '#d97706', bg: '#fffbeb', sign: '−' },
  REPAYMENT: { label: 'Repayment', color: '#16a34a', bg: '#f0fdf4', sign: '+' },
};

function fmt(n: number) {
  return '₱' + n.toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function LedgerTracker() {
  const now = new Date();
  const [curMonth, setCurMonth] = useState(now.getMonth());
  const [curYear, setCurYear] = useState(now.getFullYear());
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<EntryForm>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const { canManage } = useCurrentUserRole();
  const years = Array.from({ length: 7 }, (_, i) => now.getFullYear() - 3 + i);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, user => setCurrentUser(user));
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    fetchEntries();
  }, [currentUser, curMonth, curYear]);

  async function fetchEntries() {
    setLoading(true);
    try {
      const start = new Date(curYear, curMonth, 1);
      const end = new Date(curYear, curMonth + 1, 0, 23, 59, 59);
      const q = query(
        collection(db, 'LEDGER'),
        where('dateAdded', '>=', Timestamp.fromDate(start)),
        where('dateAdded', '<=', Timestamp.fromDate(end)),
        orderBy('dateAdded', 'asc')
      );
      const snap = await getDocs(q);
      const list: LedgerEntry[] = [];
      snap.forEach(d => {
        const data = d.data();
        list.push({
          id: d.id,
          userId: data.userId ?? 0,
          type: (data.type as EntryType) ?? 'EXPENSE',
          category: data.category ?? '',
          amount: data.amount ?? 0,
          description: data.description ?? '',
          dateAdded: (data.dateAdded as Timestamp).toDate(),
          dateModified: (data.dateModified as Timestamp)?.toDate() ?? new Date(),
          modifiedBy: data.modifiedBy ?? '',
        });
      });
      setEntries(list);
    } catch (err: any) {
      console.error('fetchEntries error:', err?.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!form.amount || !form.description.trim()) return;
    if (!currentUser) return;
    setSaving(true);
    try {
      const dateAdded = new Date(form.dateAdded + 'T00:00:00');
      const payload = {
        type: form.type,
        category: form.category.trim(),
        amount: parseFloat(form.amount) || 0,
        description: form.description.trim(),
        dateAdded: Timestamp.fromDate(dateAdded),
        dateModified: Timestamp.fromDate(new Date()),
        modifiedBy: currentUser.displayName ?? currentUser.email ?? '',
        userId: 0,
      };
      if (editingId) {
        await updateDoc(doc(db, 'LEDGER', editingId), payload);
      } else {
        await addDoc(collection(db, 'LEDGER'), payload);
      }
      setForm(EMPTY_FORM);
      setEditingId(null);
      setShowForm(false);
      await fetchEntries();
    } catch (err: any) {
      console.error('handleSave error:', err?.message);
    } finally {
      setSaving(false);
    }
  }

  function handleEdit(entry: LedgerEntry) {
    setForm({
      type: entry.type,
      category: entry.category,
      amount: String(entry.amount),
      description: entry.description,
      dateAdded: entry.dateAdded.toISOString().slice(0, 10),
    });
    setEditingId(entry.id);
    setShowForm(true);
  }

  async function handleDelete(id: string) {
    try {
      await deleteDoc(doc(db, 'LEDGER', id));
      setDeleteConfirm(null);
      await fetchEntries();
    } catch (err: any) {
      console.error('handleDelete error:', err?.message);
    }
  }

  function handleCancel() {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setShowForm(false);
  }

  const totalExpenses  = entries.filter(e => e.type === 'EXPENSE').reduce((s, e) => s + e.amount, 0);
  const totalLoanOut   = entries.filter(e => e.type === 'LOAN_OUT').reduce((s, e) => s + e.amount, 0);
  const totalRepayment = entries.filter(e => e.type === 'REPAYMENT').reduce((s, e) => s + e.amount, 0);
  const netOutflow     = totalExpenses + totalLoanOut - totalRepayment;

  return (
    <div className="ldg-root">

      {/* Header */}
      <div className="ldg-header">
        <div className="ldg-header-left">
          <span className="ldg-eyebrow">Church Finance</span>
          <h1 className="ldg-title">Ledger</h1>
        </div>
        <div className="ldg-header-right">
          <select className="ldg-select" value={curMonth} onChange={e => setCurMonth(Number(e.target.value))}>
            {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
          </select>
          <select className="ldg-select" value={curYear} onChange={e => setCurYear(Number(e.target.value))}>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          {canManage && (
            <button className="ldg-add-btn" onClick={() => { setShowForm(true); setEditingId(null); setForm(EMPTY_FORM); }}>
              <i className="fa-solid fa-plus" aria-hidden="true" />
              Add Entry
            </button>
          )}
        </div>
      </div>

      {/* Summary strip */}
      <div className="ldg-summary-strip">
        <div className="ldg-kpi">
          <span className="ldg-kpi-label">Expenses</span>
          <span className="ldg-kpi-value ldg-kpi-value--red">{fmt(totalExpenses)}</span>
        </div>
        <div className="ldg-kpi">
          <span className="ldg-kpi-label">Loan Out</span>
          <span className="ldg-kpi-value ldg-kpi-value--amber">{fmt(totalLoanOut)}</span>
        </div>
        <div className="ldg-kpi">
          <span className="ldg-kpi-label">Repayments</span>
          <span className="ldg-kpi-value ldg-kpi-value--green">{fmt(totalRepayment)}</span>
        </div>
        <div className={`ldg-kpi ${netOutflow > 0 ? 'ldg-kpi--neg' : 'ldg-kpi--pos'}`}>
          <span className="ldg-kpi-label">Net Outflow</span>
          <span className={`ldg-kpi-value ${netOutflow > 0 ? 'ldg-kpi-value--red' : 'ldg-kpi-value--green'}`}>
            {fmt(netOutflow)}
          </span>
        </div>
        <div className="ldg-kpi">
          <span className="ldg-kpi-label">Entries</span>
          <span className="ldg-kpi-value">{entries.length}</span>
        </div>
      </div>

      {/* Add / Edit Form — Admin at Moderator lang */}
      {canManage && showForm && (
        <div className="ldg-form-card">
          <h2 className="ldg-form-title">{editingId ? 'Edit Entry' : 'New Entry'}</h2>
          <div className="ldg-form-grid">
            <div className="ldg-field ldg-field--full">
              <label>Type</label>
              <div className="ldg-type-group">
                {(Object.keys(TYPE_CONFIG) as EntryType[]).map(t => (
                  <button
                    key={t}
                    type="button"
                    className={`ldg-type-btn ${form.type === t ? 'ldg-type-btn--active' : ''}`}
                    style={form.type === t ? { background: TYPE_CONFIG[t].bg, color: TYPE_CONFIG[t].color, borderColor: TYPE_CONFIG[t].color } : {}}
                    onClick={() => setForm(f => ({ ...f, type: t }))}
                  >
                    {TYPE_CONFIG[t].sign} {TYPE_CONFIG[t].label}
                  </button>
                ))}
              </div>
            </div>
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
                placeholder="e.g. Utilities, Loan..."
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
            {canManage && (
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
                  <th>Type</th>
                  <th>Category</th>
                  <th>Description</th>
                  <th>Modified By</th>
                  <th className="ldg-th-amount">Amount</th>
                  {canManage && <th></th>}
                </tr>
              </thead>
              <tbody>
                {entries.map(e => {
                  const cfg = TYPE_CONFIG[e.type];
                  return (
                    <tr key={e.id}>
                      <td className="ldg-td-date">
                        {e.dateAdded.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td>
                        <span className="ldg-type-pill" style={{ color: cfg.color, background: cfg.bg }}>
                          {cfg.sign} {cfg.label}
                        </span>
                      </td>
                      <td>
                        {e.category
                          ? <span className="ldg-category-pill">{e.category}</span>
                          : <span className="ldg-dash">—</span>
                        }
                      </td>
                      <td className="ldg-td-desc">{e.description}</td>
                      <td className="ldg-td-by">{e.modifiedBy || <span className="ldg-dash">—</span>}</td>
                      <td className="ldg-td-amount" style={{ color: cfg.color }}>
                        {cfg.sign} {fmt(e.amount)}
                      </td>
                      {canManage && (
                        <td className="ldg-td-actions">
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
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={canManage ? 5 : 5} className="ldg-tfoot-label">
                    Net Outflow — {MONTHS[curMonth]} {curYear}
                  </td>
                  <td className="ldg-tfoot-amount" style={{ color: netOutflow > 0 ? '#dc2626' : '#16a34a' }}>
                    {fmt(netOutflow)}
                  </td>
                  {canManage && <td></td>}
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}