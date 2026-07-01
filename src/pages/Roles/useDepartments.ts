import { useState, useEffect } from 'react';
import {
  collection, onSnapshot, doc, addDoc, updateDoc, deleteDoc, writeBatch,
} from 'firebase/firestore';
import { db } from '../../firebase/firebase';
import type { UserRole } from './useRoles';

export interface Department {
  id: string;
  name: string;
  description: string;
  position: string;
  isActive: boolean;
  createdAt?: string;
  createdBy?: string;
  updatedAt?: string;
}

export interface DepartmentFormState {
  name: string;
  description: string;
  position: string;
  isActive: boolean;
}

type DepartmentView = 'list' | 'form';

function formatDate() {
  return new Date().toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

function emptyForm(): DepartmentFormState {
  return { name: '', description: '', position: '', isActive: true };
}

export function useDepartments(
  currentUser: string,
  userRoles: UserRole[],
  notify: (msg: string) => void,
) {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [view, setView] = useState<DepartmentView>('list');
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [form, setForm] = useState<DepartmentFormState>(emptyForm());
  const [formError, setFormError] = useState('');
  const [pendingDelete, setPendingDelete] = useState<Department | null>(null);
  const [userSearch, setUserSearch] = useState('');

  // Real-time listener
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'DEPARTMENTS'), (snapshot) => {
      const list: Department[] = snapshot.docs.map((docSnap) => {
        const data = docSnap.data() as any;
        return {
          id: docSnap.id,
          name: data.name || '',
          description: data.description || '',
          position: data.position || '',
          isActive: data.isActive !== false,
          createdAt: data.createdAt || '',
          createdBy: data.createdBy || '',
          updatedAt: data.updatedAt || '',
        };
      });
      list.sort((a, b) => a.name.localeCompare(b.name));
      setDepartments(list);
      setLoading(false);
    }, (err) => {
      console.error('Departments snapshot error:', err?.message);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const departmentById = new Map(departments.map((d) => [d.id, d]));

  function assignedUserCount(departmentId: string): number {
    return userRoles.filter((u) => u.departmentId === departmentId).length;
  }

  // ── Modal open/close ──────────────────────────────────────
  function openModal() {
    setView('list');
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
    setView('list');
    setEditingDepartment(null);
    setForm(emptyForm());
    setFormError('');
    setUserSearch('');
    setPendingDelete(null);
  }

  function openCreateForm() {
    setEditingDepartment(null);
    setForm(emptyForm());
    setFormError('');
    setView('form');
  }

  function openEditForm(department: Department) {
    setEditingDepartment(department);
    setForm({
      name: department.name,
      description: department.description,
      position: department.position,
      isActive: department.isActive,
    });
    setFormError('');
    setUserSearch('');
    setView('form');
  }

  function backToList() {
    setView('list');
    setEditingDepartment(null);
    setFormError('');
  }

  function handleFormChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const target = e.target as HTMLInputElement;
    const { id, value, type, checked } = target;
    setForm((prev) => ({
      ...prev,
      [id]: type === 'checkbox' ? checked : value,
    } as DepartmentFormState));
  }

  // ── Save (create or edit) ─────────────────────────────────
  async function saveDepartment() {
    const name = form.name.trim();
    if (!name) {
      setFormError('Department name is required.');
      return;
    }

    const duplicate = departments.some(
      (d) => d.name.toLowerCase() === name.toLowerCase() && d.id !== editingDepartment?.id
    );
    if (duplicate) {
      setFormError('A department with this name already exists.');
      return;
    }

    try {
      if (editingDepartment) {
        await updateDoc(doc(db, 'DEPARTMENTS', editingDepartment.id), {
          name,
          description: form.description.trim(),
          position: form.position.trim(),
          isActive: form.isActive,
          updatedAt: formatDate(),
        });
        notify(`"${name}" updated.`);
      } else {
        await addDoc(collection(db, 'DEPARTMENTS'), {
          name,
          description: form.description.trim(),
          position: form.position.trim(),
          isActive: form.isActive,
          createdAt: formatDate(),
          createdBy: currentUser,
          updatedAt: '',
        });
        notify(`"${name}" created.`);
      }
      backToList();
    } catch (err: any) {
      console.error('Save department error:', err?.message);
      setFormError('Failed to save department. Try again.');
    }
  }

  // ── Delete (and unassign affected users) ──────────────────
  function requestDelete(department: Department) {
    setPendingDelete(department);
  }

  function cancelDelete() {
    setPendingDelete(null);
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    const target = pendingDelete;
    try {
      const affected = userRoles.filter((u) => u.departmentId === target.id);
      if (affected.length > 0) {
        const batch = writeBatch(db);
        affected.forEach((u) => {
          batch.update(doc(db, 'USERS', u.id), { departmentId: null });
        });
        await batch.commit();
      }
      await deleteDoc(doc(db, 'DEPARTMENTS', target.id));
      notify(`"${target.name}" deleted.`);
      setPendingDelete(null);
      if (editingDepartment?.id === target.id) backToList();
    } catch (err: any) {
      console.error('Delete department error:', err?.message);
      notify('Failed to delete department.');
    }
  }

  // ── Assign / unassign a single user (multiple users per dept) ─
  async function toggleUserAssignment(department: Department, user: UserRole) {
    const nextDeptId = user.departmentId === department.id ? null : department.id;
    try {
      await updateDoc(doc(db, 'USERS', user.id), { departmentId: nextDeptId });
    } catch (err: any) {
      console.error('Assign department error:', err?.message);
      notify('Failed to update assignment.');
    }
  }

  const filteredDepartments = departments.filter((d) =>
    d.name.toLowerCase().includes(search.toLowerCase())
  );

  return {
    departments,
    departmentById,
    filteredDepartments,
    loading,
    search,
    setSearch,
    isModalOpen,
    view,
    editingDepartment,
    form,
    formError,
    pendingDelete,
    userSearch,
    setUserSearch,
    assignedUserCount,
    openModal,
    closeModal,
    openCreateForm,
    openEditForm,
    backToList,
    handleFormChange,
    saveDepartment,
    requestDelete,
    cancelDelete,
    confirmDelete,
    toggleUserAssignment,
  };
}
