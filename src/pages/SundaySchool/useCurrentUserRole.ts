import { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { db } from '../../firebase/firebase';

export type RoleLevel = 'Admin' | 'Moderator' | 'Member' | 'Viewer' | '';

// Lightweight companion to useRoles.ts — that hook is built for the admin
// "manage everyone's role" screen (subscribes to the whole USERS
// collection). Most pages don't need that; they only need to know
// "what can *I*, the logged-in user, do right now".
//
// IMPORTANT: this queries by the `uid` FIELD, not by document ID. Some
// USERS docs are keyed by uid, but others (e.g. created via addDoc on
// signup) may have an auto-generated doc ID with `uid` stored as a plain
// field instead — see the `data.uid || docSnap.id` fallback in
// useRoles.ts. Looking the record up with doc(db, 'USERS', uid) would
// silently miss those and read stale/wrong data, so we match the same
// where('uid', '==', uid) approach useRoles.ts effectively relies on.
export function useCurrentUserRole() {
  const [role, setRole] = useState<RoleLevel>('');
  const [uid, setUid] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = getAuth();
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      setUid(user?.uid || '');
      if (!user) {
        setRole('');
        setLoading(false);
      }
    });
    return () => unsubAuth();
  }, []);

  useEffect(() => {
    if (!uid) return;
    const q = query(collection(db, 'USERS'), where('uid', '==', uid));
    const unsub = onSnapshot(
      q,
      (snapshot) => {
        if (snapshot.empty) {
          console.warn(`useCurrentUserRole: no USERS doc found with uid field "${uid}".`);
          setRole('');
        } else {
          // If more than one doc matches (shouldn't normally happen), take
          // the first — but this is itself worth investigating/cleaning up
          // in the data if it ever fires.
          if (snapshot.size > 1) {
            console.warn(`useCurrentUserRole: multiple USERS docs matched uid "${uid}"; using the first.`);
          }
          const data = snapshot.docs[0].data() as any;
          setRole((data?.role as RoleLevel) || '');
        }
        setLoading(false);
      },
      (err) => {
        console.error('useCurrentUserRole query error:', err?.message);
        setRole('');
        setLoading(false);
      }
    );
    return () => unsub();
  }, [uid]);

  // ── Permission helpers, shared across Sunday School pages ──────────
  // Financial fields (amounts, received/paid status, deleting records)
  // are the ones that actually move money on the books, so only
  // Admin/Moderator can touch those.
  const canEditFinancials = role === 'Admin' || role === 'Moderator';

  // Non-financial fields (notes, sponsor names, teacher/topic
  // assignments) are open to Member and up — Viewer stays read-only
  // everywhere.
  const canEditDetails = role === 'Admin' || role === 'Moderator' || role === 'Member';

  return { role, uid, loading, canEditFinancials, canEditDetails };
}