import { useEffect } from 'react';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

export function useAuthSync() {
  useEffect(() => {
    const auth = getAuth();
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) return;

      const provider = user.providerData[0]?.providerId === 'google.com'
        ? 'google'
        : 'password';

      // Only login/profile fields are synced here. `role` and `departments`
      // are intentionally NOT touched — those are managed by your existing
      // admin-assignment flow (assignedBy / dateAssigned / modifiedBy /
      // modifiedDate). Because setDoc uses merge:true, this never overwrites
      // whatever an admin has already set for this user.
      await setDoc(
        doc(db, 'USERS', user.uid),
        {
          uid:         user.uid,
          displayName: user.displayName || user.email?.split('@')[0] || '',
          email:       user.email || '',
          photoURL:    user.photoURL || '',
          provider,
          lastLogin:   serverTimestamp(),
        },
        { merge: true }
      );
    });

    return () => unsub();
  }, []);
}