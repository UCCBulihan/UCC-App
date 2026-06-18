import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, getDocsFromServer, doc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../../../../../../firebase/firebase';
import './ManagePledgersModal.css';

interface Member {
  id: string;
  userId: number;
  name: string;
  initials: string;
  isPledger: boolean;
}

interface ManagePledgersModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPledgersUpdated?: () => void;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(n => n[0].toUpperCase())
    .join('');
}

export default function ManagePledgersModal({
  isOpen,
  onClose,
  onPledgersUpdated,
}: ManagePledgersModalProps) {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  async function fetchMembers() {
    setLoading(true);
    try {
      const snapshot = await getDocsFromServer(collection(db, 'MEMBERS'));
      const seen = new Set<number>();
      const list: Member[] = [];

      snapshot.forEach(docSnap => {
        const d = docSnap.data();
        if (d.userId && !seen.has(d.userId) && !d.isArchived) {
          seen.add(d.userId);
          const name = `${d.firstName} ${d.lastName}`;
          list.push({
            id: docSnap.id,
            userId: d.userId,
            name,
            initials: getInitials(name),
            isPledger: !!d.isPledger,
          });
        }
      });

      setMembers(list);
    } catch (err: any) {
      console.error('fetchMembers error:', err?.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!isOpen) return;
    const unsub = onAuthStateChanged(auth, user => {
      if (user) fetchMembers();
    });
    return () => unsub();
  }, [isOpen]);

  async function togglePledger(member: Member) {
    setSaving(member.id);
    try {
      await updateDoc(doc(db, 'MEMBERS', member.id), {
        isPledger: !member.isPledger,
      });
      setMembers(prev =>
        prev.map(m =>
          m.id === member.id ? { ...m, isPledger: !m.isPledger } : m
        )
      );
      onPledgersUpdated?.();
    } catch (err: any) {
      console.error('togglePledger error:', err?.message);
    } finally {
      setSaving(null);
    }
  }

  if (!isOpen) return null;

  const pledgerCount = members.filter(m => m.isPledger).length;
  const filtered = members.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="mpm-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="mpm-modal" role="dialog" aria-modal="true" aria-labelledby="mpm-title">

        {/* Header */}
        <div className="mpm-header">
          <div>
            <h2 id="mpm-title">Manage Pledgers</h2>
            <p>Members marked as pledgers appear in the tracker</p>
          </div>
          <button className="mpm-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        {/* Search */}
        <div className="mpm-search-wrap">
          <span className="mpm-search-icon">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
              strokeLinejoin="round" aria-hidden="true">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
          </span>
          <input
            className="mpm-search"
            type="text"
            placeholder="Search members..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            aria-label="Search members"
          />
          {search && (
            <button className="mpm-search-clear" onClick={() => setSearch('')} aria-label="Clear search">✕</button>
          )}
        </div>

        {/* Column labels */}
        <div className="mpm-col-headers">
          <span>Member</span>
          <span>Pledger</span>
        </div>

        {/* Member list */}
        <div className="mpm-list">
          {loading ? (
            <div className="mpm-empty">Loading members...</div>
          ) : filtered.length === 0 ? (
            <div className="mpm-empty">
              {search ? `No members matching "${search}"` : 'No members found.'}
            </div>
          ) : (
            filtered.map(member => (
              <div className="mpm-row" key={member.id}>
                <div className="mpm-member-info">
                  <div className="mpm-avatar">{member.initials}</div>
                  <span className="mpm-name">{member.name}</span>
                </div>
                <div className="mpm-pledger-cell">
                  <button
                    className={`mpm-badge ${member.isPledger ? 'yes' : 'no'}`}
                    onClick={() => togglePledger(member)}
                    disabled={saving === member.id}
                    aria-label={`${member.isPledger ? 'Remove' : 'Mark'} ${member.name} as pledger`}
                  >
                    {saving === member.id ? (
                      '...'
                    ) : member.isPledger ? (
                      <>✓ Yes</>
                    ) : (
                      <>○ No</>
                    )}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="mpm-footer">
          <span>
            {search
              ? `${filtered.length} result${filtered.length !== 1 ? 's' : ''} · ${pledgerCount} of ${members.length} pledgers`
              : `Showing ${pledgerCount} of ${members.length} members as pledgers`}
          </span>
          <button className="mpm-done" onClick={onClose}>Done</button>
        </div>

      </div>
    </div>
  );
}