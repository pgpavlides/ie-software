import React, { useState, useEffect, useCallback } from 'react';
import DateTimePicker from 'react-datetime-picker';
import 'react-datetime-picker/dist/DateTimePicker.css';
import 'react-calendar/dist/Calendar.css';
import type {
  OvertimeEntry,
  CreateOvertimeData,
} from '../services/supabaseQueries';
import {
  getAllOvertimes,
  createOvertime,
  updateOvertime,
  deleteOvertime,
  getUserOvertimes,
  getCurrentUser,
  getUserDisplayNames,
} from '../services/supabaseQueries';
import supabase from '../lib/supabase';
import { useAuthStore } from '../store/authStore';

interface OvertimeManagerProps {
  // Empty interface to maintain type safety
}

export const OvertimeManager: React.FC<OvertimeManagerProps> = () => {
  const { hasRole } = useAuthStore();
  const [personalOvertimes, setPersonalOvertimes] = useState<OvertimeEntry[]>([]);
  const [allOvertimes, setAllOvertimes] = useState<OvertimeEntry[]>([]);
  const [hasManagerAccess, setHasManagerAccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<'personal' | 'global'>('personal');
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [currentUserDisplayName, setCurrentUserDisplayName] = useState<string>('');
  const [userDisplayNames, setUserDisplayNames] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState<CreateOvertimeData>({
    user_id: '',
    date: '',
    end_date: '',
    start_time: '',
    end_time: '',
    description: '',
    reason: '',
    project: ''
  });
  const [startDateTime, setStartDateTime] = useState<Date | null>(null);
  const [endDateTime, setEndDateTime] = useState<Date | null>(null);

  // Check if user has overtime-manager section permission
  const checkManagerPermission = useCallback(async (userId: string) => {
    try {
      // Super Admin always has access
      if (hasRole('Super Admin')) {
        return true;
      }

      // Get user's roles
      const { data: userRoles, error: roleError } = await supabase
        .from('user_roles')
        .select('role_id')
        .eq('user_id', userId);

      if (roleError || !userRoles?.length) {
        return false;
      }

      const roleIds = userRoles.map((ur: { role_id: string }) => ur.role_id);

      // Check if any role has overtime-manager access
      const { data: permissions, error: permError } = await supabase
        .from('role_section_permissions')
        .select('can_access')
        .eq('section_key', 'overtime-manager')
        .in('role_id', roleIds)
        .eq('can_access', true);

      if (permError) {
        console.error('Error checking overtime-manager permission:', permError);
        return false;
      }

      return permissions && permissions.length > 0;
    } catch (error) {
      console.error('Error checking overtime-manager permission:', error);
      return false;
    }
  }, [hasRole]);

  useEffect(() => {
    initializeData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const initializeData = async () => {
    setLoading(true);
    try {
      const user = await getCurrentUser();
      if (!user) {
        setLoading(false);
        return;
      }

      setCurrentUserId(user.id);
      setCurrentUserDisplayName(user.displayName || user.email || 'User');

      // Check for overtime-manager section permission
      const managerAccess = await checkManagerPermission(user.id);
      setHasManagerAccess(managerAccess);

      // Always load personal overtimes
      await loadPersonalOvertimes(user.id);

      // Only load all overtimes if has manager access
      if (managerAccess) {
        await loadAllOvertimes();
      }
    } catch (error) {
      console.error('Error initializing data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPersonalOvertimes = async (userId: string) => {
    try {
      const data = await getUserOvertimes(userId);
      setPersonalOvertimes(data);
    } catch (error) {
      console.error('Error loading personal overtimes:', error);
    }
  };

  const loadAllOvertimes = async () => {
    try {
      const data = await getAllOvertimes();
      setAllOvertimes(data);

      const uniqueUserIds = [...new Set(data.map(overtime => overtime.user_id))];
      if (uniqueUserIds.length > 0) {
        const displayNames = await getUserDisplayNames(uniqueUserIds);
        setUserDisplayNames(displayNames);
      }
    } catch (error) {
      console.error('Error loading all overtimes:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!startDateTime || !endDateTime) {
      alert('Please select both start and end date/time');
      return;
    }

    if (startDateTime.getTime() >= endDateTime.getTime()) {
      alert('End time must be after start time');
      return;
    }

    const startDate = startDateTime.toISOString().split('T')[0];
    const endDate = endDateTime.toISOString().split('T')[0];
    const startTime = startDateTime.toTimeString().slice(0, 5);
    const endTime = endDateTime.toTimeString().slice(0, 5);

    const dataToSubmit: CreateOvertimeData = {
      user_id: currentUserId,
      date: startDate,
      end_date: endDate,
      start_time: startTime,
      end_time: endTime,
      description: formData.description,
      reason: formData.reason,
      project: formData.project
    };

    try {
      if (editingId) {
        const result = await updateOvertime(editingId, dataToSubmit);
        if (result.success) {
          await loadPersonalOvertimes(currentUserId);
          if (hasManagerAccess) await loadAllOvertimes();
          resetForm();
        } else {
          alert(`Error updating overtime: ${result.error}`);
        }
      } else {
        const result = await createOvertime(dataToSubmit);
        if (result.success) {
          await loadPersonalOvertimes(currentUserId);
          if (hasManagerAccess) await loadAllOvertimes();
          resetForm();
        } else {
          alert(`Error creating overtime: ${result.error}`);
        }
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      alert('An unexpected error occurred');
    }
  };

  const handleEdit = (overtime: OvertimeEntry) => {
    if (overtime.user_id !== currentUserId) {
      alert('You can only edit your own overtime entries');
      return;
    }

    const startDate = new Date(`${overtime.date}T${overtime.start_time}`);
    let endDate = new Date(`${overtime.end_date}T${overtime.end_time}`);

    if (overtime.date === overtime.end_date && endDate <= startDate) {
      endDate = new Date(endDate.getTime() + 24 * 60 * 60 * 1000);
    }

    setStartDateTime(startDate);
    setEndDateTime(endDate);
    setFormData({
      user_id: overtime.user_id,
      date: overtime.date,
      end_date: overtime.end_date,
      start_time: overtime.start_time,
      end_time: overtime.end_time,
      description: overtime.description || '',
      reason: overtime.reason || '',
      project: overtime.project || ''
    });
    setEditingId(overtime.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this overtime entry?')) {
      try {
        const result = await deleteOvertime(id);
        if (result.success) {
          await loadPersonalOvertimes(currentUserId);
          if (hasManagerAccess) await loadAllOvertimes();
        } else {
          alert(`Error deleting overtime: ${result.error}`);
        }
      } catch (error) {
        console.error('Error deleting overtime:', error);
        alert('An unexpected error occurred');
      }
    }
  };

  const resetForm = () => {
    setFormData({
      user_id: currentUserId,
      date: '',
      end_date: '',
      start_time: '',
      end_time: '',
      description: '',
      reason: '',
      project: ''
    });
    setStartDateTime(null);
    setEndDateTime(null);
    setEditingId(null);
    setShowForm(false);
  };

  const getCurrentViewData = () => {
    return activeView === 'personal' ? personalOvertimes : allOvertimes;
  };

  const getUserDisplayName = (userId: string) => {
    if (userId === currentUserId) {
      return currentUserDisplayName;
    }
    return userDisplayNames[userId] || `User ${userId.substring(0, 8)}...`;
  };

  const formatTime = (time: string) => {
    return new Date(`2000-01-01T${time}`).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const calculateHours = (startDate: string, startTime: string, endDate: string, endTime: string) => {
    const startDateTime = new Date(`${startDate}T${startTime}`);
    let endDateTime = new Date(`${endDate}T${endTime}`);

    if (startDate === endDate && endDateTime <= startDateTime) {
      endDateTime = new Date(endDateTime.getTime() + 24 * 60 * 60 * 1000);
    }

    const diffMs = endDateTime.getTime() - startDateTime.getTime();
    const hours = diffMs / (1000 * 60 * 60);

    return Math.max(0, hours);
  };

  const getTotalHours = () => {
    return personalOvertimes.reduce((sum, overtime) => {
      return sum + calculateHours(overtime.date, overtime.start_time, overtime.end_date, overtime.end_time);
    }, 0);
  };

  const exportPersonalOvertimes = () => {
    if (personalOvertimes.length === 0) {
      alert('No overtime entries to export');
      return;
    }

    const totalHours = getTotalHours();

    let exportText = `Personal Overtime Report - ${currentUserDisplayName}\n`;
    exportText += `Generated on: ${new Date().toLocaleDateString()}\n\n`;

    personalOvertimes.forEach(overtime => {
      const hours = calculateHours(overtime.date, overtime.start_time, overtime.end_date, overtime.end_time);
      const dateRange = overtime.date === overtime.end_date
        ? formatDate(overtime.date)
        : `${formatDate(overtime.date)} - ${formatDate(overtime.end_date)}`;

      exportText += `${dateRange} - ${hours.toFixed(1)}h - ${overtime.project || 'N/A'} - ${overtime.reason || 'N/A'} - ${overtime.description || 'N/A'}\n`;
    });

    exportText += `\nTotal Overtime Hours: ${totalHours.toFixed(1)}h`;
    exportText += `\nTotal Overtime Entries: ${personalOvertimes.length}`;

    const blob = new Blob([exportText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `overtime_report_${currentUserDisplayName}_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

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
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[#f59e0b] rounded-full blur-[200px] opacity-[0.03]" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-[#3b82f6] rounded-full blur-[150px] opacity-[0.02]" />

      <div className="relative z-10 p-6 lg:p-10 max-w-7xl mx-auto">
        {/* Header */}
        <header className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="absolute inset-0 bg-[#f59e0b] rounded-2xl blur-xl opacity-30" />
                <div className="relative w-14 h-14 bg-gradient-to-br from-[#1a1a1f] to-[#0f0f12] rounded-2xl border border-[#2a2a35] flex items-center justify-center">
                  <svg className="w-7 h-7 text-[#f59e0b]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 6v6l4 2" />
                  </svg>
                </div>
              </div>
              <div>
                <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">
                  Overtime Tracker
                </h1>
                <p className="text-[#6b6b7a] text-sm mt-1">
                  Track and manage your overtime hours
                </p>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3 px-4 py-3 bg-[#141418] rounded-xl border border-[#1f1f28]">
                <div className="w-10 h-10 bg-[#f59e0b]/10 rounded-lg flex items-center justify-center">
                  <span className="text-[#f59e0b] text-lg font-bold">{personalOvertimes.length}</span>
                </div>
                <div className="text-sm">
                  <p className="text-[#6b6b7a]">Total Entries</p>
                  <p className="text-white font-semibold">{getTotalHours().toFixed(1)}h logged</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Tab Navigation - Only show if admin */}
        {hasManagerAccess && (
          <div className="mb-6">
            <div className="inline-flex p-1 bg-[#141418] rounded-xl border border-[#1f1f28]">
              <button
                onClick={() => setActiveView('personal')}
                className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  activeView === 'personal'
                    ? 'bg-[#f59e0b] text-white shadow-lg shadow-[#f59e0b]/20'
                    : 'text-[#6b6b7a] hover:text-white'
                }`}
              >
                My Overtime ({personalOvertimes.length})
              </button>
              <button
                onClick={() => setActiveView('global')}
                className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  activeView === 'global'
                    ? 'bg-[#f59e0b] text-white shadow-lg shadow-[#f59e0b]/20'
                    : 'text-[#6b6b7a] hover:text-white'
                }`}
              >
                All Overtimes ({allOvertimes.length})
              </button>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mb-6 flex flex-wrap gap-3">
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#f59e0b] hover:bg-[#d97706] text-white rounded-xl font-medium transition-all duration-200 shadow-lg shadow-[#f59e0b]/20"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Overtime
          </button>
          <button
            onClick={exportPersonalOvertimes}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#141418] hover:bg-[#1a1a1f] text-white rounded-xl font-medium transition-all duration-200 border border-[#2a2a35] hover:border-[#3a3a48]"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export Report
          </button>
        </div>

        {/* Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-[#141418] border border-[#2a2a35] rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden">
              <div className="sticky top-0 bg-[#141418] border-b border-[#2a2a35] px-6 py-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">
                  {editingId ? 'Edit Overtime' : 'Add New Overtime'}
                </h2>
                <button
                  onClick={resetForm}
                  className="p-2 text-[#6b6b7a] hover:text-white hover:bg-[#1f1f28] rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto max-h-[calc(90vh-80px)]">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#8b8b9a] mb-2">Start Date & Time</label>
                    <div className="datetime-picker-dark">
                      <DateTimePicker
                        onChange={(date) => {
                          if (date && date instanceof Date) {
                            setStartDateTime(date);
                          }
                        }}
                        value={startDateTime}
                        format="y-MM-dd HH:mm"
                        className="w-full"
                        calendarIcon={null}
                        clearIcon={null}
                        disableClock={true}
                        locale="en-US"
                        maxDetail="minute"
                        showLeadingZeros={true}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#8b8b9a] mb-2">End Date & Time</label>
                    <div className="datetime-picker-dark">
                      <DateTimePicker
                        onChange={(date) => {
                          if (date && date instanceof Date) {
                            setEndDateTime(date);
                          }
                        }}
                        value={endDateTime}
                        format="y-MM-dd HH:mm"
                        className="w-full"
                        calendarIcon={null}
                        clearIcon={null}
                        disableClock={true}
                        locale="en-US"
                        maxDetail="minute"
                        showLeadingZeros={true}
                        minDate={startDateTime || undefined}
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#8b8b9a] mb-2">Project</label>
                  <input
                    type="text"
                    value={formData.project}
                    onChange={(e) => setFormData({ ...formData, project: e.target.value })}
                    className="w-full bg-[#1a1a1f] border border-[#2a2a35] rounded-xl px-4 py-3 text-white placeholder-[#5a5a68] focus:outline-none focus:border-[#f59e0b]/50 focus:ring-2 focus:ring-[#f59e0b]/20 transition-all"
                    placeholder="e.g., Room Alpha, Backend API"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#8b8b9a] mb-2">Reason</label>
                  <input
                    type="text"
                    value={formData.reason}
                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                    className="w-full bg-[#1a1a1f] border border-[#2a2a35] rounded-xl px-4 py-3 text-white placeholder-[#5a5a68] focus:outline-none focus:border-[#f59e0b]/50 focus:ring-2 focus:ring-[#f59e0b]/20 transition-all"
                    placeholder="e.g., Urgent deadline, Bug fix"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#8b8b9a] mb-2">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full bg-[#1a1a1f] border border-[#2a2a35] rounded-xl px-4 py-3 text-white placeholder-[#5a5a68] focus:outline-none focus:border-[#f59e0b]/50 focus:ring-2 focus:ring-[#f59e0b]/20 transition-all resize-none"
                    rows={3}
                    placeholder="What did you work on?"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-[#2a2a35]">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-5 py-2.5 bg-[#1f1f28] hover:bg-[#2a2a38] text-white rounded-xl font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-[#f59e0b] hover:bg-[#d97706] text-white rounded-xl font-medium transition-all shadow-lg shadow-[#f59e0b]/20"
                  >
                    {editingId ? 'Update' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Overtime Entries */}
        <div className="space-y-3">
          {getCurrentViewData().length === 0 ? (
            <div className="bg-[#141418] rounded-2xl border border-[#1f1f28] p-12 text-center">
              <div className="w-16 h-16 bg-[#1a1a1f] rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-[#4a4a58]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">No overtime entries</h3>
              <p className="text-[#6b6b7a] mb-6">
                {activeView === 'personal'
                  ? "You haven't logged any overtime yet. Click 'Add Overtime' to get started."
                  : "No overtime entries have been logged yet."
                }
              </p>
              {activeView === 'personal' && (
                <button
                  onClick={() => setShowForm(true)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#f59e0b] hover:bg-[#d97706] text-white rounded-xl font-medium transition-all"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Your First Entry
                </button>
              )}
            </div>
          ) : (
            getCurrentViewData().map((overtime) => {
              const hours = calculateHours(overtime.date, overtime.start_time, overtime.end_date, overtime.end_time);
              const isOwner = overtime.user_id === currentUserId;

              return (
                <div
                  key={overtime.id}
                  className="group bg-[#141418] rounded-2xl border border-[#1f1f28] p-5 transition-all duration-200 hover:border-[#2a2a38] hover:bg-[#18181d]"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                    {/* Time Info */}
                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-14 h-14 bg-gradient-to-br from-[#f59e0b]/20 to-[#f59e0b]/5 rounded-xl flex items-center justify-center flex-shrink-0">
                        <span className="text-[#f59e0b] font-bold text-lg">{hours.toFixed(1)}h</span>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-1">
                          <span className="text-white font-semibold">
                            {overtime.date === overtime.end_date
                              ? formatDate(overtime.date)
                              : `${formatDate(overtime.date)} - ${formatDate(overtime.end_date)}`
                            }
                          </span>
                          <span className="text-[#4a4a58]">|</span>
                          <span className="text-[#8b8b9a] font-mono text-sm">
                            {formatTime(overtime.start_time)} - {formatTime(overtime.end_time)}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          {activeView === 'global' && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#3b82f6]/10 text-[#3b82f6] rounded-lg text-xs font-medium">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                              {getUserDisplayName(overtime.user_id)}
                            </span>
                          )}
                          {overtime.project && (
                            <span className="inline-flex items-center px-2.5 py-1 bg-[#10b981]/10 text-[#10b981] rounded-lg text-xs font-medium">
                              {overtime.project}
                            </span>
                          )}
                          {overtime.reason && (
                            <span className="inline-flex items-center px-2.5 py-1 bg-[#8b5cf6]/10 text-[#8b5cf6] rounded-lg text-xs font-medium">
                              {overtime.reason}
                            </span>
                          )}
                        </div>

                        {overtime.description && (
                          <p className="text-[#6b6b7a] text-sm mt-2 line-clamp-2">
                            {overtime.description}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Actions - Only for owner */}
                    {isOwner && (
                      <div className="flex items-center gap-2 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleEdit(overtime)}
                          className="p-2.5 text-[#6b6b7a] hover:text-[#3b82f6] hover:bg-[#3b82f6]/10 rounded-lg transition-all"
                          title="Edit"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(overtime.id)}
                          className="p-2.5 text-[#6b6b7a] hover:text-[#ea2127] hover:bg-[#ea2127]/10 rounded-lg transition-all"
                          title="Delete"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Custom styles for date picker */}
      <style>{`
        .datetime-picker-dark .react-datetime-picker__wrapper {
          background: #1a1a1f;
          border: 1px solid #2a2a35;
          border-radius: 0.75rem;
          padding: 0.75rem 1rem;
          color: white;
        }
        .datetime-picker-dark .react-datetime-picker__inputGroup__input {
          color: white;
          background: transparent;
        }
        .datetime-picker-dark .react-datetime-picker__inputGroup__divider {
          color: #6b6b7a;
        }
        .datetime-picker-dark .react-datetime-picker__inputGroup__leadingZero {
          color: white;
        }
        .datetime-picker-dark .react-calendar {
          background: #141418;
          border: 1px solid #2a2a35;
          border-radius: 0.75rem;
          color: white;
        }
        .datetime-picker-dark .react-calendar__tile {
          color: white;
        }
        .datetime-picker-dark .react-calendar__tile:enabled:hover,
        .datetime-picker-dark .react-calendar__tile:enabled:focus {
          background: #2a2a35;
        }
        .datetime-picker-dark .react-calendar__tile--active {
          background: #f59e0b !important;
        }
        .datetime-picker-dark .react-calendar__navigation button {
          color: white;
        }
        .datetime-picker-dark .react-calendar__navigation button:enabled:hover,
        .datetime-picker-dark .react-calendar__navigation button:enabled:focus {
          background: #2a2a35;
        }
        .datetime-picker-dark .react-calendar__month-view__weekdays {
          color: #6b6b7a;
        }
        .datetime-picker-dark .react-calendar__month-view__days__day--weekend {
          color: #f59e0b;
        }
        .datetime-picker-dark .react-calendar__month-view__days__day--neighboringMonth {
          color: #4a4a58;
        }
      `}</style>
    </div>
  );
};
