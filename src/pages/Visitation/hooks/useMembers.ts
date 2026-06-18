import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where, orderBy } from 'firebase/firestore';
import { db } from '../../../firebase/firebase';

interface Member {
  id: string;
  firstName: string;
  middleName: string;
  lastName: string;
  fullName: string;
}

export function useMembers() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, 'MEMBERS'),
      where('isArchived', '==', false),
      orderBy('lastName', 'asc')
    );

    const unsub = onSnapshot(q, (snapshot) => {
          console.log('Members snapshot size:', snapshot.size); // 👈 add this
  console.log('Members docs:', snapshot.docs.map(d => d.data())); // 👈 add this
      const list: Member[] = snapshot.docs.map((docSnap) => {
        const d = docSnap.data();
        const middle = d.middleName ? ` ${d.middleName}` : '';
        const fullName = `${d.lastName}, ${d.firstName}${middle}`.trim();
        return {
          id:         docSnap.id,
          firstName:  d.firstName  ?? '',
          middleName: d.middleName ?? '',
          lastName:   d.lastName   ?? '',
          fullName,
        };
      });
      setMembers(list);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const memberNames = members.map((m) => m.fullName);

  return { members, memberNames, loading };
}