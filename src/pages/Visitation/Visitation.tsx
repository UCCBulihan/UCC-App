import { useState } from 'react';
import './visitation.css';
import NavigationBar from '../Home/NavigationBar/NavigationBar';
import { useVisitations } from './hooks/useVisitations';
import { useVisitationMembers } from './hooks/useVisitationMembers';
import VisitationFilter from './components/visitationFilters/VisitationFilter';
import VisitationTable from './components/visitationTable/visitationTable';
import VisitationModal from './components/visitationModal/VisitationModal';
import ManageVisitorsModal from './components/ManageVisitorsModal/ManageVisitorsModal';

const VISIT_TYPES = ['General Visit', 'Pastoral', 'Sick Visit', 'Welcome', 'Follow-up Visit'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const YEARS = ['2024', '2025', '2026'];

export default function Visitation() {
  const {
    visitations,
    loading,
    filters,
    isModalOpen,
    editingRecord,
    openAddModal,
    openEditModal,
    closeModal,
    addVisitation,
    updateVisitation,
    updateNotes,
    updateFilter,
    exportCSV,
  } = useVisitations();

  const { members, memberNames, visitorNames, toggleVisitor } = useVisitationMembers();

  const [isManageVisitorsOpen, setIsManageVisitorsOpen] = useState(false);

  return (
    <div className="app-layout">
      <NavigationBar />

      <main className="main-content">
        <div className="page-wrapper">
          <h1 className="page-title">Visitation Tracker</h1>
          <p className="page-subtitle">Welcome, Marc Adrian Bernales</p>

          <div className="action-row">
            <VisitationFilter
              filters={filters}
              onFilterChange={updateFilter}
              members={memberNames}
              visitTypes={VISIT_TYPES}
              months={MONTHS}
              years={YEARS}
            />

            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="btn-export" onClick={exportCSV}>
                Export CSV
              </button>
              <button
                className="btn-export"
                onClick={() => setIsManageVisitorsOpen(true)}
              >
                <i className="fa-solid fa-users"></i> Manage Visitors
              </button>
              <button className="btn-add" onClick={openAddModal}>
                <i className="fa-solid fa-plus"></i> Add Visitation
              </button>
            </div>
          </div>

          {loading ? (
            <p style={{ textAlign: 'center', padding: '32px', color: '#6b6b6b' }}>
              Loading records…
            </p>
          ) : (
            <VisitationTable
              visitations={visitations}
              onNotesChange={updateNotes}
              onEdit={openEditModal}
            />
          )}

          {/* Manage Visitors Modal */}
          <ManageVisitorsModal
            isOpen={isManageVisitorsOpen}
            onClose={() => setIsManageVisitorsOpen(false)}
            members={members}
            onToggleVisitor={toggleVisitor}
          />

          {/* Add / Edit Visitation Modal */}
          <VisitationModal
            isOpen={isModalOpen}
            onClose={closeModal}
            onSave={addVisitation}
            onUpdate={updateVisitation}
            editingRecord={editingRecord}
            members={memberNames}
            visitors={visitorNames}
          />
        </div>
      </main>
    </div>
  );
}