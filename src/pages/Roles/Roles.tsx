import './roles.css';
import NavigationBar from '../Home/NavigationBar/NavigationBar';
import RolesTable from './RolesTable/RolesTable';
import RoleModal from './RoleModal/RoleModal';
import RolesPageHeader from './components/RolesPageHeader';
import RolesToolbar from './components/RolesToolbar';
import Toast from '../Members/Pledgers/components/Toast';
import { useRoles } from './useRoles';

export default function Roles() {
  const {
    currentUser, userRoles, filtered, search, filter,
    modalOpen, modalMode, form, formError, toast, loading,
    setSearch, setFilter,
    openModal, openEditModal, closeModal,
    handleFormChange, addUserRole, editUserRole,
    revokeRole, changeRole,
  } = useRoles();

  return (
    <div className="app-layout">
      <NavigationBar />
      <main className="main-content">
        <div className="page">

          <RolesPageHeader
            userCount={userRoles.length}
            onAssignRole={openModal}
          />

          <RolesToolbar
            search={search}
            filter={filter}
            onSearchChange={setSearch}
            onFilterChange={setFilter}
          />

          <RolesTable
            userRoles={userRoles}
            filtered={filtered}
            loading={loading}
            onChangeRole={changeRole}
            onRevoke={revokeRole}
            onEdit={openEditModal}
          />

        </div>

        <RoleModal
          isOpen={modalOpen}
          mode={modalMode}
          form={form}
          formError={formError}
          currentUser={currentUser}
          onClose={closeModal}
          onFormChange={handleFormChange}
          onSubmit={modalMode === 'edit' ? editUserRole : addUserRole}
        />

        <Toast message={toast} />

      </main>
    </div>
  );
}