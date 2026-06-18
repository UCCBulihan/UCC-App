
import { useEffect } from 'react';

interface FormState {
  firstName: string;
  middleName: string;
  lastName: string;
  isPledger: boolean;
}

interface Props {
  isOpen: boolean;
  mode: 'add' | 'edit';          
  form: FormState;
  formError: string;
  currentUser: string;
  onClose: () => void;
  onFormChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSubmit: () => void;
}

export default function MemberModal({
  isOpen, mode, form, formError, currentUser,
  onClose, onFormChange, onSubmit
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

        <div className="modal-header">
          <div className="modal-title">
            <div className="modal-icon">
              <i className={`fa-solid ${isEdit ? 'fa-user-pen' : 'fa-user-plus'}`} aria-hidden="true" />
            </div>
            <h2 id="modal-heading">{isEdit ? 'Edit Member' : 'Add Member'}</h2>
          </div>
          <button className="btn-close" onClick={onClose} aria-label="Close">
            <i className="fa-solid fa-xmark" aria-hidden="true" />
          </button>
        </div>

        {formError && (
          <div className="modal-error">
            <i className="fa-solid fa-circle-exclamation" aria-hidden="true" />
            {formError}
          </div>
        )}

        <p className="section-label">Name</p>
        <div className="row-2">
          <div className="field">
            <label htmlFor="firstName">First Name <span className="req">*</span></label>
            <div className="input-wrap">
              {/* <i className="fa-regular fa-id-card icon" aria-hidden="true" /> */}
              <input type="text" id="firstName" placeholder="e.g. John"
                value={form.firstName} onChange={onFormChange} />
            </div>
          </div>
          <div className="field">
            <label htmlFor="lastName">Last Name <span className="req">*</span></label>
            <div className="input-wrap">
              {/* <i className="fa-regular fa-id-card icon" aria-hidden="true" /> */}
              <input type="text" id="lastName" placeholder="e.g. Smith"
                value={form.lastName} onChange={onFormChange} />
            </div>
          </div>
        </div>
        <div className="field">
          <label htmlFor="middleName">Middle Name</label>
          <div className="input-wrap">
            {/* <i className="fa-regular fa-id-card icon" aria-hidden="true" /> */}
            <input type="text" id="middleName" placeholder="e.g. Joe"
              value={form.middleName} onChange={onFormChange} />
          </div>
        </div>

        <p className="section-label">Meta</p>
        <div className="field">
          <label>{isEdit ? 'Modified By' : 'Added By'}</label>
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

        <label className="toggle-field" htmlFor="isPledger">
          <div className="toggle-label">
            <i className="fa-solid fa-hand-holding-heart" aria-hidden="true" />
            <div>
              <div className="toggle-text">Pledger</div>
              <div className="toggle-desc">Mark this member as a pledger</div>
            </div>
          </div>
          <div className="toggle-switch">
            <input type="checkbox" id="isPledger"
              checked={form.isPledger} onChange={onFormChange} />
            <span className="toggle-slider"></span>
          </div>
        </label>

        <div className="modal-actions">
          <button className="btn-secondary" onClick={onClose}>
            <i className="fa-solid fa-xmark" aria-hidden="true" /> Cancel
          </button>
          <button className="btn-primary" onClick={onSubmit}>
            <i className={`fa-solid ${isEdit ? 'fa-floppy-disk' : 'fa-user-plus'}`} aria-hidden="true" />
            {isEdit ? 'Save Changes' : 'Add Member'}
          </button>
        </div>

      </div>
    </div>
  );
}