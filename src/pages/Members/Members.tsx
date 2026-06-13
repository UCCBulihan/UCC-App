import { useState, useEffect, useRef } from "react";
import './members.css';
import NavigationBar from '../Home/NavigationBar/NavigationBar';
import { collection, getDocs, addDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase/firebase';
import { getAuth, onAuthStateChanged } from 'firebase/auth';

interface Member {
  id: string;
  firstName: string;
  middleName: string;
  lastName: string;
  userId: number;
  isPledger: boolean;
  addedBy: string;
  dateAdded: string;
  isArchived: boolean;
}

function formatDate() {
  return new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function initials(m: Member) {
  return (m.firstName[0] || '') + (m.lastName[0] || '');
}

const emptyForm = {
  firstName: '', middleName: '', lastName: '',
  isPledger: false,
};

export default function Members() {
  const [currentUser, setCurrentUser] = useState('');
  const [members, setMembers] = useState<Member[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [toast, setToast] = useState('');
  const [loading, setLoading] = useState(true);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const auth = getAuth();
    const unsub = onAuthStateChanged(auth, user => {
      setCurrentUser(user?.displayName || user?.email || 'Unknown');
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    async function fetchMembers() {
      try {
        const snapshot = await getDocs(collection(db, 'MEMBERS'));
        const list: Member[] = snapshot.docs
          .map(docSnap => {
            const data = docSnap.data() as any;
            return {
              id: docSnap.id,
              ...data,
              isArchived: data.isArchived ?? false,
              dateAdded: data.dateAdded?.toDate
                ? data.dateAdded.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                : data.dateAdded ?? '',
            };
          })
          .filter(m => !m.isArchived);
        setMembers(list);
      } catch (err: any) {
        console.error('Fetch error:', err?.message);
      } finally {
        setLoading(false);
      }
    }
    fetchMembers();
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') closeModal(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  function openModal() {
    setForm(emptyForm);
    setFormError('');
    setModalOpen(true);
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    setModalOpen(false);
    document.body.style.overflow = '';
  }

  function handleOverlayClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) closeModal();
  }

  function showToast(msg: string) {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 2800);
  }

  function handleFormChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { id, value, type, checked } = e.target;
    setForm(prev => ({ ...prev, [id]: type === 'checkbox' ? checked : value }));
  }

  async function addMember() {
    const nextId = members.length > 0
      ? Math.max(...members.map(m => m.userId)) + 1
      : 1;

    const { firstName, lastName } = form;
    if (!firstName.trim() || !lastName.trim()) {
      setFormError('Please fill in all required fields.');
      return;
    }

    try {
      const newMember = {
        firstName: firstName.trim(),
        middleName: form.middleName.trim(),
        lastName: lastName.trim(),
        userId: nextId,
        isPledger: form.isPledger,
        addedBy: currentUser,
        dateAdded: formatDate(),
        isArchived: false,
      };

      const docRef = await addDoc(collection(db, 'MEMBERS'), newMember);
      setMembers(prev => [...prev, { id: docRef.id, ...newMember }]);
      closeModal();
      showToast('Member added successfully.');
    } catch (err: any) {
      console.error('Add error:', err?.message);
      setFormError('Failed to add member. Try again.');
    }
  }

  async function togglePledger(id: string, current: boolean) {
    try {
      await updateDoc(doc(db, 'MEMBERS', id), { isPledger: !current });
      setMembers(prev => prev.map(m => m.id === id ? { ...m, isPledger: !current } : m));
      showToast(`Member marked as ${!current ? 'Pledger' : 'Non-Pledger'}.`);
    } catch (err: any) {
      console.error('Update error:', err?.message);
    }
  }

  async function archiveMember(id: string) {
    try {
      await updateDoc(doc(db, 'MEMBERS', id), { isArchived: true });
      setMembers(prev => prev.filter(m => m.id !== id));
      showToast('Member archived.');
    } catch (err: any) {
      console.error('Archive error:', err?.message);
    }
  }

  const filtered = members.filter(m => {
    if (m.isArchived) return false;
    const fullName = `${m.firstName} ${m.middleName} ${m.lastName}`.toLowerCase();
    const matchSearch = fullName.includes(search.toLowerCase());
    const matchFilter = filter === 'all' || (filter === 'yes' && m.isPledger) || (filter === 'no' && !m.isPledger);
    return matchSearch && matchFilter;
  });

  return (
    <div className="app-layout">
      <NavigationBar />
      <main className="main-content">
        <div className="page">

          {/* Page Header */}
          <div className="page-header">
            <div className="page-header-left">
              <h1>Members</h1>
              <p>{members.length} member{members.length !== 1 ? 's' : ''} total</p>
            </div>
            <button className="btn-add" onClick={openModal}>
              <i className="fa-solid fa-user-plus" aria-hidden="true" />
              Add Member
            </button>
          </div>

          {/* Toolbar */}
          <div className="toolbar">
            <div className="search-wrap">
              <i className="fa-solid fa-magnifying-glass" aria-hidden="true" />
              <input
                type="text"
                placeholder="Search by name…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <div className="filter-select-wrap">
              <i className="fa-solid fa-filter" aria-hidden="true" />
              <select value={filter} onChange={e => setFilter(e.target.value)}>
                <option value="all">All Members</option>
                <option value="yes">Pledgers Only</option>
                <option value="no">Non-Pledgers</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="members-card">
            <div className="table-scroll">
              <table className="members-table">
                <thead>
                  <tr>
                    <th>Member</th>
                    <th>User ID</th>
                    <th>Pledger</th>
                    <th>Added By</th>
                    <th>Date Added</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="empty-cell">
                        <div className="empty-state">
                          <p>Loading members…</p>
                        </div>
                      </td>
                    </tr>
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="empty-cell">
                        <div className="empty-state">
                          <i className="fa-regular fa-user" aria-hidden="true" />
                          <p>No members found.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filtered.map((m) => (
                      <tr key={m.id}>
                        <td>
                          <div className="member-cell">
                            <div className="avatar">{initials(m)}</div>
                            <span className="member-name">
                              {m.firstName}{m.middleName ? ` ${m.middleName}` : ''} {m.lastName}
                            </span>
                          </div>
                        </td>
                        <td><span className="id-chip">#{m.userId}</span></td>
                        <td>
                          <button
                            className={`toggle-pledger ${m.isPledger ? 'active' : ''}`}
                            onClick={() => togglePledger(m.id, m.isPledger)}
                            title={m.isPledger ? 'Click to remove pledger' : 'Click to mark as pledger'}
                          >
                            {m.isPledger
                              ? <><i className="fa-solid fa-circle-check" aria-hidden="true" /> Yes</>
                              : <span>No</span>}
                          </button>
                        </td>
                        <td>
                          <span className="added-by">
                            <i className="fa-regular fa-user" style={{ fontSize: 12 }} aria-hidden="true" />
                            {m.addedBy}
                          </span>
                        </td>
                        <td><span className="date-text">{m.dateAdded}</span></td>
                        <td>
                          <div className="actions-cell">
                            <button className="btn-icon" title="Edit" onClick={() => showToast('Edit coming soon!')}>
                              <i className="fa-regular fa-pen-to-square" aria-hidden="true" />
                            </button>
                            <button className="btn-icon danger" title="Archive" onClick={() => archiveMember(m.id)}>
                              <i className="fa-solid fa-box-archive" aria-hidden="true" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="table-footer">
              <span>Showing {filtered.length} of {members.length} member{members.length !== 1 ? 's' : ''}</span>
            </div>
          </div>

        </div>

        {/* Modal */}
        <div
          className={`modal-overlay${modalOpen ? ' open' : ''}`}
          onClick={handleOverlayClick}
        >
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-heading">

            <div className="modal-header">
              <div className="modal-title">
                <div className="modal-icon"><i className="fa-solid fa-user-plus" aria-hidden="true" /></div>
                <h2 id="modal-heading">Add Member</h2>
              </div>
              <button className="btn-close" onClick={closeModal} aria-label="Close">
                <i className="fa-solid fa-xmark" aria-hidden="true" />
              </button>
            </div>

            {formError && (
              <div className="modal-error">
                <i className="fa-solid fa-circle-exclamation" aria-hidden="true" />
                {formError}
              </div>
            )}

            <p className="section-label">Name</p>
            <div className="row-2">
              <div className="field">
                <label htmlFor="firstName">First Name <span className="req">*</span></label>
                <div className="input-wrap">
                  <i className="fa-regular fa-id-card icon" aria-hidden="true" />
                  <input type="text" id="firstName" placeholder="e.g. John" value={form.firstName} onChange={handleFormChange} />
                </div>
              </div>
              <div className="field">
                <label htmlFor="lastName">Last Name <span className="req">*</span></label>
                <div className="input-wrap">
                  <i className="fa-regular fa-id-card icon" aria-hidden="true" />
                  <input type="text" id="lastName" placeholder="e.g. Smith" value={form.lastName} onChange={handleFormChange} />
                </div>
              </div>
            </div>
            <div className="field">
              <label htmlFor="middleName">Middle Name</label>
              <div className="input-wrap">
                <i className="fa-regular fa-id-card icon" aria-hidden="true" />
                <input type="text" id="middleName" placeholder="e.g. Joe" value={form.middleName} onChange={handleFormChange} />
              </div>
            </div>

            <p className="section-label">Meta</p>
            <div className="field">
              <label>Added By</label>
              <div className="input-wrap" style={{ opacity: 0.7 }}>
                <i className="fa-solid fa-user-shield icon" aria-hidden="true" />
                <input
                  type="text"
                  value={currentUser}
                  readOnly
                  style={{ cursor: 'default', backgroundColor: 'var(--input-disabled-bg, #f5f5f5)' }}
                />
              </div>
            </div>

            <label className="toggle-field" htmlFor="isPledger">
              <div className="toggle-label">
                <i className="fa-solid fa-hand-holding-heart" aria-hidden="true" />
                <div>
                  <div className="toggle-text">Pledger</div>
                  <div className="toggle-desc">Mark this member as a pledger</div>
                </div>
              </div>
              <div className="toggle-switch">
                <input type="checkbox" id="isPledger" checked={form.isPledger} onChange={handleFormChange} />
                <span className="toggle-slider"></span>
              </div>
            </label>

            <div className="modal-actions">
              <button className="btn-secondary" onClick={closeModal}>
                <i className="fa-solid fa-xmark" aria-hidden="true" /> Cancel
              </button>
              <button className="btn-primary" onClick={addMember}>
                <i className="fa-solid fa-user-plus" aria-hidden="true" /> Add Member
              </button>
            </div>

          </div>
        </div>

        {/* Toast */}
        <div className={`toast${toast ? ' show' : ''}`}>
          <i className="fa-solid fa-circle-check" aria-hidden="true" />
          <span>{toast}</span>
        </div>

      </main>
    </div>
  );
}