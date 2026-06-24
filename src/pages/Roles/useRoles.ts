import { useState, useEffect, useRef } from 'react';
import {
  collection, onSnapshot, doc, updateDoc, setDoc,
} from 'firebase/firestore';
import { db } from '../../firebase/firebase';
import { getAuth, onAuthStateChanged } from 'firebase/auth';

export type RoleLevel = 'Admin' | 'Moderator' | 'Member' | 'Viewer';

export interface UserRole {
  id: string;
  uid: string;
  displayName: string;
  email: string;
  photoURL: string;
  role: RoleLevel | '';
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


const ROLE_ORDER: Record<string, number> = {
  Admin:     0,
  Moderator: 1,
  Member:    2,
  Viewer:    3,
  '':        4,
};

function formatDate() {
  return new Date().toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

export function useRoles() {
  const [currentUser, setCurrentUser] = useState('');
  const [currentUserUid, setCurrentUserUid] = useState('');
  const [currentUserRole, setCurrentUserRole] = useState<RoleLevel | ''>('');
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

  useEffect(() => {
    const auth = getAuth();
    const unsub = onAuthStateChanged(auth, user => {
      setCurrentUser(user?.displayName || user?.email || 'Unknown');
      setCurrentUserUid(user?.uid || '');
    });
    return () => unsub();
  }, []);

  // Real-time listener
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'USERS'), (snapshot) => {
      const list: UserRole[] = snapshot.docs.map(docSnap => {
        const data = docSnap.data() as any;
        return {
          id:           docSnap.id,
          uid:          data.uid || docSnap.id,
          displayName:  data.displayName || '',
          email:        data.email || '',
          photoURL:     data.photoURL || '',
          provider:     data.provider || '',
          role:         data.role || '',
          assignedBy:   data.assignedBy || '',
          dateAssigned: data.dateAssigned || '',
          modifiedBy:   data.modifiedBy || '',
          modifiedDate: data.modifiedDate || '',
        };
      });

      list.sort((a, b) => (ROLE_ORDER[a.role] ?? 4) - (ROLE_ORDER[b.role] ?? 4));
      setUserRoles(list);
      setLoading(false);
    }, (err) => {
      console.error('Snapshot error:', err?.message);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  // ── Sync currentUserRole from userRoles ──────────────────
  useEffect(() => {
    if (!currentUserUid) return;
    const me = userRoles.find(u => u.uid === currentUserUid);
    setCurrentUserRole(me?.role || '');
  }, [userRoles, currentUserUid]);

  // ── Admin count ──────────────────────────────────────────
  const adminCount = userRoles.filter(u => u.role === 'Admin').length;

  // ── Last Admin check ─────────────────────────────────────
  function isLastAdmin(): boolean {
    return currentUserRole === 'Admin' && adminCount === 1;
  }

  // ── Permission checks ────────────────────────────────────
  function canEditUser(target: UserRole): boolean {
    if (currentUserRole !== 'Admin') return false;
    if (target.role === 'Admin' && target.uid !== currentUserUid) return false;
    return true;
  }

  function canRemoveUser(target: UserRole): boolean {
    if (currentUserRole !== 'Admin') return false;
    if (target.role === 'Admin' && target.uid !== currentUserUid) return false;
    return true;
  }

  function showToast(msg: string) {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 2800);
  }

  function openEditModal(user: UserRole) {
    if (!canEditUser(user)) return;
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

  function handleFormChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { id, value } = e.target;
    setForm(prev => ({ ...prev, [id]: value }));
  }

  async function saveRole() {
    if (!editingUser) return;
    if (!canEditUser(editingUser)) {
      setFormError('You do not have permission to edit this user.');
      return;
    }

    // ── Last Admin protection ────────────────────────────
    const isSelf = editingUser.uid === currentUserUid;
    if (isSelf && isLastAdmin() && form.role !== 'Admin') {
      setFormError(
        'You are the only Admin. Transfer admin rights to another user first before changing your role.'
      );
      return;
    }

    try {
      const isEdit = !!editingUser.role;
      const update = {
        role:         form.role,
        assignedBy:   isEdit ? editingUser.assignedBy : currentUser,
        dateAssigned: isEdit ? editingUser.dateAssigned : formatDate(),
        modifiedBy:   isEdit ? currentUser : '',
        modifiedDate: isEdit ? formatDate() : '',
      };
      await setDoc(doc(db, 'USERS', editingUser.uid), update, { merge: true });
      closeModal();
      showToast(`Role set to ${form.role} for ${editingUser.displayName || editingUser.email}.`);
    } catch (err: any) {
      console.error('Save role error:', err?.message);
      setFormError('Failed to save role. Try again.');
    }
  }

  async function removeRole(id: string) {
    const target = userRoles.find(u => u.id === id);
    if (!target || !canRemoveUser(target)) {
      showToast('You do not have permission to remove this role.');
      return;
    }

    // ── Last Admin protection ────────────────────────────
    const isSelf = target.uid === currentUserUid;
    if (isSelf && isLastAdmin()) {
      showToast('You are the only Admin. Transfer admin rights to another user first before removing your role.');
      return;
    }

    try {
      await updateDoc(doc(db, 'USERS', id), {
        role:         '',
        assignedBy:   '',
        dateAssigned: '',
        modifiedBy:   currentUser,
        modifiedDate: formatDate(),
      });
      showToast('Role removed.');
    } catch (err: any) {
      console.error('Remove role error:', err?.message);
    }
  }

  async function changeRole(id: string, newRole: RoleLevel) {
    const target = userRoles.find(u => u.id === id);
    if (!target || !canEditUser(target)) {
      showToast('You do not have permission to change this role.');
      return;
    }

    // ── Last Admin protection ────────────────────────────
    const isSelf = target.uid === currentUserUid;
    if (isSelf && isLastAdmin() && newRole !== 'Admin') {
      showToast('You are the only Admin. Transfer admin rights to another user first before changing your role.');
      return;
    }

    try {
      const update = {
        role:         newRole,
        assignedBy:   target?.assignedBy || currentUser,
        dateAssigned: target?.dateAssigned || formatDate(),
        modifiedBy:   currentUser,
        modifiedDate: formatDate(),
      };
      await updateDoc(doc(db, 'USERS', id), update);
      showToast(`Role changed to ${newRole}.`);
    } catch (err: any) {
      console.error('Role change error:', err?.message);
    }
  }

  const assignedCount = userRoles.filter(u => !!u.role).length;

  const filtered = userRoles.filter(u => {
    const searchStr = `${u.displayName} ${u.email}`.toLowerCase();
    const matchSearch = searchStr.includes(search.toLowerCase());
    const matchFilter =
      filter === 'all'
      || (filter === 'unassigned' && !u.role)
      || u.role.toLowerCase() === filter.toLowerCase();
    return matchSearch && matchFilter;
  });

  return {
    currentUser,
    currentUserUid,
    currentUserRole,
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
    assignedCount,
    setSearch,
    setFilter,
    openEditModal,
    closeModal,
    handleFormChange,
    saveRole,
    removeRole,
    changeRole,
    canEditUser,
    canRemoveUser,
    isLastAdmin,
  };
}