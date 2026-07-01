import { useState, useEffect } from 'react';
import type { Department, DepartmentFormState } from '../useDepartments';
import type { UserRole } from '../useRoles';

interface Props {
  isOpen: boolean;
  view: 'list' | 'form';
  departments: Department[];
  totalCount: number;
  loading: boolean;
  search: string;
  onSearchChange: (val: string) => void;
  editingDepartment: Department | null;
  form: DepartmentFormState;
  formError: string;
  pendingDelete: Department | null;
  userRoles: UserRole[];
  userSearch: string;
  onUserSearchChange: (val: string) => void;
  assignedUserCount: (departmentId: string) => number;
  getAssignment: (user: UserRole, departmentId: string) => { departmentId: string; position: string } | undefined;
  onClose: () => void;
  onCreateNew: () => void;
  onEdit: (department: Department) => void;
  onBackToList: () => void;
  onFormChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onSave: () => void;
  onRequestDelete: (department: Department) => void;
  onCancelDelete: () => void;
  onConfirmDelete: () => void;
  onToggleUserAssignment: (department: Department, user: UserRole) => void;
  onUpdateUserPosition: (department: Department, user: UserRole, position: string) => void;
}

function avatarFallback(name: string) {
  const parts = name.trim().split(' ');
  return parts.length >= 2
    ? (parts[0][0] || '') + (parts[parts.length - 1][0] || '')
    : (name.slice(0, 2) || '??').toUpperCase();
}

export default function DepartmentsModal({
  isOpen, view, departments, totalCount, loading, search, onSearchChange,
  editingDepartment, form, formError, pendingDelete,
  userRoles, userSearch, onUserSearchChange, assignedUserCount, getAssignment,
  onClose, onCreateNew, onEdit, onBackToList, onFormChange, onSave,
  onRequestDelete, onCancelDelete, onConfirmDelete, onToggleUserAssignment, onUpdateUserPosition,
}: Props) {
  const isEdit = !!editingDepartment;
  const [editingPositionFor, setEditingPositionFor] = useState<string | null>(null);

  // Reset the inline position editor whenever the department (or the
  // modal's open/closed state) changes, so we don't carry a stale
  // "editing" target over to a different department/user.
  useEffect(() => {
    setEditingPositionFor(null);
  }, [editingDepartment?.id, isOpen]);

  function handleOverlayClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) onClose();
  }

  const visibleUsers = userRoles.filter((u) => {
    const str = `${u.displayName} ${u.email}`.toLowerCase();
    return str.includes(userSearch.toLowerCase());
  });

  return (
    <div className={`modal-overlay${isOpen ? ' open' : ''}`} onClick={handleOverlayClick}>
      <div className="modal modal-wide" role="dialog" aria-modal="true" aria-labelledby="dept-modal-heading">

        {/* Header */}
        <div className="modal-header">
          <div className="modal-title">
            <div className="modal-icon">
              <i
                className={`fa-solid ${view === 'form' ? (isEdit ? 'fa-pen' : 'fa-plus') : 'fa-sitemap'}`}
                aria-hidden="true"
              />
            </div>
            <h2 id="dept-modal-heading">
              {view === 'list' ? 'Manage Departments' : isEdit ? 'Edit Department' : 'New Department'}
            </h2>
          </div>
          <button className="btn-close" onClick={onClose} aria-label="Close">
            <i className="fa-solid fa-xmark" aria-hidden="true" />
          </button>
        </div>

        {view === 'list' ? (
          <>
            <div className="search-wrap dept-search">
              <i className="fa-solid fa-magnifying-glass" aria-hidden="true" />
              <input
                type="text"
                placeholder="Search departments…"
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
              />
            </div>

            <div className="dept-list">
              {loading ? (
                <div className="empty-state"><p>Loading departments…</p></div>
              ) : departments.length === 0 ? (
                <div className="empty-state">
                  <i className="fa-regular fa-folder-open" aria-hidden="true" />
                  <p>{totalCount === 0 ? 'No departments yet.' : 'No departments match your search.'}</p>
                </div>
              ) : (
                <ul className="dept-rows">
                  {departments.map((d) => {
                    const count = assignedUserCount(d.id);
                    return (
                      <li key={d.id} className="dept-row">
                        <div className="dept-row-main">
                          <span className="dept-row-name">{d.name}</span>
                          {d.position && <span className="dept-row-position">{d.position}</span>}
                          <span className={d.isActive ? 'status-badge status-active' : 'status-badge status-inactive'}>
                            {d.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        <div className="dept-row-meta">
                          {count > 0 && (
                            <span className="dept-row-count">
                              <i className="fa-solid fa-users" aria-hidden="true" /> {count}
                            </span>
                          )}
                          <button type="button" className="btn-icon" title={`Edit ${d.name}`} onClick={() => onEdit(d)}>
                            <i className="fa-solid fa-pen" aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            className="btn-icon danger"
                            title={`Delete ${d.name}`}
                            onClick={() => onRequestDelete(d)}
                          >
                            <i className="fa-solid fa-trash" aria-hidden="true" />
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div className="modal-actions">
              <button type="button" className="btn-secondary" onClick={onCreateNew}>
                <i className="fa-solid fa-plus" aria-hidden="true" /> New Department
              </button>
              <button type="button" className="btn-primary" onClick={onClose}>
                Done
              </button>
            </div>
          </>
        ) : (
          <>
            {formError && (
              <div className="modal-error">
                <i className="fa-solid fa-circle-exclamation" aria-hidden="true" />
                {formError}
              </div>
            )}

            <p className="section-label">Details</p>
            <div className="field">
              <label htmlFor="name">Department Name <span className="req">*</span></label>
              <div className="input-wrap">
                <i className="fa-solid fa-sitemap icon" aria-hidden="true" />
                <input
                  id="name"
                  type="text"
                  placeholder="e.g. Worship Ministry"
                  value={form.name}
                  onChange={onFormChange}
                  autoFocus
                />
              </div>
            </div>

            <div className="field">
              <label htmlFor="position">Default Position</label>
              <div className="input-wrap">
                <i className="fa-solid fa-id-badge icon" aria-hidden="true" />
                <input
                  id="position"
                  type="text"
                  placeholder="e.g. Department Head"
                  value={form.position}
                  onChange={onFormChange}
                />
              </div>
              <p className="role-hint">Used as the starting position when a user is newly assigned — editable per person below.</p>
            </div>

            <div className="field">
              <label htmlFor="description">Description</label>
              <textarea
                id="description"
                className="dept-textarea"
                placeholder="What does this department do?"
                value={form.description}
                onChange={onFormChange}
                rows={3}
              />
            </div>

            <div className="field">
              <label htmlFor="isActive" className="dept-toggle-label">
                <input
                  id="isActive"
                  type="checkbox"
                  checked={form.isActive}
                  onChange={onFormChange}
                />
                <span>Active department</span>
              </label>
            </div>

            {isEdit && editingDepartment && (
              <>
                <p className="section-label">
                  Assigned Users ({assignedUserCount(editingDepartment.id)})
                </p>
                <p className="role-hint" style={{ marginTop: -6, marginBottom: 10 }}>
                  A person can belong to more than one department — check them here and give
                  them a position specific to <strong>{editingDepartment.name}</strong>.
                </p>
                <div className="search-wrap dept-search">
                  <i className="fa-solid fa-magnifying-glass" aria-hidden="true" />
                  <input
                    type="text"
                    placeholder="Search users to assign…"
                    value={userSearch}
                    onChange={(e) => onUserSearchChange(e.target.value)}
                  />
                </div>
                <div className="dept-user-checklist">
                  {visibleUsers.length === 0 ? (
                    <p className="dept-checklist-empty">No users found.</p>
                  ) : (
                    visibleUsers.map((u) => {
                      const assignment = getAssignment(u, editingDepartment.id);
                      const checked = !!assignment;
                      return (
                        <div key={u.id} className="dept-user-row">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => onToggleUserAssignment(editingDepartment, u)}
                          />
                          {u.photoURL ? (
                            <img
                              src={u.photoURL}
                              alt={u.displayName}
                              className="avatar-photo dept-user-avatar"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="avatar dept-user-avatar">
                              {avatarFallback(u.displayName || u.email)}
                            </div>
                          )}
                          <span className="dept-user-info">
                            <span className="member-name">{u.displayName || '—'}</span>
                            <span className="user-email">{u.email}</span>
                          </span>
                          {checked && (
                            editingPositionFor === u.id ? (
                              <input
                                type="text"
                                className="dept-user-position-input"
                                placeholder="Position (e.g. Treasurer)"
                                value={assignment?.position || ''}
                                onChange={(e) => onUpdateUserPosition(editingDepartment, u, e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                                onBlur={() => setEditingPositionFor(null)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' || e.key === 'Escape') {
                                    (e.target as HTMLInputElement).blur();
                                  }
                                }}
                                autoFocus
                              />
                            ) : (
                              <button
                                type="button"
                                className="dept-user-position-display"
                                title="Click to edit position"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingPositionFor(u.id);
                                }}
                              >
                                <span>{assignment?.position || editingDepartment.position || '—'}</span>
                                <i className="fa-solid fa-pen" aria-hidden="true" />
                              </button>
                            )
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </>
            )}

            <div className="modal-actions">
              <button type="button" className="btn-secondary" onClick={onBackToList}>
                <i className="fa-solid fa-arrow-left" aria-hidden="true" /> Back
              </button>
              <button type="button" className="btn-primary" onClick={onSave}>
                <i className="fa-solid fa-floppy-disk" aria-hidden="true" />
                {isEdit ? 'Save Changes' : 'Create Department'}
              </button>
            </div>
          </>
        )}

        {pendingDelete && (
          <div className="confirm-overlay" onClick={onCancelDelete}>
            <div className="confirm-box" onClick={(e) => e.stopPropagation()}>
              <p className="confirm-text">
                Delete <strong>{pendingDelete.name}</strong>?
                {assignedUserCount(pendingDelete.id) > 0 && (
                  <>
                    {' '}
                    {assignedUserCount(pendingDelete.id)}{' '}
                    user{assignedUserCount(pendingDelete.id) === 1 ? '' : 's'} assigned to this department will
                    lose this assignment (their other departments are unaffected).
                  </>
                )}
              </p>
              <div className="confirm-actions">
                <button type="button" className="btn-secondary" onClick={onCancelDelete}>
                  Cancel
                </button>
                <button type="button" className="btn-primary confirm-danger" onClick={onConfirmDelete}>
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}