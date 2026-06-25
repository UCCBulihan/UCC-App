import NavigationBar from '../../Home/NavigationBar/NavigationBar';
import MembersTable from '../Pledgers/MembersTable/MembersTable';
import MemberModal from '../Pledgers/MemberModal/MemberModal';
import PageHeader from '../Pledgers/components/PageHeader';
import MembersToolbar from '../Pledgers/components/MembersToolbar';
import Toast from '../Pledgers/components/Toast';
import { useMembers } from '../Pledgers/useMembers';

export default function AllMembers() {
  const {
    currentUser, members, filtered, paginated, search, filter,
    modalOpen, modalMode, form, formError, toast, loading,
    setSearch, setFilter,
    openModal, openEditModal, closeModal,
    handleFormChange, addMember, editMember,
    archiveMember,
    pageSize, setPageSize,
    currentPage, setCurrentPage,
    totalPages,
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
            paginated={paginated}
            loading={loading}
            onArchive={archiveMember}
            onEdit={openEditModal}
            pageSize={pageSize}
            currentPage={currentPage}
            totalPages={totalPages}
            onPageSizeChange={setPageSize}
            onPageChange={setCurrentPage}
          />

        </div>

        <MemberModal
          isOpen={modalOpen}
          mode={modalMode}
          form={form}
          formError={formError}
          currentUser={currentUser}
          onClose={closeModal}
          onFormChange={handleFormChange}
          showPledgerToggle={modalMode !== 'edit'}
          onSubmit={modalMode === 'edit' ? editMember : addMember}
        />

        <Toast message={toast} />

      </main>
    </div>
  );
}