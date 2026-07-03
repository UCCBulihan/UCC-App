import { useState, useEffect } from 'react';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot, collection, getDocs } from 'firebase/firestore';
import { db } from './firebase';
import type { UserAccess, DepartmentMembership } from '../../services/interface/IMenuService';

interface UseUserAccessResult {
  userAccess: UserAccess | null;
  loading: boolean;
}

// Reads the logged-in user's `role` and `departments` from their Firestore
// USERS document, then resolves each departmentId against the DEPARTMENTS
// collection to get human-readable department names (used for menu filtering).
export function useUserAccess(): UseUserAccessResult {
  const [userAccess, setUserAccess] = useState<UserAccess | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = getAuth();
    let unsubDoc: (() => void) | undefined;

    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      if (unsubDoc) {
        unsubDoc();
        unsubDoc = undefined;
      }

      if (!user) {
        setUserAccess(null);
        setLoading(false);
        return;
      }

      try {
        // DEPARTMENTS rarely changes, so a one-time read per session is enough.
        // Switch to onSnapshot here too if you need it to update live.
        const deptSnap = await getDocs(collection(db, 'DEPARTMENTS'));
        const deptNameById = new Map<string, string>();
        deptSnap.forEach(d => deptNameById.set(d.id, (d.data().name as string) ?? ''));

        // 🔍 DEBUG — remove once everything checks out
        console.log('[useUserAccess] DEPARTMENTS loaded:', deptSnap.size, 'docs');
        console.log('[useUserAccess] deptNameById map:', Object.fromEntries(deptNameById));

        unsubDoc = onSnapshot(
          doc(db, 'USERS', user.uid),
          (snap) => {
            const data = snap.data();
            const departments = (data?.departments ?? []) as DepartmentMembership[];

            const resolved: UserAccess = {
              role: data?.role ?? '',
              departments,
              departmentNames: departments
                .map(d => deptNameById.get(d.departmentId))
                .filter((name): name is string => !!name),
            };

            // 🔍 DEBUG — remove once everything checks out
            console.log('[useUserAccess] raw user departments:', departments);
            console.log('[useUserAccess] resolved userAccess:', resolved);

            setUserAccess(resolved);
            setLoading(false);
          },
          (error) => {
            console.error('[useUserAccess] onSnapshot(USERS) error:', error);
            setLoading(false);
          }
        );
      } catch (error) {
        console.error('[useUserAccess] getDocs(DEPARTMENTS) error:', error);
        setLoading(false);
      }
    });

    return () => {
      unsubAuth();
      if (unsubDoc) unsubDoc();
    };
  }, []);

  return { userAccess, loading };
}