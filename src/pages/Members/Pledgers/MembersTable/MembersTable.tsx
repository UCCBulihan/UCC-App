export interface Member {
  id: string;
  firstName: string;
  middleName: string;
  lastName: string;
  userId: number;
  isPledger: boolean;
  addedBy: string;
  dateAdded: string;
  isArchived: boolean;
}

interface Props {
  members: Member[];
  filtered: Member[];
  loading: boolean;
  onTogglePledger?: (id: string, current: boolean) => void;
  onArchive: (id: string) => void;
  onEdit: (member: Member) => void;  
}
function initials(m: Member) {
  return (m.firstName[0] || '') + (m.lastName[0] || '');
}

export default function MembersTable({
  members, filtered, loading,
  onTogglePledger, onArchive, onEdit
}: Props) {
  const colCount = onTogglePledger ? 5 : 4;

  return (
    <div className="members-card">
      <div className="table-scroll">
        <table className="members-table">
          <thead>
            <tr>
              <th>Member</th>
              {onTogglePledger && <th>Pledger</th>}
              <th>Added By</th>
              <th>Date Added</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={colCount} className="empty-cell">
                  <div className="empty-state"><p>Loading members…</p></div>
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={colCount} className="empty-cell">
                  <div className="empty-state">
                    <i className="fa-regular fa-user" aria-hidden="true" />
                    <p>No members found.</p>
                  </div>
                </td>
              </tr>
            ) : (
              filtered.map((m) => (
                <tr key={m.id}>
                  <td>
                    <div className="member-cell">
                      <div className="avatar">{initials(m)}</div>
                      <span className="member-name">
                        {m.firstName}{m.middleName ? ` ${m.middleName}` : ''} {m.lastName}
                      </span>
                    </div>
                  </td>
                  {onTogglePledger && (
                    <td>
                      <button
                        className={`toggle-pledger ${m.isPledger ? 'active' : ''}`}
                        onClick={() => onTogglePledger(m.id, m.isPledger)}
                        title={m.isPledger ? 'Click to remove pledger' : 'Click to mark as pledger'}
                      >
                        {m.isPledger
                          ? <><i className="fa-solid fa-circle-check" aria-hidden="true" /> Yes</>
                          : <span>No</span>}
                      </button>
                    </td>
                  )}
                  <td>
                    <span className="added-by">
                      <i className="fa-regular fa-user" style={{ fontSize: 12 }} aria-hidden="true" />
                      {m.addedBy}
                    </span>
                  </td>
                  <td><span className="date-text">{m.dateAdded}</span></td>
                  <td>
                    <div className="actions-cell">
                      <button className="btn-icon" title="Edit" onClick={() => onEdit(m)}>
                        <i className="fa-regular fa-pen-to-square" aria-hidden="true" />
                      </button>
                      <button className="btn-icon danger" title="Archive" onClick={() => onArchive(m.id)}>
                        <i className="fa-solid fa-box-archive" aria-hidden="true" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="table-footer">
        <span>Showing {filtered.length} of {members.length} member{members.length !== 1 ? 's' : ''}</span>
      </div>
    </div>
  );
}