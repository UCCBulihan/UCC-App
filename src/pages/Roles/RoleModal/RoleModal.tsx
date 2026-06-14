import { useEffect } from 'react';
import type { RoleFormState, RoleLevel } from '../useRoles';

const ROLE_LEVELS: RoleLevel[] = ['Admin', 'Moderator', 'Member', 'Viewer'];

const ROLE_DESCRIPTIONS: Record<RoleLevel, string> = {
  Admin:     'Full access — manage users, settings, and all content.',
  Moderator: 'Can manage content and moderate users.',
  Member:    'Standard access to features and content.',
  Viewer:    'Read-only access, no edit permissions.',
};

interface Props {
  isOpen: boolean;
  mode: 'add' | 'edit';
  form: RoleFormState;
  formError: string;
  currentUser: string;
  onClose: () => void;
  onFormChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  onSubmit: () => void;
}

export default function RoleModal({
  isOpen, mode, form, formError, currentUser,
  onClose, onFormChange, onSubmit,
}: Props) {
  const isEdit = mode === 'edit';

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
              <i
                className={`fa-solid ${isEdit ? 'fa-user-pen' : 'fa-user-shield'}`}
                aria-hidden="true"
              />
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

        {/* User Info section */}
        <p className="section-label">User Info</p>

        <div className="field">
          <label htmlFor="uid">
            Google UID {!isEdit && <span className="req">*</span>}
          </label>
          <div className="input-wrap">
            <i className="fa-brands fa-google icon" aria-hidden="true" />
            <input
              type="text"
              id="uid"
              placeholder="e.g. abc123xyz"
              value={form.uid}
              onChange={onFormChange}
              readOnly={isEdit}
              style={isEdit ? { cursor: 'default', opacity: 0.7, backgroundColor: 'var(--input-disabled-bg, #f5f5f5)' } : {}}
            />
          </div>
        </div>

        <div className="row-2">
          <div className="field">
            <label htmlFor="displayName">
              Display Name <span className="req">*</span>
            </label>
            <div className="input-wrap">
              <i className="fa-regular fa-id-card icon" aria-hidden="true" />
              <input
                type="text"
                id="displayName"
                placeholder="e.g. Juan Dela Cruz"
                value={form.displayName}
                onChange={onFormChange}
              />
            </div>
          </div>
          <div className="field">
            <label htmlFor="email">
              Email <span className="req">*</span>
            </label>
            <div className="input-wrap">
              <i className="fa-regular fa-envelope icon" aria-hidden="true" />
              <input
                type="email"
                id="email"
                placeholder="e.g. juan@gmail.com"
                value={form.email}
                onChange={onFormChange}
              />
            </div>
          </div>
        </div>

        <div className="field">
          <label htmlFor="photoURL">Photo URL <span className="optional-label">(optional)</span></label>
          <div className="input-wrap">
            <i className="fa-regular fa-image icon" aria-hidden="true" />
            <input
              type="text"
              id="photoURL"
              placeholder="https://..."
              value={form.photoURL}
              onChange={onFormChange}
            />
          </div>
        </div>

        {/* Role section */}
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

        {/* Meta section */}
        <p className="section-label">Meta</p>
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
            <i
              className={`fa-solid ${isEdit ? 'fa-floppy-disk' : 'fa-user-shield'}`}
              aria-hidden="true"
            />
            {isEdit ? 'Save Changes' : 'Assign Role'}
          </button>
        </div>

      </div>
    </div>
  );
}