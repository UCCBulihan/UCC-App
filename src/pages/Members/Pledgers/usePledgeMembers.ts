import { useState, useEffect, useRef } from 'react';
import { collection, getDocs, addDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../../firebase/firebase';
import { getAuth, onAuthStateChanged } from 'firebase/auth';

// ── Types & Helpers ───────────────────────────────────────────
export interface Member {
  id: string;
  firstName: string;
  middleName: string;
  lastName: string;
  userId: number;
  isPledger: boolean;
  addedBy: string;
  dateAdded: string;
  modifiedBy?: string;
  modifiedDate?: string;
  isArchived: boolean;
}

export interface FormState {
  firstName: string;
  middleName: string;
  lastName: string;
  isPledger: boolean;
}

const emptyForm: FormState = {
  firstName: '', middleName: '', lastName: '', isPledger: false,
};

function formatDate() {
  return new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ── Hook ─────────────────────────────────────────────────────
export function useMembers() {
  const [currentUser, setCurrentUser] = useState('');
  const [members, setMembers] = useState<Member[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [formError, setFormError] = useState('');
  const [toast, setToast] = useState('');
  const [loading, setLoading] = useState(true);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Pagination state ──
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

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
          .filter((m: Member) => !m.isArchived);
        setMembers(list);
      } catch (err: any) {
        console.error('Fetch error:', err?.message);
      } finally {
        setLoading(false);
      }
    }
    fetchMembers();
  }, []);

  // Reset to page 1 whenever search/filter/pageSize changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search, filter, pageSize]);

  function showToast(msg: string) {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 2800);
  }

  function openModal() {
    setForm(emptyForm);
    setFormError('');
    setEditingId(null);
    setModalMode('add');
    setModalOpen(true);
    document.body.style.overflow = 'hidden';
  }

  function openEditModal(member: Member) {
    setForm({
      firstName: member.firstName,
      middleName: member.middleName,
      lastName: member.lastName,
      isPledger: member.isPledger,
    });
    setFormError('');
    setEditingId(member.id);
    setModalMode('edit');
    setModalOpen(true);
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    setModalOpen(false);
    document.body.style.overflow = '';
  }

  function handleFormChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { id, value, type, checked } = e.target;
    setForm((prev: FormState) => ({ ...prev, [id]: type === 'checkbox' ? checked : value }));
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
      setMembers((prev: Member[]) => [...prev, { id: docRef.id, ...newMember }]);
      closeModal();
      showToast('Member added successfully.');
    } catch (err: any) {
      console.error('Add error:', err?.message);
      setFormError('Failed to add member. Try again.');
    }
  }

  async function editMember() {
    const { firstName, lastName } = form;
    if (!firstName.trim() || !lastName.trim()) {
      setFormError('Please fill in all required fields.');
      return;
    }
    if (!editingId) return;
    try {
      const updated = {
        firstName: firstName.trim(),
        middleName: form.middleName.trim(),
        lastName: lastName.trim(),
        isPledger: form.isPledger,
        modifiedBy: currentUser,
        modifiedDate: formatDate(),
      };
      await updateDoc(doc(db, 'MEMBERS', editingId), updated);
      setMembers((prev: Member[]) =>
        prev.map(m => m.id === editingId ? { ...m, ...updated } : m)
      );
      closeModal();
      showToast('Member updated successfully.');
    } catch (err: any) {
      console.error('Edit error:', err?.message);
      setFormError('Failed to update member. Try again.');
    }
  }

  async function togglePledger(id: string, current: boolean) {
    try {
      await updateDoc(doc(db, 'MEMBERS', id), { isPledger: !current });
      setMembers((prev: Member[]) =>
        prev.map(m => m.id === id ? { ...m, isPledger: !current } : m)
      );
      showToast(`Member marked as ${!current ? 'Pledger' : 'Non-Pledger'}.`);
    } catch (err: any) {
      console.error('Update error:', err?.message);
    }
  }

  async function archiveMember(id: string) {
    try {
      await updateDoc(doc(db, 'MEMBERS', id), { isArchived: true });
      setMembers((prev: Member[]) => prev.filter(m => m.id !== id));
      showToast('Member archived.');
    } catch (err: any) {
      console.error('Archive error:', err?.message);
    }
  }

  const filtered = members
    .filter((m: Member) => {
      if (m.isArchived) return false;
      const fullName = `${m.firstName} ${m.middleName} ${m.lastName}`.toLowerCase();
      const matchSearch = fullName.includes(search.toLowerCase());
      const matchFilter = filter === 'all'
        || (filter === 'yes' && m.isPledger)
        || (filter === 'no' && !m.isPledger);
      return matchSearch && matchFilter;
    })
    .sort((a, b) => Number(b.isPledger) - Number(a.isPledger));

  // ── Pagination derived values ──
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginated = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  return {
    currentUser, members, filtered, paginated, search, filter,
    modalOpen, modalMode, form, formError, toast, loading,
    setSearch, setFilter,
    openModal, openEditModal, closeModal,
    handleFormChange, addMember, editMember,
    togglePledger, archiveMember,
    // pagination
    pageSize, setPageSize,
    currentPage: safePage, setCurrentPage,
    totalPages,
  };
}