import './roles.css';
import './DepartmentsModal/departments_modal.css';
import NavigationBar from '../Home/NavigationBar/NavigationBar';
import RolesTable from './RolesTable/RolesTable';
import RoleModal from './RoleModal/RoleModal';
import DepartmentsModal from './DepartmentsModal/DepartmentsModal';
import RolesPageHeader from './components/RolesPageHeader';
import RolesToolbar from './components/RolesToolbar';
import Toast from '../Members/Pledgers/components/Toast';
import { useRoles } from './useRoles';
import { useDepartments } from './useDepartments';

export default function Roles() {

  const {
    currentUser, currentUserRole, userRoles, filtered, search, filter,
    modalOpen, editingUser, form, formError, toast, loading,
    assignedCount,
    setSearch, setFilter,
    openEditModal, closeModal,
    handleFormChange, saveRole,
    removeRole,
    canEditUser,
    canRemoveUser,
    showToast,
  } = useRoles();

  const {
    departments,
    departmentById,
    filteredDepartments,
    canManage: canManageDepartments,
    canEdit: canEditDepartments,
    loading: departmentsLoading,
    search: departmentSearch,
    setSearch: setDepartmentSearch,
    isModalOpen: isDepartmentModalOpen,
    view: departmentView,
    editingDepartment,
    form: departmentForm,
    formError: departmentFormError,
    pendingDelete: departmentPendingDelete,
    userSearch,
    setUserSearch,
    assignedUserCount,
    getAssignment,
    openModal: openDepartmentsModal,
    closeModal: closeDepartmentsModal,
    openCreateForm: openCreateDepartmentForm,
    openEditForm: openEditDepartmentForm,
    backToList: backToDepartmentList,
    handleFormChange: handleDepartmentFormChange,
    saveDepartment,
    requestDelete: requestDeleteDepartment,
    cancelDelete: cancelDeleteDepartment,
    confirmDelete: confirmDeleteDepartment,
    toggleUserAssignment,
    updateUserPosition,
  } = useDepartments(currentUser, userRoles, showToast, currentUserRole);

  return (
    <div className="app-layout">
      <NavigationBar />
      <main className="main-content">
        <div className="page">

          <RolesPageHeader
            userCount={userRoles.length}
            assignedCount={assignedCount}
            departmentCount={departments.length}
            onManageDepartments={openDepartmentsModal}
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
          canEditUser={canEditUser}
          canRemoveUser={canRemoveUser}
          departmentById={departmentById}
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

        <DepartmentsModal
          isOpen={isDepartmentModalOpen}
          view={departmentView}
          departments={filteredDepartments}
          totalCount={departments.length}
          loading={departmentsLoading}
          search={departmentSearch}
          onSearchChange={setDepartmentSearch}
          editingDepartment={editingDepartment}
          form={departmentForm}
          formError={departmentFormError}
          pendingDelete={departmentPendingDelete}
          userRoles={userRoles}
          userSearch={userSearch}
          onUserSearchChange={setUserSearch}
          assignedUserCount={assignedUserCount}
          getAssignment={getAssignment}
          onClose={closeDepartmentsModal}
          onCreateNew={openCreateDepartmentForm}
          onEdit={openEditDepartmentForm}
          onBackToList={backToDepartmentList}
          onFormChange={handleDepartmentFormChange}
          onSave={saveDepartment}
          onRequestDelete={requestDeleteDepartment}
          onCancelDelete={cancelDeleteDepartment}
          onConfirmDelete={confirmDeleteDepartment}
          onToggleUserAssignment={toggleUserAssignment}
          onUpdateUserPosition={updateUserPosition}
          canManage={canManageDepartments}
          canEdit={canEditDepartments}
        />

        <Toast message={toast} />

      </main>
    </div>
  );
}