import { useEffect, useMemo, useState } from 'react';
import {
  collection,
  onSnapshot,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp,
  query,
  orderBy,
} from 'firebase/firestore';
import { db } from '../../../firebase/firebase';
import {
  exportVisitationsToCSV,
  filterVisitations,
} from '../components/visitationHelpers/visitationHelpers';
import type {
  NewVisitationInput,
  VisitationRecord,
} from '../components/visitationTypes/visitationTypes';

const COLLECTION = 'VISITATIONS';

export function useVisitations() {
  const [visitations, setVisitations] = useState<VisitationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<VisitationRecord | null>(null);

  const [filters, setFilters] = useState({
    member: '',
    visitType: '',
    month: '',
    year: '',
  });

  useEffect(() => {
    const q = query(
      collection(db, COLLECTION),
      orderBy('createdAt', 'desc')
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const records: VisitationRecord[] = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id:             docSnap.id,
          memberVisited:  Array.isArray(data.memberVisited) ? data.memberVisited : [],
          visitDate:      data.visitDate      ?? '',
          visitedBy:      Array.isArray(data.visitedBy) ? data.visitedBy : [],
          location:       data.location       ?? '',
          visitType:      data.visitType      ?? '',
          status:         data.status         ?? '',
          followUpNeeded: data.followUpNeeded ?? false,
          followUpDate:   data.followUpDate   ?? '',
          notes:          data.notes          ?? '',
        } as VisitationRecord;
      });
      setVisitations(records);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const filteredVisitations = useMemo(
    () => filterVisitations(visitations, filters),
    [visitations, filters]
  );

  function openAddModal() {
    setEditingRecord(null);
    setIsModalOpen(true);
  }

  function openEditModal(record: VisitationRecord) {
    setEditingRecord(record);
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
    setEditingRecord(null);
  }

  async function addVisitation(input: NewVisitationInput) {
    await addDoc(collection(db, COLLECTION), {
      ...input,
      notes: '',
      createdAt: serverTimestamp(),
    });
    closeModal();
  }

  async function updateVisitation(id: string, input: NewVisitationInput) {
    await updateDoc(doc(db, COLLECTION, id), {
      ...input,
      updatedAt: serverTimestamp(),
    });
    closeModal();
  }

  async function updateNotes(id: string, notes: string) {
    setVisitations((prev) =>
      prev.map((r) => (r.id === id ? { ...r, notes } : r))
    );
    await updateDoc(doc(db, COLLECTION, id), { notes });
  }

  function updateFilter(key: keyof typeof filters, value: string) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  function exportCSV() {
    exportVisitationsToCSV(filteredVisitations);
  }

  return {
    visitations: filteredVisitations,
    loading,
    filters,
    isModalOpen,
    editingRecord,
    openAddModal,
    openEditModal,
    closeModal,
    addVisitation,
    updateVisitation,
    updateNotes,
    updateFilter,
    exportCSV,
  };
}