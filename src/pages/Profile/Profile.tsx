import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, updateDoc, collection, addDoc } from 'firebase/firestore';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { db } from '../../firebase/firebase';
import NavigationBar from '../Home/NavigationBar/NavigationBar';
import { useMembersStore } from '../Members/useMembersStore';

function initials(firstName: string, lastName: string) {
  return (firstName?.[0] || '') + (lastName?.[0] || '');
}

function fullName(m: { firstName: string; middleName?: string; lastName: string }) {
  return `${m.firstName}${m.middleName ? ` ${m.middleName}` : ''} ${m.lastName}`.trim().replace(/\s+/g, ' ');
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

function formatDate() {
  return new Date().toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

interface FormState {
  firstName: string; middleName: string; lastName: string;
  nickname: string; gender: string; dateOfBirth: string; civilStatus: string;
  motherName: string; fatherName: string;
  numberOfSiblings: string; siblingNames: string;
  phoneNumber: string; emailAddress: string; address: string;
  emergencyContactName: string; emergencyContactNumber: string;
  dateRegistered: string; membershipStatus: string; ministry: string; remarks: string;
}

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
  const { members, loading, fetchIfNeeded, updateMember, addMember: storeAdd } = useMembersStore();

  const isAddMode = id === 'new';

  const [currentUser, setCurrentUser] = useState('');
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // ── Autocomplete state (Mother/Father/Sibling suggestions from members) ──
  const [motherOpen, setMotherOpen] = useState(false);
  const [fatherOpen, setFatherOpen] = useState(false);
  const [siblingOpen, setSiblingOpen] = useState(false);
  const [siblingInput, setSiblingInput] = useState('');

  useEffect(() => { fetchIfNeeded(); }, [fetchIfNeeded]);

  useEffect(() => {
    const auth = getAuth();
    const unsub = onAuthStateChanged(auth, user => {
      setCurrentUser(user?.displayName || user?.email || 'Unknown');
    });
    return () => unsub();
  }, []);

  const member = isAddMode ? undefined : members.find(m => m.id === id);

  // Sync form once existing member data is available (edit mode only)
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
        numberOfSiblings: String(member.numberOfSiblings ?? ''),
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
  }

  // Suggest member names matching a query, excluding self and already-picked names
  function suggestionsFor(query: string, exclude: string[] = []) {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return members
      .filter(m => m.id !== id)
      .map(fullName)
      .filter((name, idx, arr) => name && arr.indexOf(name) === idx)
      .filter(name => name.toLowerCase().includes(q) && !exclude.includes(name))
      .slice(0, 6);
  }

  const siblingList = form.siblingNames
    ? form.siblingNames.split(',').map(s => s.trim()).filter(Boolean)
    : [];

  function addSibling(name: string) {
    if (!name.trim() || siblingList.includes(name.trim())) return;
    setForm(prev => ({ ...prev, siblingNames: [...siblingList, name.trim()].join(', ') }));
    setSiblingInput('');
    setSiblingOpen(false);
  }

  function removeSibling(name: string) {
    setForm(prev => ({ ...prev, siblingNames: siblingList.filter(n => n !== name).join(', ') }));
  }

  async function handleSave() {
    if (!form.firstName.trim() || !form.lastName.trim()) {
      setError('First Name and Last Name are required.');
      return;
    }
    setError('');
    setSaving(true);

    const changes = {
      ...form,
      firstName: form.firstName.trim(),
      middleName: form.middleName.trim(),
      lastName: form.lastName.trim(),
    };

    try {
      if (isAddMode) {
        const nextId = members.length > 0
          ? Math.max(...members.map(m => m.userId)) + 1
          : 1;
        const newMember = {
          ...changes,
          userId: nextId,
          isPledger: false,
          addedBy: currentUser,
          dateAdded: formatDate(),
          isArchived: false,
        };
        const docRef = await addDoc(collection(db, 'MEMBERS'), newMember);
        storeAdd({ id: docRef.id, ...newMember });
      } else {
        if (!id) return;
        await updateDoc(doc(db, 'MEMBERS', id), changes);
        updateMember(id, changes);
      }
      navigate('/AllMembers');
    } catch (err: any) {
      console.error('Save error:', err?.message);
      setError(isAddMode ? 'Failed to add member. Try again.' : 'Failed to save changes. Try again.');
    } finally {
      setSaving(false);
    }
  }

  const notFound = !isAddMode && !loading && !member;

  return (
    <div className="app-layout">
      <NavigationBar />
      <main className="main-content">
        <div className="profile-page">

          <button className="btn-back" onClick={() => navigate(-1)}>
            <i className="fa-solid fa-arrow-left" aria-hidden="true" />
            Back
          </button>

          {!isAddMode && loading ? (
            <p>Loading profile…</p>
          ) : notFound ? (
            <div className="profile-empty">
              <i className="fa-regular fa-circle-question" aria-hidden="true" />
              <p>Member not found.</p>
            </div>
          ) : (
            <div className="profile-card">

              <div className="profile-header">
                <div className="profile-avatar">
                  {isAddMode
                    ? <i className="fa-solid fa-user-plus" aria-hidden="true" />
                    : initials(form.firstName, form.lastName)}
                </div>
                <div>
                  <h1>
                    {isAddMode
                      ? 'Add Member'
                      : `${form.firstName}${form.middleName ? ` ${form.middleName}` : ''} ${form.lastName}`}
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
                    <input type="text" id="firstName" placeholder="e.g. John" value={form.firstName} onChange={handleChange} />
                  </div>
                </div>
                <div className="field">
                  <label htmlFor="middleName">Middle Name</label>
                  <div className="input-wrap">
                    <input type="text" id="middleName" placeholder="e.g. Joe" value={form.middleName} onChange={handleChange} />
                  </div>
                </div>
              </div>
              <div className="row-2">
                <div className="field">
                  <label htmlFor="lastName">Last Name <span className="req">*</span></label>
                  <div className="input-wrap">
                    <input type="text" id="lastName" placeholder="e.g. Smith" value={form.lastName} onChange={handleChange} />
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
                <div className="field autocomplete-field">
                  <label htmlFor="motherName">Mother's Name (Optional)</label>
                  <div className="input-wrap">
                    <input
                      type="text" id="motherName" autoComplete="off"
                      value={form.motherName}
                      onChange={handleChange}
                      onFocus={() => setMotherOpen(true)}
                      onBlur={() => setTimeout(() => setMotherOpen(false), 150)}
                    />
                  </div>
                  {motherOpen && suggestionsFor(form.motherName).length > 0 && (
                    <div className="suggestion-dropdown">
                      {suggestionsFor(form.motherName).map(name => (
                        <div
                          key={name}
                          className="suggestion-item"
                          onMouseDown={e => e.preventDefault()}
                          onClick={() => { setForm(prev => ({ ...prev, motherName: name })); setMotherOpen(false); }}
                        >
                          {name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="field autocomplete-field">
                  <label htmlFor="fatherName">Father's Name (Optional)</label>
                  <div className="input-wrap">
                    <input
                      type="text" id="fatherName" autoComplete="off"
                      value={form.fatherName}
                      onChange={handleChange}
                      onFocus={() => setFatherOpen(true)}
                      onBlur={() => setTimeout(() => setFatherOpen(false), 150)}
                    />
                  </div>
                  {fatherOpen && suggestionsFor(form.fatherName).length > 0 && (
                    <div className="suggestion-dropdown">
                      {suggestionsFor(form.fatherName).map(name => (
                        <div
                          key={name}
                          className="suggestion-item"
                          onMouseDown={e => e.preventDefault()}
                          onClick={() => { setForm(prev => ({ ...prev, fatherName: name })); setFatherOpen(false); }}
                        >
                          {name}
                        </div>
                      ))}
                    </div>
                  )}
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
                <div className="field autocomplete-field">
                  <label htmlFor="siblingInput">Sibling Name(s) (Optional)</label>
                  {siblingList.length > 0 && (
                    <div className="chip-list">
                      {siblingList.map(name => (
                        <span className="chip" key={name}>
                          {name}
                          <button type="button" onClick={() => removeSibling(name)} aria-label={`Remove ${name}`}>
                            <i className="fa-solid fa-xmark" aria-hidden="true" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="input-wrap">
                    <input
                      type="text" id="siblingInput" autoComplete="off"
                      placeholder="Type a name…"
                      value={siblingInput}
                      onChange={e => setSiblingInput(e.target.value)}
                      onFocus={() => setSiblingOpen(true)}
                      onBlur={() => setTimeout(() => setSiblingOpen(false), 150)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && siblingInput.trim()) {
                          e.preventDefault();
                          addSibling(siblingInput);
                        }
                      }}
                    />
                  </div>
                  {siblingOpen && suggestionsFor(siblingInput, siblingList).length > 0 && (
                    <div className="suggestion-dropdown">
                      {suggestionsFor(siblingInput, siblingList).map(name => (
                        <div
                          key={name}
                          className="suggestion-item"
                          onMouseDown={e => e.preventDefault()}
                          onClick={() => addSibling(name)}
                        >
                          {name}
                        </div>
                      ))}
                    </div>
                  )}
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
                      <option value="Council">Council</option>
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

              {/* ── Meta: Added By ── */}
              <div className="field">
                <label>{isAddMode ? 'Added By' : 'Modified By'}</label>
                <div className="input-wrap" style={{ opacity: 0.7 }}>
                  <input
                    type="text"
                    value={currentUser}
                    readOnly
                    style={{ cursor: 'default', backgroundColor: 'var(--input-disabled-bg, #f5f5f5)' }}
                  />
                </div>
              </div>

              <div className="modal-actions">
                <button className="btn-secondary" onClick={() => navigate(-1)}>
                  <i className="fa-solid fa-xmark" aria-hidden="true" /> Cancel
                </button>
                <button className="btn-primary" onClick={handleSave} disabled={saving}>
                  <i className={`fa-solid ${saving ? 'fa-spinner fa-spin' : isAddMode ? 'fa-user-plus' : 'fa-floppy-disk'}`} aria-hidden="true" />
                  {saving ? 'Saving…' : isAddMode ? 'Add Member' : 'Save Changes'}
                </button>
              </div>

            </div>
          )}

        </div>
      </main>
    </div>
  );
}