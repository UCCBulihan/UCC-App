import type { UserRole } from '../useRoles';
import type { Department } from '../useDepartments';

interface Props {
  userRoles: UserRole[];
  filtered: UserRole[];
  loading: boolean;
  onRemoveRole: (id: string) => void;
  onEdit: (userRole: UserRole) => void;
  canEditUser: (user: UserRole) => boolean;
  canRemoveUser: (user: UserRole) => boolean;
  departmentById: Map<string, Department>;
}

function roleBadgeClass(role: string) {
  switch (role) {
    case 'Admin':     return 'role-badge role-admin';
    case 'Moderator': return 'role-badge role-moderator';
    case 'Member':    return 'role-badge role-member';
    case 'Viewer':    return 'role-badge role-viewer';
    default:          return 'role-badge role-unassigned';
  }
}

function roleIcon(role: string) {
  switch (role) {
    case 'Admin':     return 'fa-solid fa-crown';
    case 'Moderator': return 'fa-solid fa-shield-halved';
    case 'Member':    return 'fa-solid fa-user';
    case 'Viewer':    return 'fa-regular fa-eye';
    default:          return 'fa-solid fa-circle-minus';
  }
}

function avatarFallback(name: string) {
  const parts = name.trim().split(' ');
  return parts.length >= 2
    ? (parts[0][0] || '') + (parts[parts.length - 1][0] || '')
    : (name.slice(0, 2) || '??').toUpperCase();
}

export default function RolesTable({
  userRoles, filtered, loading, onRemoveRole, onEdit, canEditUser, canRemoveUser, departmentById,
}: Props) {
  return (
    <div className="members-card">
      <div className="table-scroll">
        <table className="members-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Provider</th>
              <th>Role</th>
              <th>Assigned By</th>
              <th>Date Assigned</th>
              <th>Departments</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="empty-cell">
                  <div className="empty-state"><p>Loading users…</p></div>
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="empty-cell">
                  <div className="empty-state">
                    <i className="fa-regular fa-id-badge" aria-hidden="true" />
                    <p>No users found.</p>
                  </div>
                </td>
              </tr>
            ) : (
              filtered.map((u) => {
                const assignments = u.departments || [];
                return (
                <tr key={u.id}>

                  {/* User */}
                  <td>
                    <div className="member-cell">
                      {u.photoURL ? (
                        <img src={u.photoURL} alt={u.displayName}
                          className="avatar-photo" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="avatar">
                          {avatarFallback(u.displayName || u.email)}
                        </div>
                      )}
                      <div className="user-info">
                        <span className="member-name">{u.displayName || '—'}</span>
                        <span className="user-email">{u.email}</span>
                      </div>
                    </div>
                  </td>

                  {/* Provider */}
                  <td>
                    {u.provider === 'google' ? (
                      <span className="provider-badge provider-google">
                        <i className="fa-brands fa-google" aria-hidden="true" /> Google
                      </span>
                    ) : (
                      <span className="provider-badge provider-email">
                        <i className="fa-solid fa-envelope" aria-hidden="true" /> Email
                      </span>
                    )}
                  </td>

                  {/* Role */}
                  <td>
                    {canEditUser(u) ? (
                      <button
                        className={`${roleBadgeClass(u.role)} role-badge-btn`}
                        onClick={() => onEdit(u)}
                        title={u.role ? 'Click to change role' : 'Click to assign role'}
                      >
                        <i className={roleIcon(u.role)} aria-hidden="true" />
                        {u.role || 'Unassigned'}
                        <i className="fa-solid fa-pen role-badge-edit-icon" aria-hidden="true" />
                      </button>
                    ) : (
                      <span className={roleBadgeClass(u.role)}>
                        <i className={roleIcon(u.role)} aria-hidden="true" />
                        {u.role || 'Unassigned'}
                      </span>
                    )}
                  </td>

                  {/* Assigned By */}
                  <td>
                    <span className="added-by">
                      {u.assignedBy
                        ? <><i className="fa-regular fa-user" style={{ fontSize: 12 }} aria-hidden="true" />{u.assignedBy}</>
                        : <span style={{ color: '#d1d5db' }}>—</span>}
                    </span>
                  </td>

                  {/* Date */}
                  <td>
                    <span className="date-text">{u.dateAssigned || '—'}</span>
                  </td>

                  {/* Departments (can be multiple, each with its own position) */}
                  <td>
                    {assignments.length > 0 ? (
                      <div className="department-badge-stack">
                        {assignments.map((a) => {
                          const dept = departmentById.get(a.departmentId);
                          if (!dept) return null;
                          return (
                            <span key={a.departmentId} className="department-badge">
                              <i className="fa-solid fa-sitemap" aria-hidden="true" />
                              {dept.name}
                              {a.position && <span className="department-badge-position">· {a.position}</span>}
                            </span>
                          );
                        })}
                      </div>
                    ) : (
                      <span className="department-badge department-badge-none">—</span>
                    )}
                  </td>

                  {/* Actions */}
                  <td>
                    <div className="actions-cell">
                      {canRemoveUser(u) && u.role ? (
                        <button
                          className="btn-icon danger"
                          title="Remove role"
                          onClick={() => onRemoveRole(u.id)}
                        >
                          <i className="fa-solid fa-user-slash" aria-hidden="true" />
                        </button>
                      ) : (
                        <span style={{ color: '#e5e7eb', fontSize: 13 }}>—</span>
                      )}
                    </div>
                  </td>

                </tr>
                )
              })
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