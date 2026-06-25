import { create } from 'zustand';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../firebase/firebase';

// ── Types ─────────────────────────────────────────────────────
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

interface MembersStore {
  members: Member[];
  hydrated: boolean;   // true = already fetched from Firestore at least once
  loading: boolean;

  // Actions
  fetchIfNeeded: () => Promise<void>;   // fetch only when cache is empty
  addMember: (member: Member) => void;
  updateMember: (id: string, changes: Partial<Member>) => void;
  removeMember: (id: string) => void;
  invalidate: () => void;               // force re-fetch on next visit
}

// ── Helper ───────────────────────────────────────────────────
function parseDate(raw: any): string {
  if (!raw) return '';
  if (raw?.toDate) {
    return raw.toDate().toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    });
  }
  return raw ?? '';
}

// ── Store ─────────────────────────────────────────────────────
export const useMembersStore = create<MembersStore>((set, get) => ({
  members: [],
  hydrated: false,
  loading: false,

  fetchIfNeeded: async () => {
    // If already fetched, skip — this is the key to saving Firebase reads
    if (get().hydrated) return;

    set({ loading: true });
    try {
      const snapshot = await getDocs(collection(db, 'MEMBERS'));
      const list: Member[] = snapshot.docs
        .map(docSnap => {
          const data = docSnap.data() as any;
          return {
            id: docSnap.id,
            ...data,
            isArchived: data.isArchived ?? false,
            dateAdded: parseDate(data.dateAdded),
          } as Member;
        })
        .filter(m => !m.isArchived);

      set({ members: list, hydrated: true });
    } catch (err: any) {
      console.error('Fetch error:', err?.message);
    } finally {
      set({ loading: false });
    }
  },

  // Optimistic updates — store is updated immediately, no re-fetch needed
  addMember: (member) =>
    set(state => ({ members: [...state.members, member] })),

  updateMember: (id, changes) =>
    set(state => ({
      members: state.members.map(m => m.id === id ? { ...m, ...changes } : m),
    })),

  removeMember: (id) =>
    set(state => ({ members: state.members.filter(m => m.id !== id) })),

  // Call this if you ever need to force a fresh fetch (e.g. after bulk import)
  invalidate: () => set({ hydrated: false, members: [] }),
}));