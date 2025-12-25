import { useEffect, useState, useMemo } from 'react';
import supabase from '../lib/supabase';
import { useAuthStore } from '../store/authStore';

interface Department {
  id: string;
  name: string;
  icon: string;
  color: string;
}

interface AssignableUser {
  user_id: string;
  email: string;
  full_name: string;
  role_name: string;
  department_name?: string;
  department_id?: string;
}

interface Task {
  id: string;
  title: string;
  description: string | null;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  department_id: string | null;
  assigned_to: string | null;
  assigned_by: string;
  due_date: string | null;
  location: string | null;
  notes: string | null;
  completion_notes: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  // Joined data
  assignee_name?: string;
  department_name?: string;
  department_color?: string;
}

interface UserPermissions {
  can_manage_all: boolean;
  is_department_head: boolean;
  department_id: string | null;
  department_name: string | null;
}

type TabType = 'pending' | 'in_progress' | 'completed' | 'all';

const priorityConfig = {
  low: { color: '#6b7280', label: 'Low', bg: '#6b728020' },
  medium: { color: '#3b82f6', label: 'Medium', bg: '#3b82f620' },
  high: { color: '#f59e0b', label: 'High', bg: '#f59e0b20' },
  urgent: { color: '#ef4444', label: 'Urgent', bg: '#ef444420' },
};

const statusConfig = {
  pending: { color: '#6b7280', label: 'Pending', bg: '#6b728020' },
  in_progress: { color: '#3b82f6', label: 'In Progress', bg: '#3b82f620' },
  completed: { color: '#10b981', label: 'Completed', bg: '#10b98120' },
  cancelled: { color: '#ef4444', label: 'Cancelled', bg: '#ef444420' },
};

export default function TasksPage() {
  const { user } = useAuthStore();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [assignableUsers, setAssignableUsers] = useState<AssignableUser[]>([]);
  const [permissions, setPermissions] = useState<UserPermissions | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('pending');
  const [filterDepartment, setFilterDepartment] = useState<string>('');

  // Create/Edit modal
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium' as Task['priority'],
    department_id: '',
    assigned_to: '',
    due_date: '',
    location: '',
    notes: '',
  });
  const [saving, setSaving] = useState(false);

  // Complete task modal
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [completingTask, setCompletingTask] = useState<Task | null>(null);
  const [completionNotes, setCompletionNotes] = useState('');

  // Task detail modal (for mobile)
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const canCreateTasks = permissions?.can_manage_all || permissions?.is_department_head;

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch user permissions
      const { data: permData } = await supabase.rpc('get_user_task_permissions');
      if (permData && permData.length > 0) {
        setPermissions(permData[0]);
      }

      // Fetch departments
      const { data: deptData } = await supabase
        .from('departments')
        .select('id, name, icon, color')
        .eq('is_active', true)
        .order('display_order');
      if (deptData) setDepartments(deptData);

      // Fetch tasks
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false });

      if (tasksError) throw tasksError;

      // Fetch assignable users based on permissions
      if (permData && permData.length > 0) {
        const perm = permData[0] as UserPermissions;
        if (perm.can_manage_all) {
          const { data: usersData } = await supabase.rpc('get_all_assignable_users');
          if (usersData) setAssignableUsers(usersData);
        } else if (perm.is_department_head && perm.department_id) {
          const { data: usersData } = await supabase.rpc('get_department_users', {
            dept_id: perm.department_id
          });
          if (usersData) setAssignableUsers(usersData);
        }
      }

      // Enrich tasks with department info
      if (tasksData && deptData) {
        const deptMap = new Map(deptData.map((d: Department) => [d.id, d]));

        // Get unique user IDs for name lookup
        const userIds = new Set<string>();
        tasksData.forEach((t: Task) => {
          if (t.assigned_to) userIds.add(t.assigned_to);
        });

        const enrichedTasks = tasksData.map((t: Task) => {
          const dept = t.department_id ? deptMap.get(t.department_id) : null;
          return {
            ...t,
            department_name: dept?.name,
            department_color: dept?.color,
          };
        });

        setTasks(enrichedTasks);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter tasks based on tab, department filter, and user permissions
  const filteredTasks = useMemo(() => {
    let filtered = tasks;

    // Filter by department if selected
    if (filterDepartment) {
      filtered = filtered.filter(t => t.department_id === filterDepartment);
    }

    // Non-managers only see their assigned tasks
    if (!permissions?.can_manage_all && !permissions?.is_department_head) {
      filtered = filtered.filter(t => t.assigned_to === user?.id);
    }

    // Filter by tab
    if (activeTab !== 'all') {
      filtered = filtered.filter(t => t.status === activeTab);
    }

    return filtered;
  }, [tasks, activeTab, filterDepartment, permissions, user?.id]);

  // Stats
  const stats = useMemo(() => {
    let relevantTasks = tasks;

    if (!permissions?.can_manage_all && !permissions?.is_department_head) {
      relevantTasks = tasks.filter(t => t.assigned_to === user?.id);
    }

    if (filterDepartment) {
      relevantTasks = relevantTasks.filter(t => t.department_id === filterDepartment);
    }

    return {
      pending: relevantTasks.filter(t => t.status === 'pending').length,
      in_progress: relevantTasks.filter(t => t.status === 'in_progress').length,
      completed: relevantTasks.filter(t => t.status === 'completed').length,
      total: relevantTasks.length,
    };
  }, [tasks, permissions, user?.id, filterDepartment]);

  // Get users for assignment dropdown (filtered by selected department)
  const filteredAssignableUsers = useMemo(() => {
    if (!formData.department_id) return assignableUsers;
    return assignableUsers.filter(u => u.department_id === formData.department_id);
  }, [assignableUsers, formData.department_id]);

  const openCreateModal = () => {
    setEditingTask(null);
    setFormData({
      title: '',
      description: '',
      priority: 'medium',
      department_id: permissions?.department_id || '',
      assigned_to: '',
      due_date: '',
      location: '',
      notes: '',
    });
    setShowModal(true);
  };

  const openEditModal = (task: Task) => {
    setEditingTask(task);
    setFormData({
      title: task.title,
      description: task.description || '',
      priority: task.priority,
      department_id: task.department_id || '',
      assigned_to: task.assigned_to || '',
      due_date: task.due_date || '',
      location: task.location || '',
      notes: task.notes || '',
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.title.trim()) return;

    setSaving(true);
    try {
      if (editingTask) {
        const { error } = await supabase
          .from('tasks')
          .update({
            title: formData.title,
            description: formData.description || null,
            priority: formData.priority,
            department_id: formData.department_id || null,
            assigned_to: formData.assigned_to || null,
            due_date: formData.due_date || null,
            location: formData.location || null,
            notes: formData.notes || null,
          })
          .eq('id', editingTask.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('tasks')
          .insert({
            title: formData.title,
            description: formData.description || null,
            priority: formData.priority,
            department_id: formData.department_id || null,
            assigned_to: formData.assigned_to || null,
            assigned_by: user?.id,
            due_date: formData.due_date || null,
            location: formData.location || null,
            notes: formData.notes || null,
          });

        if (error) throw error;
      }

      setShowModal(false);
      fetchData();
    } catch (error) {
      console.error('Error saving task:', error);
    } finally {
      setSaving(false);
    }
  };

  const updateTaskStatus = async (task: Task, newStatus: Task['status']) => {
    setTasks(prev =>
      prev.map(t =>
        t.id === task.id ? { ...t, status: newStatus } : t
      )
    );

    try {
      const { error } = await supabase
        .from('tasks')
        .update({ status: newStatus })
        .eq('id', task.id);

      if (error) {
        setTasks(prev =>
          prev.map(t =>
            t.id === task.id ? { ...t, status: task.status } : t
          )
        );
        console.error('Error updating task status:', error);
      }
    } catch (error) {
      setTasks(prev =>
        prev.map(t =>
          t.id === task.id ? { ...t, status: task.status } : t
        )
      );
    }
  };

  const openCompleteModal = (task: Task) => {
    setCompletingTask(task);
    setCompletionNotes(task.completion_notes || '');
    setShowCompleteModal(true);
  };

  const handleComplete = async () => {
    if (!completingTask) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('tasks')
        .update({
          status: 'completed',
          completion_notes: completionNotes || null,
        })
        .eq('id', completingTask.id);

      if (error) throw error;

      setShowCompleteModal(false);
      setCompletingTask(null);
      fetchData();
    } catch (error) {
      console.error('Error completing task:', error);
    } finally {
      setSaving(false);
    }
  };

  const deleteTask = async (taskId: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return;

    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId);

      if (error) throw error;

      setTasks(prev => prev.filter(t => t.id !== taskId));
      setShowDetailModal(false);
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const isOverdue = (task: Task) => {
    if (!task.due_date || task.status === 'completed' || task.status === 'cancelled') return false;
    return new Date(task.due_date) < new Date();
  };

  if (loading) {
    return (
      <div className="min-h-full bg-[#0f0f12] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-[#f59e0b] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[#6b6b7a]">Loading tasks...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-[#0f0f12] relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-grid-pattern opacity-50" />
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#f59e0b] rounded-full blur-[200px] opacity-[0.03]" />

      <div className="relative z-10 p-4 sm:p-6 lg:p-10 max-w-[1600px] mx-auto">
        {/* Header */}
        <header className="mb-6 opacity-0 animate-[fadeSlideIn_0.5s_ease-out_forwards]">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#f59e0b] to-[#d97706] flex items-center justify-center shadow-lg shadow-[#f59e0b]/20">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white">
                  {canCreateTasks ? 'Manage Tasks' : 'My Tasks'}
                </h1>
                <p className="text-[#6b6b7a] text-sm">
                  {permissions?.can_manage_all
                    ? 'Manage tasks across all departments'
                    : permissions?.is_department_head
                    ? `Manage ${permissions.department_name} tasks`
                    : 'View and complete your assigned tasks'}
                </p>
              </div>
            </div>

            {/* Create Task Button */}
            {canCreateTasks && (
              <button
                onClick={openCreateModal}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-[#f59e0b] hover:bg-[#d97706] text-white rounded-xl transition-colors font-medium shadow-lg shadow-[#f59e0b]/20"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span>New Task</span>
              </button>
            )}
          </div>
        </header>

        {/* Department Filter (for admins) */}
        {permissions?.can_manage_all && (
          <div className="mb-4 opacity-0 animate-[fadeSlideIn_0.5s_ease-out_forwards]" style={{ animationDelay: '50ms' }}>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setFilterDepartment('')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  !filterDepartment
                    ? 'bg-[#f59e0b] text-white'
                    : 'bg-[#1f1f28] text-[#6b6b7a] hover:text-white'
                }`}
              >
                All Departments
              </button>
              {departments.map((dept) => (
                <button
                  key={dept.id}
                  onClick={() => setFilterDepartment(dept.id)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    filterDepartment === dept.id
                      ? 'text-white'
                      : 'bg-[#1f1f28] text-[#6b6b7a] hover:text-white'
                  }`}
                  style={filterDepartment === dept.id ? { backgroundColor: dept.color } : undefined}
                >
                  {dept.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6 opacity-0 animate-[fadeSlideIn_0.5s_ease-out_forwards]" style={{ animationDelay: '100ms' }}>
          <div
            onClick={() => setActiveTab('pending')}
            className={`bg-[#141418] border rounded-xl p-4 cursor-pointer transition-all ${
              activeTab === 'pending' ? 'border-[#6b7280] ring-2 ring-[#6b7280]/20' : 'border-[#1f1f28] hover:border-[#2a2a38]'
            }`}
          >
            <p className="text-2xl sm:text-3xl font-bold text-white">{stats.pending}</p>
            <p className="text-xs sm:text-sm text-[#6b6b7a]">Pending</p>
          </div>
          <div
            onClick={() => setActiveTab('in_progress')}
            className={`bg-[#141418] border rounded-xl p-4 cursor-pointer transition-all ${
              activeTab === 'in_progress' ? 'border-[#3b82f6] ring-2 ring-[#3b82f6]/20' : 'border-[#1f1f28] hover:border-[#2a2a38]'
            }`}
          >
            <p className="text-2xl sm:text-3xl font-bold text-[#3b82f6]">{stats.in_progress}</p>
            <p className="text-xs sm:text-sm text-[#6b6b7a]">In Progress</p>
          </div>
          <div
            onClick={() => setActiveTab('completed')}
            className={`bg-[#141418] border rounded-xl p-4 cursor-pointer transition-all ${
              activeTab === 'completed' ? 'border-[#10b981] ring-2 ring-[#10b981]/20' : 'border-[#1f1f28] hover:border-[#2a2a38]'
            }`}
          >
            <p className="text-2xl sm:text-3xl font-bold text-[#10b981]">{stats.completed}</p>
            <p className="text-xs sm:text-sm text-[#6b6b7a]">Completed</p>
          </div>
          <div
            onClick={() => setActiveTab('all')}
            className={`bg-[#141418] border rounded-xl p-4 cursor-pointer transition-all ${
              activeTab === 'all' ? 'border-[#f59e0b] ring-2 ring-[#f59e0b]/20' : 'border-[#1f1f28] hover:border-[#2a2a38]'
            }`}
          >
            <p className="text-2xl sm:text-3xl font-bold text-[#f59e0b]">{stats.total}</p>
            <p className="text-xs sm:text-sm text-[#6b6b7a]">Total</p>
          </div>
        </div>

        {/* Task List */}
        <div className="space-y-3 opacity-0 animate-[fadeSlideIn_0.5s_ease-out_forwards]" style={{ animationDelay: '200ms' }}>
          {filteredTasks.length === 0 ? (
            <div className="text-center py-16 bg-[#141418] border border-[#1f1f28] rounded-2xl">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#1a1a1f] flex items-center justify-center">
                <svg className="w-8 h-8 text-[#3a3a48]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <p className="text-[#6b6b7a] mb-2">No tasks found</p>
              <p className="text-[#4a4a58] text-sm">
                {canCreateTasks ? 'Create a new task to get started' : 'No tasks have been assigned to you yet'}
              </p>
            </div>
          ) : (
            filteredTasks.map((task, index) => (
              <div
                key={task.id}
                onClick={() => {
                  setSelectedTask(task);
                  setShowDetailModal(true);
                }}
                className={`bg-[#141418] border border-[#1f1f28] rounded-xl p-4 cursor-pointer hover:border-[#2a2a38] transition-all opacity-0 animate-[fadeSlideIn_0.3s_ease-out_forwards] ${
                  isOverdue(task) ? 'border-l-4 border-l-[#ef4444]' : ''
                }`}
                style={{ animationDelay: `${250 + index * 50}ms` }}
              >
                <div className="flex items-start gap-3">
                  {/* Status indicator */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (task.status === 'pending') {
                        updateTaskStatus(task, 'in_progress');
                      } else if (task.status === 'in_progress') {
                        openCompleteModal(task);
                      }
                    }}
                    className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                      task.status === 'completed'
                        ? 'bg-[#10b981]/20 text-[#10b981]'
                        : task.status === 'in_progress'
                        ? 'bg-[#3b82f6]/20 text-[#3b82f6] hover:bg-[#3b82f6]/30'
                        : 'bg-[#1f1f28] text-[#6b6b7a] hover:bg-[#2a2a38] hover:text-white'
                    }`}
                  >
                    {task.status === 'completed' ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : task.status === 'in_progress' ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    )}
                  </button>

                  {/* Task content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <h3 className={`font-medium text-white ${task.status === 'completed' ? 'line-through opacity-60' : ''}`}>
                        {task.title}
                      </h3>
                      <div className="flex items-center gap-2">
                        {task.department_name && (
                          <span
                            className="px-2 py-0.5 rounded-full text-xs font-medium"
                            style={{
                              backgroundColor: `${task.department_color}20`,
                              color: task.department_color,
                            }}
                          >
                            {task.department_name}
                          </span>
                        )}
                        <span
                          className="px-2 py-0.5 rounded-full text-xs font-medium"
                          style={{
                            backgroundColor: priorityConfig[task.priority].bg,
                            color: priorityConfig[task.priority].color,
                          }}
                        >
                          {priorityConfig[task.priority].label}
                        </span>
                      </div>
                    </div>

                    {task.description && (
                      <p className="text-sm text-[#6b6b7a] mt-1 line-clamp-2">{task.description}</p>
                    )}

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-[#6b6b7a]">
                      {task.location && (
                        <span className="flex items-center gap-1">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          </svg>
                          {task.location}
                        </span>
                      )}
                      {task.due_date && (
                        <span className={`flex items-center gap-1 ${isOverdue(task) ? 'text-[#ef4444]' : ''}`}>
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          {formatDate(task.due_date)}
                          {isOverdue(task) && ' (Overdue)'}
                        </span>
                      )}
                    </div>
                  </div>

                  <svg className="w-5 h-5 text-[#3a3a48] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Create/Edit Task Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center z-50">
          <div className="bg-[#141418] border border-[#2a2a35] sm:rounded-2xl rounded-t-2xl shadow-2xl w-full sm:max-w-lg max-h-[90vh] overflow-hidden">
            <div className="px-4 sm:px-6 py-4 border-b border-[#2a2a35] flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">
                {editingTask ? 'Edit Task' : 'New Task'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 text-[#6b6b7a] hover:text-white hover:bg-[#1f1f28] rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-4 sm:p-6 space-y-4 overflow-y-auto max-h-[calc(90vh-140px)]">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-[#8b8b9a] mb-2">Title *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="What needs to be done?"
                  className="w-full px-4 py-3 bg-[#1a1a1f] border border-[#2a2a35] rounded-xl text-white placeholder-[#4a4a58] focus:outline-none focus:border-[#f59e0b]/50"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-[#8b8b9a] mb-2">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Add more details..."
                  rows={3}
                  className="w-full px-4 py-3 bg-[#1a1a1f] border border-[#2a2a35] rounded-xl text-white placeholder-[#4a4a58] focus:outline-none focus:border-[#f59e0b]/50 resize-none"
                />
              </div>

              {/* Department (only for admins) */}
              {permissions?.can_manage_all && (
                <div>
                  <label className="block text-sm font-medium text-[#8b8b9a] mb-2">Department</label>
                  <select
                    value={formData.department_id}
                    onChange={(e) => setFormData({ ...formData, department_id: e.target.value, assigned_to: '' })}
                    className="w-full px-4 py-3 bg-[#1a1a1f] border border-[#2a2a35] rounded-xl text-white focus:outline-none focus:border-[#f59e0b]/50 appearance-none cursor-pointer"
                    style={{
                      backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b6b7a' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                      backgroundPosition: 'right 0.75rem center',
                      backgroundRepeat: 'no-repeat',
                      backgroundSize: '1.5em 1.5em',
                      paddingRight: '2.5rem',
                    }}
                  >
                    <option value="">Select Department</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Priority & Assign To */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#8b8b9a] mb-2">Priority</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value as Task['priority'] })}
                    className="w-full px-4 py-3 bg-[#1a1a1f] border border-[#2a2a35] rounded-xl text-white focus:outline-none focus:border-[#f59e0b]/50 appearance-none cursor-pointer"
                    style={{
                      backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b6b7a' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                      backgroundPosition: 'right 0.75rem center',
                      backgroundRepeat: 'no-repeat',
                      backgroundSize: '1.5em 1.5em',
                      paddingRight: '2.5rem',
                    }}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#8b8b9a] mb-2">Assign To</label>
                  <select
                    value={formData.assigned_to}
                    onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
                    className="w-full px-4 py-3 bg-[#1a1a1f] border border-[#2a2a35] rounded-xl text-white focus:outline-none focus:border-[#f59e0b]/50 appearance-none cursor-pointer"
                    style={{
                      backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b6b7a' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                      backgroundPosition: 'right 0.75rem center',
                      backgroundRepeat: 'no-repeat',
                      backgroundSize: '1.5em 1.5em',
                      paddingRight: '2.5rem',
                    }}
                  >
                    <option value="">Unassigned</option>
                    {filteredAssignableUsers.map((u) => (
                      <option key={u.user_id} value={u.user_id}>
                        {u.full_name} ({u.role_name})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Due Date & Location */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#8b8b9a] mb-2">Due Date</label>
                  <input
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                    className="w-full px-4 py-3 bg-[#1a1a1f] border border-[#2a2a35] rounded-xl text-white focus:outline-none focus:border-[#f59e0b]/50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#8b8b9a] mb-2">Location</label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="Where?"
                    className="w-full px-4 py-3 bg-[#1a1a1f] border border-[#2a2a35] rounded-xl text-white placeholder-[#4a4a58] focus:outline-none focus:border-[#f59e0b]/50"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-[#8b8b9a] mb-2">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Additional notes..."
                  rows={2}
                  className="w-full px-4 py-3 bg-[#1a1a1f] border border-[#2a2a35] rounded-xl text-white placeholder-[#4a4a58] focus:outline-none focus:border-[#f59e0b]/50 resize-none"
                />
              </div>
            </div>

            <div className="px-4 sm:px-6 py-4 border-t border-[#2a2a35] flex gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-3 bg-[#1f1f28] hover:bg-[#2a2a38] text-white rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !formData.title.trim()}
                className="flex-1 px-4 py-3 bg-[#f59e0b] hover:bg-[#d97706] text-white rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Saving...
                  </>
                ) : (
                  editingTask ? 'Update Task' : 'Create Task'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Complete Task Modal */}
      {showCompleteModal && completingTask && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center z-50">
          <div className="bg-[#141418] border border-[#2a2a35] sm:rounded-2xl rounded-t-2xl shadow-2xl w-full sm:max-w-md">
            <div className="px-4 sm:px-6 py-4 border-b border-[#2a2a35]">
              <h2 className="text-lg font-bold text-white">Complete Task</h2>
              <p className="text-sm text-[#6b6b7a] mt-1">{completingTask.title}</p>
            </div>

            <div className="p-4 sm:p-6">
              <label className="block text-sm font-medium text-[#8b8b9a] mb-2">
                Completion Notes (optional)
              </label>
              <textarea
                value={completionNotes}
                onChange={(e) => setCompletionNotes(e.target.value)}
                placeholder="Add any notes about how the task was completed..."
                rows={4}
                className="w-full px-4 py-3 bg-[#1a1a1f] border border-[#2a2a35] rounded-xl text-white placeholder-[#4a4a58] focus:outline-none focus:border-[#10b981]/50 resize-none"
              />
            </div>

            <div className="px-4 sm:px-6 py-4 border-t border-[#2a2a35] flex gap-3">
              <button
                onClick={() => {
                  setShowCompleteModal(false);
                  setCompletingTask(null);
                }}
                className="flex-1 px-4 py-3 bg-[#1f1f28] hover:bg-[#2a2a38] text-white rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleComplete}
                disabled={saving}
                className="flex-1 px-4 py-3 bg-[#10b981] hover:bg-[#059669] text-white rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Completing...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Mark Complete
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Task Detail Modal */}
      {showDetailModal && selectedTask && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center z-50">
          <div className="bg-[#141418] border border-[#2a2a35] sm:rounded-2xl rounded-t-2xl shadow-2xl w-full sm:max-w-lg max-h-[90vh] overflow-hidden">
            <div className="px-4 sm:px-6 py-4 border-b border-[#2a2a35] flex items-center justify-between">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className="px-2.5 py-1 rounded-lg text-xs font-medium"
                  style={{
                    backgroundColor: statusConfig[selectedTask.status].bg,
                    color: statusConfig[selectedTask.status].color,
                  }}
                >
                  {statusConfig[selectedTask.status].label}
                </span>
                <span
                  className="px-2.5 py-1 rounded-lg text-xs font-medium"
                  style={{
                    backgroundColor: priorityConfig[selectedTask.priority].bg,
                    color: priorityConfig[selectedTask.priority].color,
                  }}
                >
                  {priorityConfig[selectedTask.priority].label}
                </span>
                {selectedTask.department_name && (
                  <span
                    className="px-2.5 py-1 rounded-lg text-xs font-medium"
                    style={{
                      backgroundColor: `${selectedTask.department_color}20`,
                      color: selectedTask.department_color,
                    }}
                  >
                    {selectedTask.department_name}
                  </span>
                )}
              </div>
              <button
                onClick={() => setShowDetailModal(false)}
                className="p-2 text-[#6b6b7a] hover:text-white hover:bg-[#1f1f28] rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
              <h2 className="text-xl font-bold text-white mb-2">{selectedTask.title}</h2>

              {selectedTask.description && (
                <p className="text-[#8b8b9a] mb-4">{selectedTask.description}</p>
              )}

              <div className="space-y-3 text-sm">
                {selectedTask.location && (
                  <div className="flex items-center gap-3 p-3 bg-[#1a1a1f] rounded-xl">
                    <div className="w-10 h-10 rounded-xl bg-[#2a2a38] flex items-center justify-center">
                      <svg className="w-5 h-5 text-[#6b6b7a]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-[#6b6b7a]">Location</p>
                      <p className="text-white font-medium">{selectedTask.location}</p>
                    </div>
                  </div>
                )}

                {selectedTask.due_date && (
                  <div className={`flex items-center gap-3 p-3 rounded-xl ${isOverdue(selectedTask) ? 'bg-[#ef4444]/10' : 'bg-[#1a1a1f]'}`}>
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isOverdue(selectedTask) ? 'bg-[#ef4444]/20' : 'bg-[#2a2a38]'}`}>
                      <svg className={`w-5 h-5 ${isOverdue(selectedTask) ? 'text-[#ef4444]' : 'text-[#6b6b7a]'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-[#6b6b7a]">Due date</p>
                      <p className={`font-medium ${isOverdue(selectedTask) ? 'text-[#ef4444]' : 'text-white'}`}>
                        {formatDate(selectedTask.due_date)}
                        {isOverdue(selectedTask) && ' (Overdue)'}
                      </p>
                    </div>
                  </div>
                )}

                {selectedTask.notes && (
                  <div className="p-3 bg-[#1a1a1f] rounded-xl">
                    <p className="text-[#6b6b7a] mb-1">Notes</p>
                    <p className="text-white">{selectedTask.notes}</p>
                  </div>
                )}

                {selectedTask.completion_notes && (
                  <div className="p-3 bg-[#10b981]/10 border border-[#10b981]/20 rounded-xl">
                    <p className="text-[#10b981] mb-1">Completion Notes</p>
                    <p className="text-white">{selectedTask.completion_notes}</p>
                  </div>
                )}

                <div className="pt-3 border-t border-[#2a2a35] text-xs text-[#4a4a58]">
                  <p>Created {formatDate(selectedTask.created_at)}</p>
                  {selectedTask.completed_at && (
                    <p>Completed {formatDate(selectedTask.completed_at)}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="px-4 sm:px-6 py-4 border-t border-[#2a2a35] flex flex-wrap gap-2">
              {selectedTask.status === 'pending' && (
                <button
                  onClick={() => {
                    updateTaskStatus(selectedTask, 'in_progress');
                    setShowDetailModal(false);
                  }}
                  className="flex-1 px-4 py-3 bg-[#3b82f6] hover:bg-[#2563eb] text-white rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  </svg>
                  Start Task
                </button>
              )}

              {selectedTask.status === 'in_progress' && (
                <button
                  onClick={() => {
                    setShowDetailModal(false);
                    openCompleteModal(selectedTask);
                  }}
                  className="flex-1 px-4 py-3 bg-[#10b981] hover:bg-[#059669] text-white rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Complete
                </button>
              )}

              {canCreateTasks && (
                <>
                  <button
                    onClick={() => {
                      setShowDetailModal(false);
                      openEditModal(selectedTask);
                    }}
                    className="px-4 py-3 bg-[#1f1f28] hover:bg-[#2a2a38] text-white rounded-xl transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => deleteTask(selectedTask.id)}
                    className="px-4 py-3 bg-[#ef4444]/10 hover:bg-[#ef4444]/20 text-[#ef4444] rounded-xl transition-colors"
                  >
                    Delete
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
