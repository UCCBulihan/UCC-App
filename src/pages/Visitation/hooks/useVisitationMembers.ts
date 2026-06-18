import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, orderBy, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../../firebase/firebase';

export interface VisitationMember {
  id: string;
  fullName: string;
  isVisitor: boolean;
}

export function useVisitationMembers() {
  const [members, setMembers] = useState<VisitationMember[]>([]);

  useEffect(() => {
    const q = query(collection(db, 'MEMBERS'), orderBy('lastName', 'asc'));

    const unsub = onSnapshot(q, (snapshot) => {
      const list: VisitationMember[] = snapshot.docs
        .map((docSnap) => {
          const d = docSnap.data();
          if (d.isArchived) return null;
          const middle = d.middleName ? ` ${d.middleName}` : '';
          return {
            id: docSnap.id,
            fullName: `${d.lastName}, ${d.firstName}${middle}`.trim(),
            isVisitor: d.isVisitor === true,
          };
        })
        .filter(Boolean) as VisitationMember[];

      setMembers(list);
    });

    return () => unsub();
  }, []);

  // Toggle isVisitor field in Firestore
  async function toggleVisitor(id: string, isVisitor: boolean) {
    await updateDoc(doc(db, 'MEMBERS', id), { isVisitor });
  }

  const memberNames = members.map((m) => m.fullName);
  const visitorNames = members.filter((m) => m.isVisitor).map((m) => m.fullName);

  return { members, memberNames, visitorNames, toggleVisitor };
}