import React, { useState, useEffect } from 'react';
import DateTimePicker from 'react-datetime-picker';
import 'react-datetime-picker/dist/DateTimePicker.css';
import 'react-calendar/dist/Calendar.css';
import type {
  OvertimeEntry,
  CreateOvertimeData,
  OvertimeStats,
} from '../services/supabaseQueries';
import {
  getAllOvertimes,
  createOvertime,
  updateOvertime,
  deleteOvertime,
  getUserOvertimes,
  getCurrentUser,
  getUserDisplayNames,
  isUserAdmin
} from '../services/supabaseQueries';

interface OvertimeManagerProps {
  // Empty interface to maintain type safety
}

export const OvertimeManager: React.FC<OvertimeManagerProps> = () => {
  const [overtimes, setOvertimes] = useState<OvertimeEntry[]>([]);
  const [personalOvertimes, setPersonalOvertimes] = useState<OvertimeEntry[]>([]);
  const [stats, setStats] = useState<OvertimeStats | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<'personal' | 'global'>('personal');
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [currentUserEmail, setCurrentUserEmail] = useState<string>('');
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

  useEffect(() => {
    initializeData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const initializeData = async () => {
    setLoading(true);
    try {
      // Get current user
      const user = await getCurrentUser();
      if (!user) {
        setLoading(false);
        return;
      }

      setCurrentUserId(user.id);
      setCurrentUserEmail(user.email);
      setCurrentUserDisplayName(user.displayName);

      // Check if user is admin
      const adminStatus = await isUserAdmin();
      setIsAdmin(adminStatus);

      if (adminStatus) {
        // Set user_id in form data for personal entries
        setFormData(prev => ({ ...prev, user_id: user.id }));

        // Load both personal and global data
        await Promise.all([
          loadPersonalOvertimes(user.id),
          loadAllOvertimes(),
          loadStats()
        ]);
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
      setOvertimes(data);
      
      // Get display names for all unique user IDs
      const uniqueUserIds = [...new Set(data.map(overtime => overtime.user_id))];
      if (uniqueUserIds.length > 0) {
        const displayNames = await getUserDisplayNames(uniqueUserIds);
        setUserDisplayNames(displayNames);
      }
    } catch (error) {
      console.error('Error loading all overtimes:', error);
    }
  };

  const loadStats = async () => {
    try {
      // Calculate stats using frontend logic instead of database function
      const allOvertimes = await getAllOvertimes();
      
      if (allOvertimes.length === 0) {
        setStats({
          total_entries: 0,
          total_hours: 0,
          approved_hours: 0,
          pending_hours: 0,
          unique_users: 0
        });
        return;
      }

      // Calculate total hours using our corrected frontend calculation
      const totalHours = allOvertimes.reduce((sum, overtime) => {
        const hours = calculateHours(overtime.date, overtime.start_time, overtime.end_date, overtime.end_time);
        return sum + hours;
      }, 0);

      const approvedHours = allOvertimes
        .filter(overtime => overtime.is_approved)
        .reduce((sum, overtime) => {
          const hours = calculateHours(overtime.date, overtime.start_time, overtime.end_date, overtime.end_time);
          return sum + hours;
        }, 0);

      const pendingHours = totalHours - approvedHours;
      const uniqueUsers = new Set(allOvertimes.map(overtime => overtime.user_id)).size;

      setStats({
        total_entries: allOvertimes.length,
        total_hours: totalHours,
        approved_hours: approvedHours,
        pending_hours: pendingHours,
        unique_users: uniqueUsers
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate that we have both start and end times
    if (!startDateTime || !endDateTime) {
      alert('Please select both start and end date/time');
      return;
    }
    
    // Validate that end time is after start time
    if (startDateTime.getTime() >= endDateTime.getTime()) {
      alert('End time must be after start time');
      return;
    }
    
    // Additional validation: if it's the same date, ensure end time is after start time
    const startDateStr = startDateTime.toDateString();
    const endDateStr = endDateTime.toDateString();
    
    if (startDateStr === endDateStr) {
      const startHours = startDateTime.getHours();
      const startMinutes = startDateTime.getMinutes();
      const endHours = endDateTime.getHours();
      const endMinutes = endDateTime.getMinutes();
      
      if (endHours < startHours || (endHours === startHours && endMinutes <= startMinutes)) {
        alert('End time must be after start time on the same day');
        return;
      }
    }
    
    // Convert DateTime objects to required format
    const startDate = startDateTime.toISOString().split('T')[0];
    const endDate = endDateTime.toISOString().split('T')[0];
    const startTime = startDateTime.toTimeString().slice(0, 5);
    const endTime = endDateTime.toTimeString().slice(0, 5);
    
    console.log('DateTime objects:', {
      startDateTime: startDateTime.toISOString(),
      endDateTime: endDateTime.toISOString(),
      startDate,
      endDate,
      startTime,
      endTime
    });
    
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
    
    console.log('Submitting data:', dataToSubmit);
    
    try {
      if (editingId) {
        // Update existing overtime (only personal ones)
        const result = await updateOvertime(editingId, dataToSubmit);
        if (result.success) {
          await loadPersonalOvertimes(currentUserId);
          await loadAllOvertimes();
          await loadStats();
          resetForm();
        } else {
          alert(`Error updating overtime: ${result.error}`);
        }
      } else {
        // Create new overtime (always personal)
        const result = await createOvertime(dataToSubmit);
        if (result.success) {
          await loadPersonalOvertimes(currentUserId);
          await loadAllOvertimes();
          await loadStats();
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
    // Only allow editing personal entries
    if (overtime.user_id !== currentUserId) {
      alert('You can only edit your own overtime entries');
      return;
    }

    // Convert overtime data to DateTime objects
    const startDate = new Date(`${overtime.date}T${overtime.start_time}`);
    let endDate = new Date(`${overtime.end_date}T${overtime.end_time}`);
    
    // Fix for old entries: if end time is before start time on same date, assume next day
    if (overtime.date === overtime.end_date && endDate <= startDate) {
      endDate = new Date(endDate.getTime() + 24 * 60 * 60 * 1000); // Add 24 hours
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

  const handleDelete = async (id: string, isPersonal: boolean = false) => {
    if (!isPersonal) {
      alert('You can only delete your own overtime entries');
      return;
    }

    if (confirm('Are you sure you want to delete this overtime entry?')) {
      try {
        const result = await deleteOvertime(id);
        if (result.success) {
          await loadPersonalOvertimes(currentUserId);
          await loadAllOvertimes();
          await loadStats();
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
    return activeView === 'personal' ? personalOvertimes : overtimes;
  };

  const getUserDisplayName = (userId: string) => {
    if (userId === currentUserId) {
      return currentUserDisplayName || currentUserEmail || 'Current User';
    }
    // Use the fetched display name or fallback to a formatted ID
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
    return new Date(date).toLocaleDateString();
  };

  const exportPersonalOvertimes = () => {
    if (personalOvertimes.length === 0) {
      alert('No overtime entries to export');
      return;
    }

    // Calculate total hours for personal overtimes
    const totalHours = personalOvertimes.reduce((sum, overtime) => {
      const hours = calculateHours(overtime.date, overtime.start_time, overtime.end_date, overtime.end_time);
      return sum + hours;
    }, 0);

    // Create export data
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

    // Create and download file
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

  const calculateHours = (startDate: string, startTime: string, endDate: string, endTime: string) => {
    // Create proper datetime objects
    const startDateTime = new Date(`${startDate}T${startTime}`);
    let endDateTime = new Date(`${endDate}T${endTime}`);
    
    // Fix: If end time is before start time on same date, assume next day
    if (startDate === endDate && endDateTime <= startDateTime) {
      endDateTime = new Date(endDateTime.getTime() + 24 * 60 * 60 * 1000); // Add 24 hours
    }
    
    // Calculate difference in milliseconds, then convert to hours
    const diffMs = endDateTime.getTime() - startDateTime.getTime();
    const hours = diffMs / (1000 * 60 * 60);
    
    return Math.max(0, hours);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h2>
        <p className="text-gray-600">You need admin privileges to access overtime management.</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Overtime Management</h1>
        <p className="mt-2 text-gray-600">Manage and track overtime entries</p>
      </div>

      {/* Tab Navigation */}
      <div className="mb-8">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveView('personal')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeView === 'personal'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              My Overtime ({personalOvertimes.length})
            </button>
            <button
              onClick={() => setActiveView('global')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeView === 'global'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              All Overtimes ({overtimes.length})
            </button>
          </nav>
        </div>
      </div>

      {/* Stats Section */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-medium text-gray-900">Total Entries</h3>
            <p className="text-3xl font-bold text-blue-600">{stats.total_entries}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-medium text-gray-900">Total Hours</h3>
            <p className="text-3xl font-bold text-green-600">{stats.total_hours.toFixed(1)}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-medium text-gray-900">Unique Users</h3>
            <p className="text-3xl font-bold text-purple-600">{stats.unique_users}</p>
          </div>
        </div>
      )}

      {/* Add New Button and Export Button - Only for Personal View */}
      {activeView === 'personal' && (
        <div className="mb-6 flex space-x-4">
          <button
            onClick={() => setShowForm(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
          >
            Add New Overtime
          </button>
          <button
            onClick={exportPersonalOvertimes}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg"
          >
            Export to TXT
          </button>
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full mx-4">
            <h2 className="text-xl font-bold mb-4">
              {editingId ? 'Edit Overtime' : 'Add New Overtime'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Start Date & Time</label>
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
                    hourPlaceholder="HH (00-23)"
                    minutePlaceholder="MM"
                    showLeadingZeros={true}
                  />
                  <p className="text-xs text-gray-500 mt-1">Use 24-hour format: 00:00 to 23:59</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">End Date & Time</label>
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
                    hourPlaceholder="HH (00-23)"
                    minutePlaceholder="MM"
                    showLeadingZeros={true}
                    minDate={startDateTime || undefined}
                  />
                  <p className="text-xs text-gray-500 mt-1">Use 24-hour format: 00:00 to 23:59</p>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Reason</label>
                <input
                  type="text"
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Project</label>
                <input
                  type="text"
                  value={formData.project}
                  onChange={(e) => setFormData({ ...formData, project: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  {editingId ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Overtime Entries Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {activeView === 'global' && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Admin Name</th>
              )}
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Hours</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
              {activeView === 'personal' && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {getCurrentViewData().map((overtime) => (
              <tr key={overtime.id}>
                {activeView === 'global' && (
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex items-center">
                      <div className="text-sm font-medium text-gray-900">
                        {getUserDisplayName(overtime.user_id)}
                      </div>
                    </div>
                  </td>
                )}
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {overtime.date === overtime.end_date 
                    ? formatDate(overtime.date)
                    : `${formatDate(overtime.date)} - ${formatDate(overtime.end_date)}`
                  }
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatTime(overtime.start_time)} - {formatTime(overtime.end_time)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {calculateHours(overtime.date, overtime.start_time, overtime.end_date, overtime.end_time).toFixed(1)}h
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">
                  <div>
                    {overtime.description && <p>{overtime.description}</p>}
                    {overtime.reason && <p className="text-gray-600">Reason: {overtime.reason}</p>}
                    {overtime.project && <p className="text-gray-600">Project: {overtime.project}</p>}
                  </div>
                </td>
                {activeView === 'personal' && (
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEdit(overtime)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(overtime.id, true)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        
        {getCurrentViewData().length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">
              {activeView === 'personal' 
                ? 'No personal overtime entries found' 
                : 'No overtime entries found'
              }
            </p>
          </div>
        )}
      </div>
    </div>
  );
};