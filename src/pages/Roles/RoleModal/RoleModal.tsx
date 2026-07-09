import { useEffect } from 'react';
import type { UserRole, RoleFormState, RoleLevel } from '../useRoles';

const ROLE_LEVELS: RoleLevel[] = ['Admin', 'Moderator', 'Member', 'Viewer'];

const ROLE_DESCRIPTIONS: Record<RoleLevel, string> = {
  Admin:     'Full access — manage users, settings, and all content.',
  Moderator: 'Can manage content and moderate users.',
  Member:    'Standard access to features and content.',
  Viewer:    'Read-only access, no edit permissions.',
};

function avatarFallback(displayName: string) {
  const parts = displayName.trim().split(' ');
  return parts.length >= 2
    ? (parts[0][0] || '') + (parts[parts.length - 1][0] || '')
    : (displayName.slice(0, 2) || '??').toUpperCase();
}

interface Props {
  isOpen: boolean;
  editingUser: UserRole | null;
  form: RoleFormState;
  formError: string;
  currentUser: string;
  onClose: () => void;
  onFormChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  onSubmit: () => void;
}

export default function RoleModal({
  isOpen, editingUser, form, formError, currentUser,
  onClose, onFormChange, onSubmit,
}: Props) {
  const isEdit = !!editingUser?.role;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  function handleOverlayClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) onClose();
  }

  return (
    <div
      className={`modal-overlay${isOpen ? ' open' : ''}`}
      onClick={handleOverlayClick}
    >
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-heading">

        {/* Header */}
        <div className="modal-header">
          <div className="modal-title">
            <div className="modal-icon">
              <i className={`fa-solid ${isEdit ? 'fa-user-pen' : 'fa-user-shield'}`} aria-hidden="true" />
            </div>
            <h2 id="modal-heading">{isEdit ? 'Edit Role' : 'Assign Role'}</h2>
          </div>
          <button className="btn-close" onClick={onClose} aria-label="Close">
            <i className="fa-solid fa-xmark" aria-hidden="true" />
          </button>
        </div>

        {/* Error */}
        {formError && (
          <div className="modal-error">
            <i className="fa-solid fa-circle-exclamation" aria-hidden="true" />
            {formError}
          </div>
        )}

        {/* User preview */}
        {editingUser && (
          <>
            <p className="section-label">User</p>
            <div className="modal-user-preview">
              {editingUser.photoURL ? (
                <img
                  src={editingUser.photoURL}
                  alt={editingUser.displayName}
                  className="avatar-photo"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="avatar">{avatarFallback(editingUser.displayName || editingUser.email)}</div>
              )}
              <div className="user-info">
                <span className="member-name">{editingUser.displayName || '—'}</span>
                <span className="user-email">{editingUser.email}</span>
              </div>
            </div>
          </>
        )}

        {/* Role selection */}
        <p className="section-label">Role</p>
        <div className="field">
          <label htmlFor="role">Role Level <span className="req">*</span></label>
          <div className="input-wrap select-wrap">
            <i className="fa-solid fa-shield-halved icon" aria-hidden="true" />
            <select id="role" value={form.role} onChange={onFormChange}>
              {ROLE_LEVELS.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
          <p className="role-hint">{ROLE_DESCRIPTIONS[form.role]}</p>
        </div>

        {/* Meta */}
        {/* <p className="section-label">Meta</p> */}
        <div className="field">
          <label>{isEdit ? 'Modified By' : 'Assigned By'}</label>
          <div className="input-wrap" style={{ opacity: 0.7 }}>
            <i className="fa-solid fa-user-shield icon" aria-hidden="true" />
            <input
              type="text"
              value={currentUser}
              readOnly
              style={{ cursor: 'default', backgroundColor: 'var(--input-disabled-bg, #f5f5f5)' }}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="modal-actions">
          <button className="btn-secondary" onClick={onClose}>
            <i className="fa-solid fa-xmark" aria-hidden="true" /> Cancel
          </button>
          <button className="btn-primary" onClick={onSubmit}>
            <i className={`fa-solid ${isEdit ? 'fa-floppy-disk' : 'fa-user-shield'}`} aria-hidden="true" />
            {isEdit ? 'Save Changes' : 'Assign Role'}
          </button>
        </div>

      </div>
    </div>
  );
}