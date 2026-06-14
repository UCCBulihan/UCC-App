import type { UserRole, RoleLevel } from '../useRoles';

interface Props {
  userRoles: UserRole[];
  filtered: UserRole[];
  loading: boolean;
  onChangeRole: (id: string, newRole: RoleLevel) => void;
  onRevoke: (id: string) => void;
  onEdit: (userRole: UserRole) => void;
}

const ROLE_LEVELS: RoleLevel[] = ['Admin', 'Moderator', 'Member', 'Viewer'];

function roleBadgeClass(role: RoleLevel) {
  switch (role) {
    case 'Admin':     return 'role-badge role-admin';
    case 'Moderator': return 'role-badge role-moderator';
    case 'Member':    return 'role-badge role-member';
    case 'Viewer':    return 'role-badge role-viewer';
    default:          return 'role-badge';
  }
}

function roleIcon(role: RoleLevel) {
  switch (role) {
    case 'Admin':     return 'fa-solid fa-crown';
    case 'Moderator': return 'fa-solid fa-shield-halved';
    case 'Member':    return 'fa-solid fa-user';
    case 'Viewer':    return 'fa-regular fa-eye';
    default:          return 'fa-solid fa-user';
  }
}

function avatarFallback(displayName: string) {
  const parts = displayName.trim().split(' ');
  return parts.length >= 2
    ? (parts[0][0] || '') + (parts[parts.length - 1][0] || '')
    : displayName.slice(0, 2).toUpperCase();
}

export default function RolesTable({
  userRoles, filtered, loading,
  onChangeRole, onRevoke, onEdit,
}: Props) {
  return (
    <div className="members-card">
      <div className="table-scroll">
        <table className="members-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Role</th>
              <th>Assigned By</th>
              <th>Date Assigned</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="empty-cell">
                  <div className="empty-state"><p>Loading roles…</p></div>
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="empty-cell">
                  <div className="empty-state">
                    <i className="fa-regular fa-id-badge" aria-hidden="true" />
                    <p>No users found.</p>
                  </div>
                </td>
              </tr>
            ) : (
              filtered.map((u) => (
                <tr key={u.id}>
                  {/* User cell */}
                  <td>
                    <div className="member-cell">
                      {u.photoURL ? (
                        <img
                          src={u.photoURL}
                          alt={u.displayName}
                          className="avatar-photo"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="avatar">{avatarFallback(u.displayName)}</div>
                      )}
                      <div className="user-info">
                        <span className="member-name">{u.displayName}</span>
                        <span className="user-email">{u.email}</span>
                      </div>
                    </div>
                  </td>

                  {/* Role badge + quick-change */}
                  <td>
                    <div className="role-cell">
                      <span className={roleBadgeClass(u.role)}>
                        <i className={roleIcon(u.role)} aria-hidden="true" />
                        {u.role}
                      </span>
                      <div className="role-quick-change">
                        {ROLE_LEVELS.filter(r => r !== u.role).map(r => (
                          <button
                            key={r}
                            className="role-quick-btn"
                            title={`Change to ${r}`}
                            onClick={() => onChangeRole(u.id, r)}
                          >
                            {r}
                          </button>
                        ))}
                      </div>
                    </div>
                  </td>

                  {/* Assigned By */}
                  <td>
                    <span className="added-by">
                      <i className="fa-regular fa-user" style={{ fontSize: 12 }} aria-hidden="true" />
                      {u.assignedBy}
                    </span>
                  </td>

                  {/* Date */}
                  <td><span className="date-text">{u.dateAssigned}</span></td>

                  {/* Actions */}
                  <td>
                    <div className="actions-cell">
                      <button className="btn-icon" title="Edit" onClick={() => onEdit(u)}>
                        <i className="fa-regular fa-pen-to-square" aria-hidden="true" />
                      </button>
                      <button
                        className="btn-icon danger"
                        title="Revoke role"
                        onClick={() => onRevoke(u.id)}
                      >
                        <i className="fa-solid fa-user-slash" aria-hidden="true" />
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
        <span>
          Showing {filtered.length} of {userRoles.length} user{userRoles.length !== 1 ? 's' : ''}
        </span>
      </div>
    </div>
  );
}