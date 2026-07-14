import { useEffect } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../../firebase/firebase';
import NavigationBar from '../../Home/NavigationBar/NavigationBar';
import { useMembersStore } from '../useMembersStore';

function initials(firstName: string, lastName: string) {
  return (firstName?.[0] || '') + (lastName?.[0] || '');
}

export default function ArchivesMembers() {
  const { archivedMembers, archivedLoading, fetchArchivedIfNeeded, restoreMember } = useMembersStore();

  useEffect(() => { fetchArchivedIfNeeded(); }, [fetchArchivedIfNeeded]);

  async function handleRestore(id: string) {
    try {
      await updateDoc(doc(db, 'MEMBERS', id), { isArchived: false });
      restoreMember(id);
    } catch (err: any) {
      console.error('Restore error:', err?.message);
    }
  }

  return (
    <div className="app-layout">
      <NavigationBar />
      <main className="main-content">
        <div className="page">

          <div className="page-header">
            <div className="page-header-left">
              <h1>Archived Members</h1>
              <p>{archivedMembers.length} archived member{archivedMembers.length !== 1 ? 's' : ''}</p>
            </div>
          </div>

          <div className="members-card">
            <div className="table-scroll">
              <table className="members-table">
                <thead>
                  <tr>
                    <th>Member</th>
                    <th>Archived By</th>
                    <th>Date Archived</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {archivedLoading ? (
                    <tr>
                      <td colSpan={4} className="empty-cell">
                        <div className="empty-state"><p>Loading…</p></div>
                      </td>
                    </tr>
                  ) : archivedMembers.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="empty-cell">
                        <div className="empty-state">
                          <i className="fa-regular fa-folder-open" aria-hidden="true" />
                          <p>No archived members.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    archivedMembers.map(m => (
                      <tr key={m.id}>
                        <td>
                          <div className="member-cell">
                            <div className="avatar">{initials(m.firstName, m.lastName)}</div>
                            <span className="member-name">
                              {m.firstName}{m.middleName ? ` ${m.middleName}` : ''} {m.lastName}
                            </span>
                          </div>
                        </td>
                        <td>
                          <span className="added-by">
                            <i className="fa-regular fa-user" style={{ fontSize: 12 }} aria-hidden="true" />
                            {m.archivedBy || '—'}
                          </span>
                        </td>
                        <td><span className="date-text">{m.archivedDate || '—'}</span></td>
                        <td>
                          <div className="actions-cell">
                            <button className="btn-icon" title="Restore" onClick={() => handleRestore(m.id)}>
                              <i className="fa-solid fa-rotate-left" aria-hidden="true" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}