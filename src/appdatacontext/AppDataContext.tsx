
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import { collection, getDocs, doc, onSnapshot } from 'firebase/firestore';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth, db } from '../firebase/firebase'; 
// ── Types ──────────────────────────────────────────────────────────────────

export interface Member {
  id: string;
  userId: number;
  firstName: string;
  middleName: string;
  lastName: string;
  isPledger: boolean;
  isArchived: boolean;
  addedBy: string;
  dateAdded: string;
  modifiedBy?: string;
  modifiedDate?: string;
}

export type RoleLevel = 'Admin' | 'Moderator' | 'Member' | 'Viewer' | '';

interface AppDataContextValue {
  // auth
  currentUser: User | null;
  authReady: boolean;

  // members — fetched ONCE per login, shared everywhere
  members: Member[];
  membersLoading: boolean;
  refetchMembers: () => Promise<void>; // call this after add/edit/archive/toggle

  // role — ONE onSnapshot listener for the whole app
  role: RoleLevel;
  roleLoading: boolean;
  isAdmin: boolean;
  isModerator: boolean;
  canManage: boolean;
}

const AppDataContext = createContext<AppDataContextValue | undefined>(undefined);

// ── Provider ───────────────────────────────────────────────────────────────

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);

  const [members, setMembers] = useState<Member[]>([]);
  const [membersLoading, setMembersLoading] = useState(true);

  const [role, setRole] = useState<RoleLevel>('');
  const [roleLoading, setRoleLoading] = useState(true);

  // Fetch MEMBERS once. Exposed as refetchMembers so any page can re-sync
  // the shared list right after a write (add/edit/archive/toggle pledger).
  const fetchMembers = useCallback(async () => {
    setMembersLoading(true);
    try {
      const snap = await getDocs(collection(db, 'MEMBERS'));
      const list: Member[] = snap.docs.map((d) => {
        const data = d.data() as any;
        return {
          id: d.id,
          ...data,
          isArchived: data.isArchived ?? false,
        } as Member;
      });
      setMembers(list);
    } catch (err) {
      console.error('AppDataContext: fetchMembers error', err);
    } finally {
      setMembersLoading(false);
    }
  }, []);

  useEffect(() => {
    let unsubRole: (() => void) | null = null;

    const unsubAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setAuthReady(true);

      if (unsubRole) {
        unsubRole();
        unsubRole = null;
      }

      if (!user) {
        setRole('');
        setRoleLoading(false);
        setMembers([]);
        setMembersLoading(false);
        return;
      }

      // Single real-time role listener for the entire app (was duplicated
      // before: one in LedgerTracker's useCurrentUserRole, one in
      // PledgeTracker's useCurrentUserRole — now there's just this one).
      unsubRole = onSnapshot(doc(db, 'USERS', user.uid), (snap) => {
        const data = snap.data();
        setRole((data?.role as RoleLevel) || '');
        setRoleLoading(false);
      });

      // Fetch members ONCE per login. Every page reads this same list.
      fetchMembers();
    });

    return () => {
      unsubAuth();
      if (unsubRole) unsubRole();
    };
  }, [fetchMembers]);

  const isAdmin = role === 'Admin';
  const isModerator = role === 'Moderator';
  const canManage = isAdmin || isModerator;

  return (
    <AppDataContext.Provider
      value={{
        currentUser,
        authReady,
        members,
        membersLoading,
        refetchMembers: fetchMembers,
        role,
        roleLoading,
        isAdmin,
        isModerator,
        canManage,
      }}
    >
      {children}
    </AppDataContext.Provider>
  );
}

// ── Hook ───────────────────────────────────────────────────────────────────

export function useAppData() {
  const ctx = useContext(AppDataContext);
  if (!ctx) {
    throw new Error('useAppData() must be used inside <AppDataProvider>');
  }
  return ctx;
}