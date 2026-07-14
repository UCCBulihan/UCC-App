import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import NavigationBar from '../Home/NavigationBar/NavigationBar';
import { useMembersStore } from '../Members/useMembersStore';

function initials(firstName: string, lastName: string) {
  return (firstName?.[0] || '') + (lastName?.[0] || '');
}

export default function Profile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { members, loading, fetchIfNeeded } = useMembersStore();

  useEffect(() => { fetchIfNeeded(); }, [fetchIfNeeded]);

  const member = members.find(m => m.id === id);

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
                  {initials(member.firstName, member.lastName)}
                </div>
                <div>
                  <h1>
                    {member.firstName}{member.middleName ? ` ${member.middleName}` : ''} {member.lastName}
                  </h1>
                  {member.isPledger && (
                    <span className="profile-badge">
                      <i className="fa-solid fa-hand-holding-heart" aria-hidden="true" /> Pledger
                    </span>
                  )}
                </div>
              </div>

              <div className="profile-details">
                <div className="profile-row">
                  <span className="profile-label">Added By</span>
                  <span className="profile-value">{member.addedBy}</span>
                </div>
                <div className="profile-row">
                  <span className="profile-label">Date Added</span>
                  <span className="profile-value">{member.dateAdded}</span>
                </div>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}