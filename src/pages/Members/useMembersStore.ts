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
  archivedBy?: string;
  archivedDate?: string;

  // ── Basic Information ──
  nickname?: string;
  gender?: string;
  dateOfBirth?: string;
  civilStatus?: string;
  motherName?: string;
  fatherName?: string;

  // ── Family Information ──
  numberOfSiblings?: number | string;
  siblingNames?: string;

  // ── Contact Information ──
  phoneNumber?: string;
  emailAddress?: string;
  address?: string;
  emergencyContactName?: string;
  emergencyContactNumber?: string;

  // ── Church Information ──
  dateRegistered?: string;
  membershipStatus?: string;
  ministry?: string;
  remarks?: string;
}

interface MembersStore {
  members: Member[];
  hydrated: boolean;
  loading: boolean;

  archivedMembers: Member[];
  archivedHydrated: boolean;
  archivedLoading: boolean;

  // Actions
  fetchIfNeeded: () => Promise<void>;
  addMember: (member: Member) => void;
  updateMember: (id: string, changes: Partial<Member>) => void;
  removeMember: (id: string) => void;
  invalidate: () => void;

  fetchArchivedIfNeeded: () => Promise<void>;
  restoreMember: (id: string) => void;
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

  archivedMembers: [],
  archivedHydrated: false,
  archivedLoading: false,

  fetchIfNeeded: async () => {
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

  addMember: (member) =>
    set(state => ({ members: [...state.members, member] })),

  updateMember: (id, changes) =>
    set(state => ({
      members: state.members.map(m => m.id === id ? { ...m, ...changes } : m),
    })),

  removeMember: (id) =>
    set(state => ({ members: state.members.filter(m => m.id !== id) })),

  invalidate: () => set({ hydrated: false, members: [] }),

  fetchArchivedIfNeeded: async () => {
    if (get().archivedHydrated) return;

    set({ archivedLoading: true });
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
            archivedDate: parseDate(data.archivedDate) || data.archivedDate,
          } as Member;
        })
        .filter(m => m.isArchived);

      set({ archivedMembers: list, archivedHydrated: true });
    } catch (err: any) {
      console.error('Fetch archived error:', err?.message);
    } finally {
      set({ archivedLoading: false });
    }
  },

  restoreMember: (id) =>
    set(state => {
      const restored = state.archivedMembers.find(m => m.id === id);
      if (!restored) return state;
      const { archivedBy, archivedDate, ...rest } = restored;
      return {
        archivedMembers: state.archivedMembers.filter(m => m.id !== id),
        members: [...state.members, { ...rest, isArchived: false }],
      };
    }),
}));