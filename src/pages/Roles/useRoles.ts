import { useState, useEffect, useRef } from 'react';
import { collection, getDocs, addDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase/firebase';
import { getAuth, onAuthStateChanged } from 'firebase/auth';

// ── Types & Helpers ───────────────────────────────────────────

export type RoleLevel = 'Admin' | 'Moderator' | 'Member' | 'Viewer';

export interface UserRole {
  id: string;
  uid: string;
  displayName: string;
  email: string;
  photoURL: string;
  role: RoleLevel;
  assignedBy: string;
  dateAssigned: string;
  modifiedBy?: string;
  modifiedDate?: string;
  isActive: boolean;
}

export interface RoleFormState {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string;
  role: RoleLevel;
}

const emptyForm: RoleFormState = {
  uid: '',
  displayName: '',
  email: '',
  photoURL: '',
  role: 'Member',
};

function formatDate() {
  return new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// ── Hook ─────────────────────────────────────────────────────
export function useRoles() {
  const [currentUser, setCurrentUser] = useState('');
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<RoleFormState>(emptyForm);
  const [formError, setFormError] = useState('');
  const [toast, setToast] = useState('');
  const [loading, setLoading] = useState(true);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Auth: track logged-in user ────────────────────────────
  useEffect(() => {
    const auth = getAuth();
    const unsub = onAuthStateChanged(auth, user => {
      setCurrentUser(user?.displayName || user?.email || 'Unknown');
    });
    return () => unsub();
  }, []);

  // ── Fetch all Google-authenticated users from Firestore ───
  useEffect(() => {
    async function fetchRoles() {
      try {
        const snapshot = await getDocs(collection(db, 'ROLES'));
        const list: UserRole[] = snapshot.docs
          .map(docSnap => {
            const data = docSnap.data() as any;
            return {
              id: docSnap.id,
              ...data,
              isActive: data.isActive ?? true,
              dateAssigned: data.dateAssigned?.toDate
                ? data.dateAssigned.toDate().toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })
                : data.dateAssigned ?? '',
            };
          })
          .filter((u: UserRole) => u.isActive);
        setUserRoles(list);
      } catch (err: any) {
        console.error('Fetch error:', err?.message);
      } finally {
        setLoading(false);
      }
    }
    fetchRoles();
  }, []);

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

  function openEditModal(userRole: UserRole) {
    setForm({
      uid: userRole.uid,
      displayName: userRole.displayName,
      email: userRole.email,
      photoURL: userRole.photoURL,
      role: userRole.role,
    });
    setFormError('');
    setEditingId(userRole.id);
    setModalMode('edit');
    setModalOpen(true);
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    setModalOpen(false);
    document.body.style.overflow = '';
  }

  function handleFormChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) {
    const { id, value } = e.target;
    setForm((prev: RoleFormState) => ({ ...prev, [id]: value }));
  }

  async function addUserRole() {
    const { uid, displayName, email, role } = form;
    if (!uid.trim() || !displayName.trim() || !email.trim()) {
      setFormError('UID, Display Name, and Email are required.');
      return;
    }
    try {
      const newEntry: Omit<UserRole, 'id'> = {
        uid: uid.trim(),
        displayName: displayName.trim(),
        email: email.trim(),
        photoURL: form.photoURL.trim(),
        role,
        assignedBy: currentUser,
        dateAssigned: formatDate(),
        isActive: true,
      };
      const docRef = await addDoc(collection(db, 'ROLES'), newEntry);
      setUserRoles(prev => [...prev, { id: docRef.id, ...newEntry }]);
      closeModal();
      showToast('Role assigned successfully.');
    } catch (err: any) {
      console.error('Add error:', err?.message);
      setFormError('Failed to assign role. Try again.');
    }
  }

  async function editUserRole() {
    const { displayName, email, role } = form;
    if (!displayName.trim() || !email.trim()) {
      setFormError('Display Name and Email are required.');
      return;
    }
    if (!editingId) return;
    try {
      const updated = {
        displayName: displayName.trim(),
        email: email.trim(),
        photoURL: form.photoURL.trim(),
        role,
        modifiedBy: currentUser,
        modifiedDate: formatDate(),
      };
      await updateDoc(doc(db, 'ROLES', editingId), updated);
      setUserRoles(prev =>
        prev.map(u => (u.id === editingId ? { ...u, ...updated } : u))
      );
      closeModal();
      showToast('Role updated successfully.');
    } catch (err: any) {
      console.error('Edit error:', err?.message);
      setFormError('Failed to update role. Try again.');
    }
  }

  async function revokeRole(id: string) {
    try {
      await updateDoc(doc(db, 'ROLES', id), { isActive: false });
      setUserRoles(prev => prev.filter(u => u.id !== id));
      showToast('Role revoked.');
    } catch (err: any) {
      console.error('Revoke error:', err?.message);
    }
  }

  async function changeRole(id: string, newRole: RoleLevel) {
    try {
      await updateDoc(doc(db, 'ROLES', id), {
        role: newRole,
        modifiedBy: currentUser,
        modifiedDate: formatDate(),
      });
      setUserRoles(prev =>
        prev.map(u => (u.id === id ? { ...u, role: newRole } : u))
      );
      showToast(`Role changed to ${newRole}.`);
    } catch (err: any) {
      console.error('Role change error:', err?.message);
    }
  }

  const filtered = userRoles.filter((u: UserRole) => {
    const searchStr =
      `${u.displayName} ${u.email}`.toLowerCase();
    const matchSearch = searchStr.includes(search.toLowerCase());
    const matchFilter =
      filter === 'all' || u.role.toLowerCase() === filter.toLowerCase();
    return matchSearch && matchFilter;
  });

  return {
    currentUser,
    userRoles,
    filtered,
    search,
    filter,
    modalOpen,
    modalMode,
    form,
    formError,
    toast,
    loading,
    setSearch,
    setFilter,
    openModal,
    openEditModal,
    closeModal,
    handleFormChange,
    addUserRole,
    editUserRole,
    revokeRole,
    changeRole,
  };
}