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
  paginated?: Member[];           // optional — falls back to filtered if not provided
  loading: boolean;
  onTogglePledger?: (id: string, current: boolean) => void;
  onArchive: (id: string) => void;
  onEdit: (member: Member) => void;
  onViewProfile?: (member: Member) => void;
  // pagination (all optional — omit to show all rows without controls)
  pageSize?: number;
  currentPage?: number;
  totalPages?: number;
  onPageSizeChange?: (size: number) => void;
  onPageChange?: (page: number) => void;
}

function initials(m: Member) {
  return (m.firstName[0] || '') + (m.lastName[0] || '');
}

export default function MembersTable({
  members = [], filtered = [], paginated, loading,
  onTogglePledger, onArchive, onEdit, onViewProfile,
  pageSize, currentPage, totalPages,
  onPageSizeChange, onPageChange,
}: Props) {
  const colCount = onTogglePledger ? 5 : 4;
  const rows = paginated ?? filtered;         // use paginated if provided, else all filtered
  const hasPagination = !!onPageSizeChange;   // show footer controls only when wired up

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
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={colCount} className="empty-cell">
                  <div className="empty-state">
                    <i className="fa-regular fa-user" aria-hidden="true" />
                    <p>No members found.</p>
                  </div>
                </td>
              </tr>
            ) : (
              rows.map((m) => (
                <tr key={m.id}>
                  <td>
                    <div className="member-cell">
                      <div className="avatar">{initials(m)}</div>
                      <span className="member-name">
                        {m.firstName}{m.middleName ? ` ${m.middleName}` : ''} {m.lastName}
                      </span>
                      {onViewProfile && (
                        <button
                          className="btn-view-profile"
                          title="View Profile"
                          onClick={() => onViewProfile(m)}
                        >
                          <i className="fa-regular fa-address-card" aria-hidden="true" />
                        </button>
                      )}
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

      {/* ── Footer ── */}
      <div className="table-footer">
        <div className="footer-left">
          {hasPagination && onPageSizeChange && (
            <div className="page-size-wrap">
              <span className="page-size-label">Rows</span>
              <select
                value={pageSize}
                onChange={e => onPageSizeChange(Number(e.target.value))}
                className="page-size-select"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={15}>15</option>
              </select>
            </div>
          )}
          <span>
            {hasPagination && pageSize && currentPage
              ? `Showing ${filtered.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}–${Math.min(currentPage * pageSize, filtered.length)} of ${filtered.length} member${filtered.length !== 1 ? 's' : ''}`
              : `Showing ${filtered.length} of ${members.length} member${members.length !== 1 ? 's' : ''}`
            }
          </span>
        </div>

        {hasPagination && onPageChange && currentPage && totalPages && (
          <div className="page-nav">
            <button className="page-btn" onClick={() => onPageChange(1)} disabled={currentPage === 1} title="First page">
              <i className="fa-solid fa-angles-left" />
            </button>
            <button className="page-btn" onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1} title="Previous page">
              <i className="fa-solid fa-angle-left" />
            </button>
            <span className="page-indicator">{currentPage} / {totalPages}</span>
            <button className="page-btn" onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages} title="Next page">
              <i className="fa-solid fa-angle-right" />
            </button>
            <button className="page-btn" onClick={() => onPageChange(totalPages)} disabled={currentPage === totalPages} title="Last page">
              <i className="fa-solid fa-angles-right" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}