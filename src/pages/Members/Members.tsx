import './members.css';
import NavigationBar from '../Home/NavigationBar/NavigationBar';
import MembersTable from './MembersTable/MembersTable';
import MemberModal from './MemberModal/MemberModal';
import { useMembers } from './useMembers';

export default function Members() {
  const {
    currentUser, members, filtered, search, filter,
    modalOpen, modalMode, form, formError, toast, loading,
    setSearch, setFilter,
    openModal, openEditModal, closeModal,
    handleFormChange, addMember, editMember,
    togglePledger, archiveMember,
  } = useMembers();

  return (
    <div className="app-layout">
      <NavigationBar />
      <main className="main-content">
        <div className="page">

          {/* Page Header */}
          <div className="page-header">
            <div className="page-header-left">
              <h1>Members</h1>
              <p>{members.length} member{members.length !== 1 ? 's' : ''} total</p>
            </div>
            <button className="btn-add" onClick={openModal}>
              <i className="fa-solid fa-user-plus" aria-hidden="true" />
              Add Member
            </button>
          </div>

          {/* Toolbar */}
          <div className="toolbar">
            <div className="search-wrap">
              <i className="fa-solid fa-magnifying-glass" aria-hidden="true" />
              <input
                type="text"
                placeholder="Search by name…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <div className="filter-select-wrap">
              <i className="fa-solid fa-filter" aria-hidden="true" />
              <select value={filter} onChange={e => setFilter(e.target.value)}>
                <option value="all">All Members</option>
                <option value="yes">Pledgers Only</option>
                <option value="no">Non-Pledgers</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <MembersTable
            members={members}
            filtered={filtered}
            loading={loading}
            onTogglePledger={togglePledger}
            onArchive={archiveMember}
            onEdit={openEditModal}
          />

        </div>

        {/* Modal */}
        <MemberModal
          isOpen={modalOpen}
          mode={modalMode}
          form={form}
          formError={formError}
          currentUser={currentUser}
          onClose={closeModal}
          onFormChange={handleFormChange}
          onSubmit={modalMode === 'edit' ? editMember : addMember}
        />

        {/* Toast */}
        <div className={`toast${toast ? ' show' : ''}`}>
          <i className="fa-solid fa-circle-check" aria-hidden="true" />
          <span>{toast}</span>
        </div>

      </main>
    </div>
  );
}