import React, { useState } from 'react';

interface Member {
  id: string;
  fullName: string;
  isVisitor: boolean;
}

interface ManageVisitorsModalProps {
  isOpen: boolean;
  onClose: () => void;
  members: Member[];
  onToggleVisitor: (id: string, isVisitor: boolean) => void;
}

export default function ManageVisitorsModal({
  isOpen,
  onClose,
  members,
  onToggleVisitor,
}: ManageVisitorsModalProps) {
  const [search, setSearch] = useState('');

  if (!isOpen) return null;

  const filtered = members.filter((m) =>
    m.fullName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="modal-overlay open" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        {/* Header */}
        <div className="modal-header" style={{ padding: '16px 24px' }}>
          <div>
            <h2>Manage Visitors</h2>
            <p>Toggle members who can be assigned as visitors.</p>
          </div>
          <button className="btn-close" onClick={onClose}>
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        {/* Search */}
        <div style={{ padding: '12px 24px', borderBottom: '1px solid #e2e2e2' }}>
          <input
            type="text"
            placeholder="Search member..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              height: '36px',
              padding: '0 12px',
              border: '1px solid #d0d0d0',
              borderRadius: '6px',
              fontSize: '13px',
            }}
          />
        </div>

        {/* Member List */}
        <div style={{ padding: '8px 24px', maxHeight: '380px', overflowY: 'auto' }}>
          {filtered.length === 0 && (
            <p style={{ textAlign: 'center', padding: '24px', color: '#6b6b6b' }}>
              No members found.
            </p>
          )}
          {filtered.map((member) => (
            <div
              key={member.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 0',
                borderBottom: '1px solid #f0f0f0',
              }}
            >
              <span style={{ fontSize: '14px', color: '#1a1a1a' }}>{member.fullName}</span>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={member.isVisitor}
                  onChange={(e) => onToggleVisitor(member.id, e.target.checked)}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button className="btn-save" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}