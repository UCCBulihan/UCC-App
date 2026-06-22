import './pledgesmembers.css';
import NavigationBar from '../../Home/NavigationBar/NavigationBar';
import MembersTable from './MembersTable/MembersTable';
import MemberModal from './MemberModal/MemberModal';
import PageHeader from './components/PageHeader';
import MembersToolbar from './components/MembersToolbar';
import Toast from './components/Toast';
import { useMembers } from './usePledgeMembers';

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

          <PageHeader
            memberCount={members.length}
            onAddMember={openModal}
          />

          <MembersToolbar
            search={search}
            filter={filter}
            onSearchChange={setSearch}
            onFilterChange={setFilter}
          />

          <MembersTable
            members={members}
            filtered={filtered}
            loading={loading}
            onTogglePledger={togglePledger}
            onArchive={archiveMember}
            onEdit={openEditModal}
          />

        </div>

        <MemberModal
          isOpen={modalOpen}
          mode={modalMode}
          form={form}
          formError={formError}
          currentUser={currentUser}
          showPledgerToggle={true}
          onClose={closeModal}
          onFormChange={handleFormChange}
          onSubmit={modalMode === 'edit' ? editMember : addMember}
        />

        <Toast message={toast} />

      </main>
    </div>
  );
}