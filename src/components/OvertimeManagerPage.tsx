import { useEffect, useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiRefreshCw,
  FiSearch,
  FiChevronDown,
  FiTrash2,
  FiX,
  FiAlertTriangle,
  FiClock,
  FiCalendar,
  FiUser,
  FiDownload,
  FiFilter,
} from 'react-icons/fi';
import supabase from '../lib/supabase';
import { getAllOvertimes, getUserDisplayNames, deleteOvertime } from '../services/supabaseQueries';
import type { OvertimeEntry } from '../services/supabaseQueries';

// Types
interface Department {
  id: string;
  name: string;
  color: string;
}

interface UserInfo {
  id: string;
  full_name: string;
  email: string;
  department_id?: string;
  department_name?: string;
}

interface EnrichedOvertime extends OvertimeEntry {
  user_name?: string;
  user_email?: string;
  department_name?: string;
  department_color?: string;
  hours: number;
}

export default function OvertimeManagerPage() {
  // Data states
  const [overtimes, setOvertimes] = useState<EnrichedOvertime[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filter states
  const [filterUser, setFilterUser] = useState<string>('');
  const [filterDepartment, setFilterDepartment] = useState<string>('');
  const [filterDateFrom, setFilterDateFrom] = useState<string>('');
  const [filterDateTo, setFilterDateTo] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal states
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedOvertime, setSelectedOvertime] = useState<EnrichedOvertime | null>(null);

  // Calculate hours between two datetimes
  const calculateHours = useCallback((startDate: string, startTime: string, endDate: string, endTime: string): number => {
    const start = new Date(`${startDate}T${startTime}`);
    let end = new Date(`${endDate}T${endTime}`);

    if (startDate === endDate && end <= start) {
      end = new Date(end.getTime() + 24 * 60 * 60 * 1000);
    }

    const diffMs = end.getTime() - start.getTime();
    return Math.max(0, diffMs / (1000 * 60 * 60));
  }, []);

  // Fetch all data
  const fetchData = useCallback(async () => {
    try {
      // Fetch departments
      const { data: deptData } = await supabase
        .from('departments')
        .select('id, name, color')
        .eq('is_active', true)
        .order('display_order');
      if (deptData) setDepartments(deptData);

      // Fetch all overtimes
      const overtimeData = await getAllOvertimes();

      // Get unique user IDs
      const userIds = [...new Set(overtimeData.map(o => o.user_id))];

      // Fetch user display names
      const displayNames = await getUserDisplayNames(userIds);

      // Fetch user details for department info
      const { data: usersData } = await supabase.rpc('get_users_display_info', {
        user_ids: userIds
      });

      // Build user info map
      const userInfoMap = new Map<string, UserInfo>();
      if (usersData) {
        usersData.forEach((u: { id: string; full_name: string; email: string }) => {
          userInfoMap.set(u.id, {
            id: u.id,
            full_name: u.full_name || displayNames[u.id] || u.email.split('@')[0],
            email: u.email,
          });
        });
      }

      // Get user-role-department relationships
      const { data: userRolesData } = await supabase
        .from('user_roles')
        .select(`
          user_id,
          roles:role_id (
            department_id,
            departments:department_id (
              id,
              name,
              color
            )
          )
        `)
        .in('user_id', userIds);

      // Map user to department
      const userDeptMap = new Map<string, { name: string; color: string }>();
      if (userRolesData) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        userRolesData.forEach((ur: any) => {
          // Handle various possible structures from Supabase joins
          const roles = ur.roles;
          if (roles) {
            // roles might be an object or array depending on the join type
            const role = Array.isArray(roles) ? roles[0] : roles;
            if (role?.departments) {
              const dept = Array.isArray(role.departments) ? role.departments[0] : role.departments;
              if (dept) {
                userDeptMap.set(ur.user_id, {
                  name: dept.name,
                  color: dept.color,
                });
              }
            }
          }
        });
      }

      // Build users list for filter dropdown
      const usersList: UserInfo[] = userIds.map(id => ({
        id,
        full_name: userInfoMap.get(id)?.full_name || displayNames[id] || 'Unknown',
        email: userInfoMap.get(id)?.email || '',
        department_name: userDeptMap.get(id)?.name,
      }));
      setUsers(usersList);

      // Enrich overtimes
      const enrichedOvertimes: EnrichedOvertime[] = overtimeData.map(o => {
        const userInfo = userInfoMap.get(o.user_id);
        const deptInfo = userDeptMap.get(o.user_id);
        return {
          ...o,
          user_name: userInfo?.full_name || displayNames[o.user_id] || 'Unknown',
          user_email: userInfo?.email,
          department_name: deptInfo?.name,
          department_color: deptInfo?.color,
          hours: calculateHours(o.date, o.start_time, o.end_date, o.end_time),
        };
      });

      setOvertimes(enrichedOvertimes);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [calculateHours]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
  };

  // Filtered overtimes
  const filteredOvertimes = useMemo(() => {
    return overtimes.filter(o => {
      if (filterUser && o.user_id !== filterUser) return false;
      if (filterDepartment && o.department_name !== filterDepartment) return false;
      if (filterDateFrom && o.date < filterDateFrom) return false;
      if (filterDateTo && o.date > filterDateTo) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          o.user_name?.toLowerCase().includes(query) ||
          o.project?.toLowerCase().includes(query) ||
          o.reason?.toLowerCase().includes(query) ||
          o.description?.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [overtimes, filterUser, filterDepartment, filterDateFrom, filterDateTo, searchQuery]);

  // Stats
  const stats = useMemo(() => {
    const totalHours = filteredOvertimes.reduce((sum, o) => sum + o.hours, 0);
    const uniqueUsers = new Set(filteredOvertimes.map(o => o.user_id)).size;
    const thisMonth = filteredOvertimes.filter(o => {
      const now = new Date();
      const entryDate = new Date(o.date);
      return entryDate.getMonth() === now.getMonth() && entryDate.getFullYear() === now.getFullYear();
    });
    const thisMonthHours = thisMonth.reduce((sum, o) => sum + o.hours, 0);

    return {
      totalEntries: filteredOvertimes.length,
      totalHours,
      uniqueUsers,
      thisMonthHours,
    };
  }, [filteredOvertimes]);

  // Group overtimes by user for summary
  const userSummary = useMemo(() => {
    const summary = new Map<string, { name: string; department?: string; departmentColor?: string; hours: number; entries: number }>();
    filteredOvertimes.forEach(o => {
      const existing = summary.get(o.user_id);
      if (existing) {
        existing.hours += o.hours;
        existing.entries += 1;
      } else {
        summary.set(o.user_id, {
          name: o.user_name || 'Unknown',
          department: o.department_name,
          departmentColor: o.department_color,
          hours: o.hours,
          entries: 1,
        });
      }
    });
    return Array.from(summary.entries())
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.hours - a.hours);
  }, [filteredOvertimes]);

  // Helpers
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatTime = (time: string) => {
    return new Date(`2000-01-01T${time}`).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  };

  // Export to CSV
  const exportToCSV = () => {
    if (filteredOvertimes.length === 0) {
      alert('No data to export');
      return;
    }

    const headers = ['Employee', 'Department', 'Start Date', 'End Date', 'Start Time', 'End Time', 'Hours', 'Project', 'Reason', 'Description'];
    const rows = filteredOvertimes.map(o => [
      o.user_name || '',
      o.department_name || '',
      o.date,
      o.end_date,
      o.start_time,
      o.end_time,
      o.hours.toFixed(2),
      o.project || '',
      o.reason || '',
      o.description || '',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `overtime_report_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Clear filters
  const clearFilters = () => {
    setFilterUser('');
    setFilterDepartment('');
    setFilterDateFrom('');
    setFilterDateTo('');
    setSearchQuery('');
  };

  const hasActiveFilters = filterUser || filterDepartment || filterDateFrom || filterDateTo || searchQuery;

  // Delete handler
  const handleDelete = async () => {
    if (!selectedOvertime) return;

    try {
      const result = await deleteOvertime(selectedOvertime.id);
      if (result.success) {
        setOvertimes(prev => prev.filter(o => o.id !== selectedOvertime.id));
        setShowDeleteModal(false);
        setShowDetailModal(false);
        setSelectedOvertime(null);
      } else {
        alert(`Error deleting overtime: ${result.error}`);
      }
    } catch (error) {
      console.error('Error deleting overtime:', error);
      alert('An unexpected error occurred');
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-full bg-[#0f0f12] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-[#f59e0b] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[#6b6b7a]">Loading overtime data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-[#0f0f12] relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-grid-pattern opacity-50" />
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[#f59e0b] rounded-full blur-[250px] opacity-[0.03]" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-[#10b981] rounded-full blur-[200px] opacity-[0.02]" />

      <div className="relative z-10 p-4 sm:p-6 lg:p-8 max-w-[1800px] mx-auto">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-6"
        >
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#f59e0b] to-[#d97706] flex items-center justify-center shadow-lg shadow-[#f59e0b]/25">
                <FiClock className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">
                  Overtime Manager
                </h1>
                <p className="text-[#6b6b7a] text-sm mt-0.5">
                  Monitor and manage all employee overtime hours
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleRefresh}
                disabled={refreshing}
                className="p-3 bg-[#1a1a23] border border-[#2a2a35] rounded-xl text-[#8b8b9a] hover:text-white hover:border-[#3a3a48] transition-all disabled:opacity-50"
              >
                <FiRefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={exportToCSV}
                className="flex items-center gap-2 px-5 py-3 bg-[#1a1a23] border border-[#2a2a35] text-white rounded-xl font-medium hover:border-[#3a3a48] transition-all"
              >
                <FiDownload className="w-5 h-5" />
                <span>Export CSV</span>
              </motion.button>
            </div>
          </div>
        </motion.header>

        {/* Stats Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-6"
        >
          {[
            { label: 'Total Entries', value: stats.totalEntries, color: '#6b7280', format: (v: number) => v.toString() },
            { label: 'Total Hours', value: stats.totalHours, color: '#f59e0b', format: (v: number) => `${v.toFixed(1)}h` },
            { label: 'Unique Employees', value: stats.uniqueUsers, color: '#3b82f6', format: (v: number) => v.toString() },
            { label: 'This Month', value: stats.thisMonthHours, color: '#10b981', format: (v: number) => `${v.toFixed(1)}h` },
          ].map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: 0.15 + index * 0.05 }}
              className="relative bg-[#141418] border border-[#1f1f28] rounded-2xl p-4 lg:p-5 overflow-hidden group hover:border-[#2a2a35] transition-colors"
            >
              <div className="absolute top-0 left-0 w-1 h-full" style={{ backgroundColor: stat.color }} />
              <p className="text-3xl lg:text-4xl font-bold text-white mb-1" style={{ color: stat.color }}>
                {stat.format(stat.value)}
              </p>
              <p className="text-sm text-[#6b6b7a]">{stat.label}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* Filter Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="bg-[#141418] border border-[#1f1f28] rounded-2xl p-4 mb-6"
        >
          <div className="flex flex-wrap gap-3">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4a4a58]" />
              <input
                type="text"
                placeholder="Search by name, project, reason..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-[#1a1a23] border border-[#2a2a35] rounded-xl text-white text-sm placeholder-[#4a4a58] focus:outline-none focus:border-[#f59e0b]/50 transition-colors"
              />
            </div>

            {/* User Filter */}
            <div className="relative">
              <select
                value={filterUser}
                onChange={(e) => setFilterUser(e.target.value)}
                className="appearance-none pl-4 pr-10 py-2.5 bg-[#1a1a23] border border-[#2a2a35] rounded-xl text-white text-sm focus:outline-none focus:border-[#f59e0b]/50 cursor-pointer transition-colors"
              >
                <option value="">All Employees</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.full_name}</option>
                ))}
              </select>
              <FiChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6b6b7a] pointer-events-none" />
            </div>

            {/* Department Filter */}
            <div className="relative">
              <select
                value={filterDepartment}
                onChange={(e) => setFilterDepartment(e.target.value)}
                className="appearance-none pl-4 pr-10 py-2.5 bg-[#1a1a23] border border-[#2a2a35] rounded-xl text-white text-sm focus:outline-none focus:border-[#f59e0b]/50 cursor-pointer transition-colors"
              >
                <option value="">All Departments</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.name}>{dept.name}</option>
                ))}
              </select>
              <FiChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6b6b7a] pointer-events-none" />
            </div>

            {/* Date From */}
            <div className="relative">
              <input
                type="date"
                value={filterDateFrom}
                onChange={(e) => setFilterDateFrom(e.target.value)}
                placeholder="From"
                className="pl-4 pr-4 py-2.5 bg-[#1a1a23] border border-[#2a2a35] rounded-xl text-white text-sm focus:outline-none focus:border-[#f59e0b]/50 cursor-pointer transition-colors"
              />
            </div>

            {/* Date To */}
            <div className="relative">
              <input
                type="date"
                value={filterDateTo}
                onChange={(e) => setFilterDateTo(e.target.value)}
                placeholder="To"
                className="pl-4 pr-4 py-2.5 bg-[#1a1a23] border border-[#2a2a35] rounded-xl text-white text-sm focus:outline-none focus:border-[#f59e0b]/50 cursor-pointer transition-colors"
              />
            </div>

            {/* Clear Filters */}
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-2 px-4 py-2.5 bg-[#ef4444]/10 border border-[#ef4444]/30 rounded-xl text-[#ef4444] text-sm hover:bg-[#ef4444]/20 transition-colors"
              >
                <FiFilter className="w-4 h-4" />
                Clear
              </button>
            )}
          </div>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Overtime Entries Table */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="lg:col-span-2 bg-[#141418] border border-[#1f1f28] rounded-2xl overflow-hidden"
          >
            <div className="px-6 py-4 border-b border-[#1f1f28]">
              <h2 className="text-lg font-semibold text-white">Overtime Entries</h2>
              <p className="text-sm text-[#6b6b7a]">Showing {filteredOvertimes.length} entries</p>
            </div>

            <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
              {filteredOvertimes.length === 0 ? (
                <div className="px-6 py-16 text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#1a1a23] flex items-center justify-center">
                    <FiClock className="w-8 h-8 text-[#3a3a48]" />
                  </div>
                  <p className="text-[#6b6b7a] mb-1">No overtime entries found</p>
                  <p className="text-[#4a4a58] text-sm">Adjust your filters to see more results</p>
                </div>
              ) : (
                <table className="w-full">
                  <thead className="sticky top-0 bg-[#141418]">
                    <tr className="border-b border-[#1f1f28]">
                      <th className="px-6 py-3 text-left text-xs font-semibold text-[#6b6b7a] uppercase tracking-wider">Employee</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-[#6b6b7a] uppercase tracking-wider">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-[#6b6b7a] uppercase tracking-wider">Hours</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-[#6b6b7a] uppercase tracking-wider">Project</th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-[#6b6b7a] uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1f1f28]">
                    {filteredOvertimes.map((overtime, index) => (
                      <motion.tr
                        key={overtime.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.02 }}
                        onClick={() => {
                          setSelectedOvertime(overtime);
                          setShowDetailModal(true);
                        }}
                        className="cursor-pointer hover:bg-[#1a1a23] transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-[#f59e0b]/10 flex items-center justify-center text-xs font-medium text-[#f59e0b]">
                              {overtime.user_name?.charAt(0).toUpperCase() || '?'}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-white">{overtime.user_name}</p>
                              {overtime.department_name && (
                                <p className="text-xs text-[#6b6b7a]">{overtime.department_name}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm text-white">{formatDate(overtime.date)}</p>
                          <p className="text-xs text-[#6b6b7a]">
                            {formatTime(overtime.start_time)} - {formatTime(overtime.end_time)}
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-sm font-medium bg-[#f59e0b]/10 text-[#f59e0b]">
                            {overtime.hours.toFixed(1)}h
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {overtime.project ? (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-[#10b981]/10 text-[#10b981]">
                              {overtime.project}
                            </span>
                          ) : (
                            <span className="text-[#4a4a58]">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => {
                                setSelectedOvertime(overtime);
                                setShowDeleteModal(true);
                              }}
                              className="p-2 text-[#6b6b7a] hover:text-[#ef4444] hover:bg-[#ef4444]/10 rounded-lg transition-colors"
                            >
                              <FiTrash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </motion.div>

          {/* Employee Summary Sidebar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="bg-[#141418] border border-[#1f1f28] rounded-2xl overflow-hidden"
          >
            <div className="px-6 py-4 border-b border-[#1f1f28]">
              <h2 className="text-lg font-semibold text-white">Employee Summary</h2>
              <p className="text-sm text-[#6b6b7a]">Top contributors by hours</p>
            </div>

            <div className="p-4 space-y-3 max-h-[600px] overflow-y-auto">
              {userSummary.length === 0 ? (
                <div className="py-8 text-center">
                  <FiUser className="w-8 h-8 text-[#3a3a48] mx-auto mb-2" />
                  <p className="text-[#6b6b7a] text-sm">No data available</p>
                </div>
              ) : (
                userSummary.map((user, index) => (
                  <motion.div
                    key={user.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: 0.5 + index * 0.03 }}
                    onClick={() => setFilterUser(user.id)}
                    className={`p-4 rounded-xl border transition-all cursor-pointer ${
                      filterUser === user.id
                        ? 'border-[#f59e0b]/50 bg-[#f59e0b]/10'
                        : 'border-[#1f1f28] bg-[#1a1a23] hover:border-[#2a2a35]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#f59e0b]/20 to-[#f59e0b]/5 flex items-center justify-center text-sm font-bold text-[#f59e0b]">
                          #{index + 1}
                        </div>
                        <div>
                          <p className="font-medium text-white">{user.name}</p>
                          {user.department && (
                            <p className="text-xs" style={{ color: user.departmentColor || '#6b6b7a' }}>
                              {user.department}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-[#f59e0b]">{user.hours.toFixed(1)}h</p>
                        <p className="text-xs text-[#6b6b7a]">{user.entries} entries</p>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="h-1.5 bg-[#1f1f28] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-[#f59e0b] to-[#d97706] rounded-full transition-all"
                        style={{ width: `${Math.min(100, (user.hours / (userSummary[0]?.hours || 1)) * 100)}%` }}
                      />
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Detail Modal */}
      <AnimatePresence>
        {showDetailModal && selectedOvertime && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowDetailModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2 }}
              className="bg-[#141418] border border-[#2a2a35] rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-6 py-4 border-b border-[#2a2a35] flex items-center justify-between">
                <h2 className="text-lg font-bold text-white">Overtime Details</h2>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="p-2 text-[#6b6b7a] hover:text-white hover:bg-[#1f1f28] rounded-lg transition-colors"
                >
                  <FiX className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                {/* Employee */}
                <div className="flex items-center gap-4 p-4 bg-[#1a1a23] rounded-xl">
                  <div className="w-12 h-12 rounded-xl bg-[#f59e0b]/10 flex items-center justify-center">
                    <FiUser className="w-6 h-6 text-[#f59e0b]" />
                  </div>
                  <div>
                    <p className="font-medium text-white">{selectedOvertime.user_name}</p>
                    {selectedOvertime.department_name && (
                      <p className="text-sm" style={{ color: selectedOvertime.department_color || '#6b6b7a' }}>
                        {selectedOvertime.department_name}
                      </p>
                    )}
                  </div>
                </div>

                {/* Date & Time */}
                <div className="flex items-center gap-4 p-4 bg-[#1a1a23] rounded-xl">
                  <div className="w-12 h-12 rounded-xl bg-[#3b82f6]/10 flex items-center justify-center">
                    <FiCalendar className="w-6 h-6 text-[#3b82f6]" />
                  </div>
                  <div>
                    <p className="font-medium text-white">
                      {selectedOvertime.date === selectedOvertime.end_date
                        ? formatDate(selectedOvertime.date)
                        : `${formatDate(selectedOvertime.date)} - ${formatDate(selectedOvertime.end_date)}`}
                    </p>
                    <p className="text-sm text-[#6b6b7a]">
                      {formatTime(selectedOvertime.start_time)} - {formatTime(selectedOvertime.end_time)} ({selectedOvertime.hours.toFixed(1)}h)
                    </p>
                  </div>
                </div>

                {/* Project & Reason */}
                {(selectedOvertime.project || selectedOvertime.reason) && (
                  <div className="flex flex-wrap gap-2">
                    {selectedOvertime.project && (
                      <span className="px-3 py-1.5 bg-[#10b981]/10 text-[#10b981] rounded-lg text-sm font-medium">
                        {selectedOvertime.project}
                      </span>
                    )}
                    {selectedOvertime.reason && (
                      <span className="px-3 py-1.5 bg-[#8b5cf6]/10 text-[#8b5cf6] rounded-lg text-sm font-medium">
                        {selectedOvertime.reason}
                      </span>
                    )}
                  </div>
                )}

                {/* Description */}
                {selectedOvertime.description && (
                  <div className="p-4 bg-[#1a1a23] rounded-xl">
                    <p className="text-xs text-[#6b6b7a] mb-1">Description</p>
                    <p className="text-white">{selectedOvertime.description}</p>
                  </div>
                )}
              </div>

              <div className="px-6 py-4 border-t border-[#2a2a35] flex gap-3">
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="flex-1 px-4 py-3 bg-[#1f1f28] hover:bg-[#2a2a38] text-white rounded-xl transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    setShowDeleteModal(true);
                  }}
                  className="px-4 py-3 bg-[#ef4444]/10 hover:bg-[#ef4444]/20 text-[#ef4444] rounded-xl transition-colors"
                >
                  <FiTrash2 className="w-5 h-5" />
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteModal && selectedOvertime && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowDeleteModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="bg-[#141418] border border-[#2a2a35] rounded-2xl shadow-2xl w-full max-w-md p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-full bg-[#ef4444]/10 flex items-center justify-center mb-4">
                  <FiAlertTriangle className="w-8 h-8 text-[#ef4444]" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Delete Overtime Entry?</h3>
                <p className="text-[#6b6b7a] mb-6">
                  Delete <span className="text-white">{selectedOvertime.user_name}'s</span> overtime entry from{' '}
                  <span className="text-white">{formatDate(selectedOvertime.date)}</span>?
                  This action cannot be undone.
                </p>

                <div className="flex gap-3 w-full">
                  <button
                    onClick={() => setShowDeleteModal(false)}
                    className="flex-1 px-4 py-3 bg-[#1f1f28] hover:bg-[#2a2a38] text-white rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDelete}
                    className="flex-1 px-4 py-3 bg-[#ef4444] hover:bg-[#dc2626] text-white rounded-xl transition-colors flex items-center justify-center gap-2"
                  >
                    <FiTrash2 className="w-4 h-4" />
                    Delete
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
