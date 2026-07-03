import './logout-modal.css'

interface LogoutModalProps {
  isOpen: boolean;
  loading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function LogoutModal({ isOpen, loading, onConfirm, onCancel }: LogoutModalProps) {
  if (!isOpen) return null;

  return (
    <div className="logout-modal-overlay" onClick={onCancel}>
      <div
        className="logout-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="logout-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="logout-modal-title" className="logout-modal-title">Log out?</h2>
        <p className="logout-modal-text">
          Are you sure you want to log out of your account?
        </p>

        <div className="logout-modal-actions">
          <button
            className="btn-ghost"
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            className="btn-primary logout-modal-confirm"
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? 'Logging out...' : 'Log Out'}
          </button>
        </div>
      </div>
    </div>
  );
}
