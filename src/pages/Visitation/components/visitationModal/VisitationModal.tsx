import React, { useEffect, useState } from 'react';
import type {
  NewVisitationInput,
  VisitationRecord,
  VisitLocation,
  VisitStatus,
  VisitType,
} from '../visitationTypes/visitationTypes';

interface VisitationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (input: NewVisitationInput) => void;
  onUpdate: (id: string, input: NewVisitationInput) => void;
  members: string[];
  visitors: string[];
  editingRecord?: VisitationRecord | null;
}

const emptyForm: NewVisitationInput = {
  memberVisited: '',
  visitDate: '',
  visitedBy: '',
  location: '',
  visitType: '',
  status: '',
  followUpNeeded: false,
  followUpDate: '',
};

const ERROR_COLOR = '#e24b4a';
const ERROR_BG    = '#fff5f5';

export default function VisitationModal({
  isOpen,
  onClose,
  onSave,
  onUpdate,
  members,
  visitors,
  editingRecord,
}: VisitationModalProps) {
  const [form, setForm]     = useState<NewVisitationInput>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const isEditMode = Boolean(editingRecord);

  useEffect(() => {
    if (!isOpen) return;
    setErrors({});
    if (editingRecord) {
      const { id, notes, ...rest } = editingRecord;
      setForm(rest);
    } else {
      setForm(emptyForm);
    }
  }, [isOpen, editingRecord]);

  if (!isOpen) return null;

  const availableVisitors = visitors.filter((v) => v !== form.memberVisited);

  function handleOverlayClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) handleClose();
  }

  function handleClose() {
    setForm(emptyForm);
    setErrors({});
    onClose();
  }

  function validate(): boolean {
    const newErrors: Record<string, string> = {};
    if (!form.memberVisited) newErrors.memberVisited = 'Member Visited is required.';
    if (!form.visitedBy)     newErrors.visitedBy     = 'Visited By is required.';
    if (!form.visitDate)     newErrors.visitDate      = 'Visit Date is required.';
    if (!form.status)        newErrors.status         = 'Status is required.';
    if (form.memberVisited && form.visitedBy && form.memberVisited === form.visitedBy) {
      newErrors.visitedBy = 'Visitor cannot be the same as the member being visited.';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function handleSave() {
    if (!validate()) return;
    if (isEditMode && editingRecord) {
      onUpdate(editingRecord.id, form);
    } else {
      onSave(form);
    }
    setForm(emptyForm);
    setErrors({});
  }

  function updateField<K extends keyof NewVisitationInput>(key: K, value: NewVisitationInput[K]) {
    if (key === 'memberVisited' && value === form.visitedBy) {
      setForm((prev) => ({ ...prev, memberVisited: value as string, visitedBy: '' }));
    } else {
      setForm((prev) => ({ ...prev, [key]: value }));
    }
    setErrors((prev) => {
      const next = { ...prev };
      delete next[key as string];
      if (key === 'memberVisited') delete next.visitedBy;
      return next;
    });
  }

  const fieldBorder = (hasError: boolean): React.CSSProperties =>
    hasError ? { borderColor: ERROR_COLOR, background: ERROR_BG } : {};

  const sectionLabel: React.CSSProperties = {
    fontSize: '11px',
    fontWeight: 500,
    color: '#9ca3af',
    textTransform: 'uppercase',
    letterSpacing: '0.07em',
    marginBottom: '14px',
  };

  const label: React.CSSProperties = {
    fontSize: '13px',
    fontWeight: 500,
    color: '#374151',
    display: 'block',
    marginBottom: '6px',
  };

  const errorText: React.CSSProperties = {
    fontSize: '12px',
    color: ERROR_COLOR,
    marginTop: '4px',
  };

  return (
    <div className="modal-overlay open" onClick={handleOverlayClick}>
      <div className="modal">

        {/* ── Header ── */}
        <div style={{
          padding: '20px 0 20px 0',
          borderBottom: '1px solid #e2e2e2',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: '12px',
        }}>
          <div>
            <h2 style={{ fontSize: '17px', fontWeight: 700, color: '#1a1a1a', margin: 0 }}>
              {isEditMode ? 'Edit Visitation Record' : 'Add Visitation Record'}
            </h2>
            <p style={{ fontSize: '13px', color: '#6b6b6b', margin: '4px 0 0' }}>
              {isEditMode
                ? 'Update the details of this visit below.'
                : 'Fill in the details of the visit below.'}
            </p>
          </div>
          <button className="btn-close" onClick={handleClose} aria-label="Close">
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        {/* ── Body ── */}
        <div>

          <p style={sectionLabel}>Visit Information</p>

          {/* Row 1: Member Visited + Visited By */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
            <div>
              <label style={label}>
                Member Visited <span style={{ color: ERROR_COLOR }}>*</span>
              </label>
              <select
                value={form.memberVisited}
                onChange={(e) => updateField('memberVisited', e.target.value)}
                style={{ width: '100%', height: '38px', fontSize: '13px', ...fieldBorder(!!errors.memberVisited) }}
              >
                <option value="">-- Select Member --</option>
                {members.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
              {errors.memberVisited && <p style={errorText}>{errors.memberVisited}</p>}
            </div>

            <div>
              <label style={label}>
                Visited By <span style={{ color: ERROR_COLOR }}>*</span>
              </label>
              <select
                value={form.visitedBy}
                onChange={(e) => updateField('visitedBy', e.target.value)}
                style={{ width: '100%', height: '38px', fontSize: '13px', ...fieldBorder(!!errors.visitedBy) }}
              >
                <option value="">-- Select Visitor --</option>
                {availableVisitors.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
              {errors.visitedBy && <p style={errorText}>{errors.visitedBy}</p>}
            </div>
          </div>

          {/* Row 2: Visit Date + Location */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
            <div>
              <label style={label}>
                Visit Date <span style={{ color: ERROR_COLOR }}>*</span>
              </label>
              <input
                type="date"
                value={form.visitDate}
                onChange={(e) => updateField('visitDate', e.target.value)}
                style={{ width: '100%', height: '38px', fontSize: '13px', ...fieldBorder(!!errors.visitDate) }}
              />
              {errors.visitDate && <p style={errorText}>{errors.visitDate}</p>}
            </div>

            <div>
              <label style={label}>Location</label>
              <select
                value={form.location}
                onChange={(e) => updateField('location', e.target.value as VisitLocation)}
                style={{ width: '100%', height: '38px', fontSize: '13px' }}
              >
                <option value="">-- Select Location --</option>
                <option>Home</option>
                <option>Hospital</option>
                <option>Church</option>
                <option>Office</option>
                <option>Other</option>
              </select>
            </div>
          </div>

          {/* Row 3: Visit Type + Status */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '20px' }}>
            <div>
              <label style={label}>Visit Type</label>
              <select
                value={form.visitType}
                onChange={(e) => updateField('visitType', e.target.value as VisitType)}
                style={{ width: '100%', height: '38px', fontSize: '13px' }}
              >
                <option value="">-- Select Type --</option>
                <option>General Visit</option>
                <option>Pastoral</option>
                <option>Sick Visit</option>
                <option>Welcome</option>
                <option>Follow-up Visit</option>
              </select>
            </div>

            <div>
              <label style={label}>
                Status <span style={{ color: ERROR_COLOR }}>*</span>
              </label>
              <select
                value={form.status}
                onChange={(e) => updateField('status', e.target.value as VisitStatus)}
                style={{ width: '100%', height: '38px', fontSize: '13px', ...fieldBorder(!!errors.status) }}
              >
                <option value="">-- Select Status --</option>
                <option>Scheduled</option>
                <option>Completed</option>
                <option>Cancelled</option>
              </select>
              {errors.status && <p style={errorText}>{errors.status}</p>}
            </div>
          </div>

          {/* Divider */}
          <div style={{ borderTop: '1px solid #e2e2e2', marginBottom: '20px' }} />

          {/* Follow-up */}
          <p style={sectionLabel}>Follow-up</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={form.followUpNeeded}
                onChange={(e) => updateField('followUpNeeded', e.target.checked)}
              />
              <span className="toggle-slider"></span>
            </label>
            <span style={{ fontSize: '13px', color: '#374151' }}>Follow-up needed</span>
          </div>

          {form.followUpNeeded && (
            <div style={{ marginTop: '14px', maxWidth: '50%' }}>
              <label style={label}>Follow-up Date</label>
              <input
                type="date"
                value={form.followUpDate}
                onChange={(e) => updateField('followUpDate', e.target.value)}
                style={{ width: '100%', height: '38px', fontSize: '13px' }}
              />
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="modal-footer">
          <button className="btn-cancel" onClick={handleClose}>Cancel</button>
          <button className="btn-save" onClick={handleSave}>
            {isEditMode ? 'Update Record' : 'Save Record'}
          </button>
        </div>
      </div>
    </div>
  );
}