import { useState, useEffect } from 'react';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../../firebase/firebase';

export type RoleLevel = 'Admin' | 'Moderator' | 'Member' | 'Viewer' | '';

export function useCurrentUserRole() {
  const [role, setRole] = useState<RoleLevel>('');
  const [loadingRole, setLoadingRole] = useState(true);

  useEffect(() => {
    const auth = getAuth();
    let unsubDoc: (() => void) | null = null;

    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (unsubDoc) unsubDoc();

      if (!user) {
        setRole('');
        setLoadingRole(false);
        return;
      }

      // Real-time listener sa USERS doc ng current user
      unsubDoc = onSnapshot(doc(db, 'USERS', user.uid), (snap) => {
        const data = snap.data();
        setRole((data?.role as RoleLevel) || '');
        setLoadingRole(false);
      });
    });

    return () => {
      unsubAuth();
      if (unsubDoc) unsubDoc();
    };
  }, []);

  const isAdmin = role === 'Admin';
  const isModerator = role === 'Moderator';
  const canManage = isAdmin || isModerator; // Admin + Moderator = pwede mag-edit

  return { role, loadingRole, isAdmin, isModerator, canManage };
}