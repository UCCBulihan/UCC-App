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
    modalOpen, editingUser, form, formError, toast, loading,
    setSearch, setFilter,
    openEditModal, closeModal,
    handleFormChange, saveRole,
    removeRole, assignedCount,
  } = useRoles();

  return (
    <div className="app-layout">
      <NavigationBar />
      <main className="main-content">
        <div className="page">

          <RolesPageHeader 
            userCount={userRoles.length} 
            assignedCount={assignedCount} 
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
            onRemoveRole={removeRole}
            onEdit={openEditModal}
          />

        </div>

        <RoleModal
          isOpen={modalOpen}
          editingUser={editingUser}
          form={form}
          formError={formError}
          currentUser={currentUser}
          onClose={closeModal}
          onFormChange={handleFormChange}
          onSubmit={saveRole}
        />

        <Toast message={toast} />

      </main>
    </div>
  );
}