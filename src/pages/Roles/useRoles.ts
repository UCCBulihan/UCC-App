import { useState, useEffect, useRef } from 'react';
import {
  collection, getDocs, doc, updateDoc, setDoc,
} from 'firebase/firestore';
import { db } from '../../firebase/firebase';
import { getAuth, onAuthStateChanged } from 'firebase/auth';

// ── Types ─────────────────────────────────────────────────────
export type RoleLevel = 'Admin' | 'Moderator' | 'Member' | 'Viewer';

export interface UserRole {
  id: string;       // Firestore doc ID = uid
  uid: string;
  displayName: string;
  email: string;
  photoURL: string;
  role: RoleLevel | '';   // '' = walang role pa (bagong user)
  assignedBy?: string;
  dateAssigned?: string;
  modifiedBy?: string;
  modifiedDate?: string;
  provider: string;
  lastLogin?: string;
}

export interface RoleFormState {
  role: RoleLevel;
}

function formatDate() {
  return new Date().toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

// ── Hook ─────────────────────────────────────────────────────
export function useRoles() {
  const [currentUser, setCurrentUser] = useState('');
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRole | null>(null);
  const [form, setForm] = useState<RoleFormState>({ role: 'Member' });
  const [formError, setFormError] = useState('');
  const [toast, setToast] = useState('');
  const [loading, setLoading] = useState(true);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Track who is currently logged in ─────────────────────
  useEffect(() => {
    const auth = getAuth();
    const unsub = onAuthStateChanged(auth, user => {
      setCurrentUser(user?.displayName || user?.email || 'Unknown');
    });
    return () => unsub();
  }, []);

  // ── Fetch all users from USERS collection ─────────────────
  // (USERS collection is auto-populated when anyone logs in via Google,
  //  because useAuthSync writes to it on every login)
  useEffect(() => {
    async function fetchUsers() {
      try {
        const snapshot = await getDocs(collection(db, 'USERS'));
        const list: UserRole[] = snapshot.docs.map(docSnap => {
          const data = docSnap.data() as any;
          return {
            id: docSnap.id,
            uid: data.uid || docSnap.id,
            displayName: data.displayName || '',
            email: data.email || '',
            photoURL: data.photoURL || '',
            provider: data.provider || '',
            role: data.role || '',
            assignedBy: data.assignedBy || '',
            dateAssigned: data.dateAssigned || '',
            modifiedBy: data.modifiedBy || '',
            modifiedDate: data.modifiedDate || '',
          };
        });
        setUserRoles(list);
      } catch (err: any) {
        console.error('Fetch error:', err?.message);
      } finally {
        setLoading(false);
      }
    }
    fetchUsers();
  }, []);

  function showToast(msg: string) {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 2800);
  }

  // ── Open modal to assign/edit role for a specific user ───
  function openEditModal(user: UserRole) {
    setForm({ role: (user.role as RoleLevel) || 'Member' });
    setFormError('');
    setEditingUser(user);
    setModalOpen(true);
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    setModalOpen(false);
    setEditingUser(null);
    document.body.style.overflow = '';
  }

  function handleFormChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) {
    const { id, value } = e.target;
    setForm(prev => ({ ...prev, [id]: value }));
  }

  // ── Save role assignment ──────────────────────────────────
    async function saveRole() {
        if (!editingUser) return;
        try {
            const isEdit = !!editingUser.role;
            const update = {
            role: form.role,
            assignedBy: isEdit ? editingUser.assignedBy : currentUser,   // preserve original
            dateAssigned: isEdit ? editingUser.dateAssigned : formatDate(), // preserve original
            modifiedBy: isEdit ? currentUser : '',
            modifiedDate: isEdit ? formatDate() : '',
            };
            await setDoc(doc(db, 'USERS', editingUser.uid), update, { merge: true });
            setUserRoles(prev =>
            prev.map(u => u.id === editingUser.id ? { ...u, ...update } : u)
            );
            closeModal();
            showToast(`Role set to ${form.role} for ${editingUser.displayName || editingUser.email}.`);
        } catch (err: any) {
            console.error('Save role error:', err?.message);
            setFormError('Failed to save role. Try again.');
        }
    }

  // ── Remove role (set to empty) ────────────────────────────
  async function removeRole(id: string) {
    try {
      await updateDoc(doc(db, 'USERS', id), {
        role: '',
        assignedBy: '',
        dateAssigned: '',
        modifiedBy: currentUser,
        modifiedDate: formatDate(),
      });
      setUserRoles(prev =>
        prev.map(u => u.id === id ? { ...u, role: '', assignedBy: '', dateAssigned: '' } : u)
      );
      showToast('Role removed.');
    } catch (err: any) {
      console.error('Remove role error:', err?.message);
    }
  }

  // ── Quick role change directly from table ─────────────────
  async function changeRole(id: string, newRole: RoleLevel) {
    const target = userRoles.find(u => u.id === id);
    try {
      const update = {
        role: newRole,
        assignedBy: target?.assignedBy || currentUser,
        dateAssigned: target?.dateAssigned || formatDate(),
        modifiedBy: currentUser,
        modifiedDate: formatDate(),
      };
      await updateDoc(doc(db, 'USERS', id), update);
      setUserRoles(prev =>
        prev.map(u => u.id === id ? { ...u, ...update } : u)
      );
      showToast(`Role changed to ${newRole}.`);
    } catch (err: any) {
      console.error('Role change error:', err?.message);
    }
  }

  // ── Filter logic ──────────────────────────────────────────
  const filtered = userRoles.filter(u => {
    const searchStr = `${u.displayName} ${u.email}`.toLowerCase();
    const matchSearch = searchStr.includes(search.toLowerCase());
    const matchFilter =
      filter === 'all'
      || (filter === 'unassigned' && !u.role)
      || u.role.toLowerCase() === filter.toLowerCase();
    return matchSearch && matchFilter;
  });

  const assignedCount = userRoles.filter(u => !!u.role).length;

  return {
    currentUser,
    userRoles,
    filtered,
    search,
    filter,
    modalOpen,
    editingUser,
    form,
    formError,
    toast,
    loading,
    setSearch,
    setFilter,
    openEditModal,
    closeModal,
    handleFormChange,
    saveRole,
    removeRole,
    changeRole,
    assignedCount,
  };
}