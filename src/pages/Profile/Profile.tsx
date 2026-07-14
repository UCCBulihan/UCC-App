import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase/firebase';
import NavigationBar from '../Home/NavigationBar/NavigationBar';
import { useMembersStore } from '../Members/useMembersStore';
import type { Member } from '../Members/useMembersStore';

function initials(firstName: string, lastName: string) {
  return (firstName?.[0] || '') + (lastName?.[0] || '');
}

function computeAge(dateOfBirth?: string) {
  if (!dateOfBirth) return '';
  const dob = new Date(dateOfBirth);
  if (isNaN(dob.getTime())) return '';
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
  return age >= 0 ? age : '';
}

type FormState = Omit<Member, 'id' | 'userId' | 'isPledger' | 'addedBy' | 'dateAdded' | 'isArchived'>;

const emptyForm: FormState = {
  firstName: '', middleName: '', lastName: '',
  nickname: '', gender: '', dateOfBirth: '', civilStatus: '',
  motherName: '', fatherName: '',
  numberOfSiblings: '', siblingNames: '',
  phoneNumber: '', emailAddress: '', address: '',
  emergencyContactName: '', emergencyContactNumber: '',
  dateRegistered: '', membershipStatus: '', ministry: '', remarks: '',
};

export default function Profile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { members, loading, fetchIfNeeded, updateMember } = useMembersStore();

  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { fetchIfNeeded(); }, [fetchIfNeeded]);

  const member = members.find(m => m.id === id);

  // Sync form once member data is available
  useEffect(() => {
    if (member) {
      setForm({
        firstName: member.firstName || '',
        middleName: member.middleName || '',
        lastName: member.lastName || '',
        nickname: member.nickname || '',
        gender: member.gender || '',
        dateOfBirth: member.dateOfBirth || '',
        civilStatus: member.civilStatus || '',
        motherName: member.motherName || '',
        fatherName: member.fatherName || '',
        numberOfSiblings: member.numberOfSiblings ?? '',
        siblingNames: member.siblingNames || '',
        phoneNumber: member.phoneNumber || '',
        emailAddress: member.emailAddress || '',
        address: member.address || '',
        emergencyContactName: member.emergencyContactName || '',
        emergencyContactNumber: member.emergencyContactNumber || '',
        dateRegistered: member.dateRegistered || '',
        membershipStatus: member.membershipStatus || '',
        ministry: member.ministry || '',
        remarks: member.remarks || '',
      });
    }
  }, [member?.id]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const { id: fieldId, value } = e.target;
    setForm(prev => ({ ...prev, [fieldId]: value }));
    setSaved(false);
  }

  async function handleSave() {
    if (!id) return;
    if (!form.firstName.trim() || !form.lastName.trim()) {
      setError('First Name and Last Name are required.');
      return;
    }
    setError('');
    setSaving(true);
    try {
      const changes = {
        ...form,
        firstName: form.firstName.trim(),
        middleName: form.middleName.trim(),
        lastName: form.lastName.trim(),
      };
      await updateDoc(doc(db, 'MEMBERS', id), changes);
      updateMember(id, changes);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err: any) {
      console.error('Save error:', err?.message);
      setError('Failed to save changes. Try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="app-layout">
      <NavigationBar />
      <main className="main-content">
        <div className="profile-page">

          <button className="btn-back" onClick={() => navigate(-1)}>
            <i className="fa-solid fa-arrow-left" aria-hidden="true" />
            Back
          </button>

          {loading ? (
            <p>Loading profile…</p>
          ) : !member ? (
            <div className="profile-empty">
              <i className="fa-regular fa-circle-question" aria-hidden="true" />
              <p>Member not found.</p>
            </div>
          ) : (
            <div className="profile-card">

              <div className="profile-header">
                <div className="profile-avatar">
                  {initials(form.firstName, form.lastName)}
                </div>
                <div>
                  <h1>
                    {form.firstName}{form.middleName ? ` ${form.middleName}` : ''} {form.lastName}
                  </h1>
                </div>
              </div>

              {error && (
                <div className="modal-error">
                  <i className="fa-solid fa-circle-exclamation" aria-hidden="true" />
                  {error}
                </div>
              )}

              {/* ── Basic Information ── */}
              <p className="section-label">Basic Information</p>
              <div className="row-2">
                <div className="field">
                  <label htmlFor="firstName">First Name <span className="req">*</span></label>
                  <div className="input-wrap">
                    <input type="text" id="firstName" value={form.firstName} onChange={handleChange} />
                  </div>
                </div>
                <div className="field">
                  <label htmlFor="middleName">Middle Name</label>
                  <div className="input-wrap">
                    <input type="text" id="middleName" value={form.middleName} onChange={handleChange} />
                  </div>
                </div>
              </div>
              <div className="row-2">
                <div className="field">
                  <label htmlFor="lastName">Last Name <span className="req">*</span></label>
                  <div className="input-wrap">
                    <input type="text" id="lastName" value={form.lastName} onChange={handleChange} />
                  </div>
                </div>
                <div className="field">
                  <label htmlFor="nickname">Nickname (Optional)</label>
                  <div className="input-wrap">
                    <input type="text" id="nickname" value={form.nickname} onChange={handleChange} />
                  </div>
                </div>
              </div>
              <div className="row-2">
                <div className="field">
                  <label htmlFor="gender">Gender / Sex</label>
                  <div className="input-wrap">
                    <select id="gender" value={form.gender} onChange={handleChange}>
                      <option value="">Select…</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </div>
                </div>
                <div className="field">
                  <label htmlFor="civilStatus">Civil Status</label>
                  <div className="input-wrap">
                    <select id="civilStatus" value={form.civilStatus} onChange={handleChange}>
                      <option value="">Select…</option>
                      <option value="Single">Single</option>
                      <option value="Married">Married</option>
                      <option value="Widowed">Widowed</option>
                      <option value="Separated">Separated</option>
                      <option value="Divorced">Divorced</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="row-2">
                <div className="field">
                  <label htmlFor="dateOfBirth">Date of Birth</label>
                  <div className="input-wrap">
                    <input type="date" id="dateOfBirth" value={form.dateOfBirth} onChange={handleChange} />
                  </div>
                </div>
                <div className="field">
                  <label htmlFor="age">Age</label>
                  <div className="input-wrap" style={{ opacity: 0.7 }}>
                    <input
                      type="text" id="age"
                      value={computeAge(form.dateOfBirth)}
                      readOnly
                      placeholder="Auto-computed"
                      style={{ cursor: 'default', backgroundColor: 'var(--input-disabled-bg, #f5f5f5)' }}
                    />
                  </div>
                </div>
              </div>
              <div className="row-2">
                <div className="field">
                  <label htmlFor="motherName">Mother's Name (Optional)</label>
                  <div className="input-wrap">
                    <input type="text" id="motherName" value={form.motherName} onChange={handleChange} />
                  </div>
                </div>
                <div className="field">
                  <label htmlFor="fatherName">Father's Name (Optional)</label>
                  <div className="input-wrap">
                    <input type="text" id="fatherName" value={form.fatherName} onChange={handleChange} />
                  </div>
                </div>
              </div>

              {/* ── Family Information ── */}
              <p className="section-label">Family Information</p>
              <div className="row-2">
                <div className="field">
                  <label htmlFor="numberOfSiblings">Number of Siblings (Optional)</label>
                  <div className="input-wrap">
                    <input type="number" min="0" id="numberOfSiblings" value={form.numberOfSiblings} onChange={handleChange} />
                  </div>
                </div>
                <div className="field">
                  <label htmlFor="siblingNames">Sibling Name(s) (Optional)</label>
                  <div className="input-wrap">
                    <input type="text" id="siblingNames" placeholder="Separate with commas" value={form.siblingNames} onChange={handleChange} />
                  </div>
                </div>
              </div>

              {/* ── Contact Information ── */}
              <p className="section-label">Contact Information</p>
              <div className="row-2">
                <div className="field">
                  <label htmlFor="phoneNumber">Phone Number</label>
                  <div className="input-wrap">
                    <input type="tel" id="phoneNumber" value={form.phoneNumber} onChange={handleChange} />
                  </div>
                </div>
                <div className="field">
                  <label htmlFor="emailAddress">Email Address (Optional)</label>
                  <div className="input-wrap">
                    <input type="email" id="emailAddress" value={form.emailAddress} onChange={handleChange} />
                  </div>
                </div>
              </div>
              <div className="field">
                <label htmlFor="address">Complete Address</label>
                <div className="input-wrap">
                  <input type="text" id="address" value={form.address} onChange={handleChange} />
                </div>
              </div>
              <div className="row-2">
                <div className="field">
                  <label htmlFor="emergencyContactName">Emergency Contact Person</label>
                  <div className="input-wrap">
                    <input type="text" id="emergencyContactName" value={form.emergencyContactName} onChange={handleChange} />
                  </div>
                </div>
                <div className="field">
                  <label htmlFor="emergencyContactNumber">Emergency Contact Number</label>
                  <div className="input-wrap">
                    <input type="tel" id="emergencyContactNumber" value={form.emergencyContactNumber} onChange={handleChange} />
                  </div>
                </div>
              </div>

              {/* ── Church Information ── */}
              <p className="section-label">Church Information</p>
              <div className="row-2">
                <div className="field">
                  <label htmlFor="dateRegistered">Date Registered</label>
                  <div className="input-wrap">
                    <input type="date" id="dateRegistered" value={form.dateRegistered} onChange={handleChange} />
                  </div>
                </div>
                <div className="field">
                  <label htmlFor="membershipStatus">Membership Status</label>
                  <div className="input-wrap">
                    <select id="membershipStatus" value={form.membershipStatus} onChange={handleChange}>
                      <option value="">Select…</option>
                      <option value="Visitor">Visitor</option>
                      <option value="Regular Attendee">Regular Attendee</option>
                      <option value="Member">Member</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="field">
                <label htmlFor="ministry">Ministry / Department (Optional)</label>
                <div className="input-wrap">
                  <input type="text" id="ministry" value={form.ministry} onChange={handleChange} />
                </div>
              </div>
              <div className="field">
                <label htmlFor="remarks">Remarks (Optional)</label>
                <div className="input-wrap">
                  <textarea id="remarks" rows={3} value={form.remarks} onChange={handleChange} />
                </div>
              </div>

              <div className="modal-actions">
                <button className="btn-primary" onClick={handleSave} disabled={saving}>
                  <i className={`fa-solid ${saving ? 'fa-spinner fa-spin' : 'fa-floppy-disk'}`} aria-hidden="true" />
                  {saving ? 'Saving…' : saved ? 'Saved!' : 'Save Changes'}
                </button>
              </div>

            </div>
          )}

        </div>
      </main>
    </div>
  );
}