import { useNavigate } from 'react-router-dom';
import './pledgesmembers.css';
import './pagination.css';
import NavigationBar from '../../Home/NavigationBar/NavigationBar';
import MembersTable from './MembersTable/MembersTable';
import PageHeader from './components/PageHeader';
import MembersToolbar from './components/MembersToolbar';
import Toast from './components/Toast';
import { useMembers } from './useMembers';

export default function Members() {
  const navigate = useNavigate();
  const {
    members, filtered, paginated, search, filter,
    toast, loading,
    setSearch, setFilter,
    togglePledger, archiveMember,
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
            onAddMember={() => navigate('/Profile/new')}
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
            onTogglePledger={togglePledger}
            onArchive={archiveMember}
            onEdit={(member) => navigate(`/Profile/${member.id}`)}
            onViewProfile={(member) => navigate(`/Profile/${member.id}`)}
            pageSize={pageSize}
            currentPage={currentPage}
            totalPages={totalPages}
            onPageSizeChange={setPageSize}
            onPageChange={setCurrentPage}
          />

        </div>

        <Toast message={toast} />

      </main>
    </div>
  );
}