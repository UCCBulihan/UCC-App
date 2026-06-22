import React, { useEffect, useState } from 'react';
import type {
  NewVisitationInput,
  VisitationRecord,
  VisitLocation,
  VisitStatus,
  VisitType,
} from '../visitationTypes/visitationTypes';
import Dropdown from '../dropdown/Dropdown';
import MultiSelectDropdown from '../dropdown/MultiSelectDropdown';

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
  memberVisited: [],
  visitDate: '',
  visitedBy: [],
  location: '',
  visitType: '',
  status: '',
  followUpNeeded: false,
  followUpDate: '',
};

const ERROR_COLOR = '#e24b4a';
const ERROR_BG    = '#fff5f5';

const LOCATION_OPTIONS = ['Home', 'Hospital', 'Church', 'Office', 'Other'];
const VISIT_TYPE_OPTIONS = ['General Visit', 'Pastoral', 'Sick Visit', 'Welcome', 'Follow-up Visit'];
const STATUS_OPTIONS = ['Scheduled', 'Completed', 'Cancelled'];

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

  // A person can't be both a visited member and a visitor on the same record,
  // so each list excludes whatever is already picked in the other.
  const availableVisitors = visitors.filter((v) => !form.memberVisited.includes(v));
  const availableMembers  = members.filter((m) => !form.visitedBy.includes(m));

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
    if (form.memberVisited.length === 0) newErrors.memberVisited = 'At least one member visited is required.';
    if (form.visitedBy.length === 0)     newErrors.visitedBy     = 'At least one visitor is required.';
    if (!form.visitDate)                 newErrors.visitDate     = 'Visit Date is required.';
    if (!form.status)                    newErrors.status        = 'Status is required.';

    const overlap = form.memberVisited.filter((m) => form.visitedBy.includes(m));
    if (overlap.length > 0) {
      newErrors.visitedBy = 'A person cannot be both a visitor and a member visited.';
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

  function updateMemberVisited(values: string[]) {
    setForm((prev) => ({
      ...prev,
      memberVisited: values,
      visitedBy: prev.visitedBy.filter((v) => !values.includes(v)),
    }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next.memberVisited;
      delete next.visitedBy;
      return next;
    });
  }

  function updateVisitedBy(values: string[]) {
    setForm((prev) => ({
      ...prev,
      visitedBy: values,
      memberVisited: prev.memberVisited.filter((m) => !values.includes(m)),
    }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next.visitedBy;
      delete next.memberVisited;
      return next;
    });
  }

  function updateField<K extends keyof NewVisitationInput>(key: K, value: NewVisitationInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[key as string];
      return next;
    });
  }

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
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '14px', marginBottom: '14px' }}>
            <div style={{ minWidth: 0 }}>
              <label style={label}>
                Member(s) Visited <span style={{ color: ERROR_COLOR }}>*</span>
              </label>
              <MultiSelectDropdown
                value={form.memberVisited}
                onChange={updateMemberVisited}
                options={availableMembers}
                placeholder="-- Select Member(s) --"
                hasError={!!errors.memberVisited}
              />
              {errors.memberVisited && <p style={errorText}>{errors.memberVisited}</p>}
            </div>

            <div style={{ minWidth: 0 }}>
              <label style={label}>
                Visited By <span style={{ color: ERROR_COLOR }}>*</span>
              </label>
              <MultiSelectDropdown
                value={form.visitedBy}
                onChange={updateVisitedBy}
                options={availableVisitors}
                placeholder="-- Select Visitor(s) --"
                hasError={!!errors.visitedBy}
              />
              {errors.visitedBy && <p style={errorText}>{errors.visitedBy}</p>}
            </div>
          </div>

          {/* Row 2: Visit Date + Location */}
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '14px', marginBottom: '14px' }}>
            <div>
              <label style={label}>
                Visit Date <span style={{ color: ERROR_COLOR }}>*</span>
              </label>
              <input
                type="date"
                value={form.visitDate}
                onChange={(e) => updateField('visitDate', e.target.value)}
                style={{
                  width: '100%',
                  height: '38px',
                  fontSize: '13px',
                  ...(errors.visitDate ? { borderColor: ERROR_COLOR, background: ERROR_BG } : {}),
                }}
              />
              {errors.visitDate && <p style={errorText}>{errors.visitDate}</p>}
            </div>

            <div>
              <label style={label}>Location</label>
              <Dropdown
                value={form.location}
                onChange={(v) => updateField('location', v as VisitLocation)}
                options={LOCATION_OPTIONS}
                placeholder="-- Select Location --"
              />
            </div>
          </div>

          {/* Row 3: Visit Type + Status */}
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '14px', marginBottom: '20px' }}>
            <div>
              <label style={label}>Visit Type</label>
              <Dropdown
                value={form.visitType}
                onChange={(v) => updateField('visitType', v as VisitType)}
                options={VISIT_TYPE_OPTIONS}
                placeholder="-- Select Type --"
              />
            </div>

            <div>
              <label style={label}>
                Status <span style={{ color: ERROR_COLOR }}>*</span>
              </label>
              <Dropdown
                value={form.status}
                onChange={(v) => updateField('status', v as VisitStatus)}
                options={STATUS_OPTIONS}
                placeholder="-- Select Status --"
                hasError={!!errors.status}
              />
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