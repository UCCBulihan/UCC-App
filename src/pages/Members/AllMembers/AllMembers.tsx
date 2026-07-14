import { useNavigate } from 'react-router-dom';
import NavigationBar from '../../Home/NavigationBar/NavigationBar';
import MembersTable from '../Pledgers/MembersTable/MembersTable';
import PageHeader from '../Pledgers/components/PageHeader';
import MembersToolbar from '../Pledgers/components/MembersToolbar';
import Toast from '../Pledgers/components/Toast';
import { useMembers } from '../Pledgers/useMembers';

export default function AllMembers() {
  const navigate = useNavigate();
  const {
    members, filtered, paginated, search, filter,
    toast, loading,
    setSearch, setFilter,
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