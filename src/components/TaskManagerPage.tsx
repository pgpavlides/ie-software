import { useEffect, useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiRefreshCw,
  FiPlus,
  FiSearch,
  FiChevronDown,
  FiEdit2,
  FiTrash2,
  FiX,
  FiAlertTriangle,
  FiMapPin,
  FiCalendar,
  FiUser,
  FiCheckCircle,
  FiPlay,
  FiPause,
  FiPaperclip,
  FiImage,
} from 'react-icons/fi';
import supabase from '../lib/supabase';
import { useAuthStore } from '../store/authStore';

// Types
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
  // Enriched
  assignee_name?: string;
  assignee_email?: string;
  department_name?: string;
  department_color?: string;
  assigner_name?: string;
  attachments?: TaskAttachment[];
}

interface TaskAttachment {
  id: string;
  task_id: string;
  file_name: string;
  file_path: string;
  file_type: string | null;
  file_size: number | null;
  uploaded_by: string | null;
  uploaded_at: string;
}

// Config
const priorityConfig = {
  low: { color: '#6b7280', label: 'Low', bg: 'rgba(107, 114, 128, 0.15)' },
  medium: { color: '#3b82f6', label: 'Medium', bg: 'rgba(59, 130, 246, 0.15)' },
  high: { color: '#f59e0b', label: 'High', bg: 'rgba(245, 158, 11, 0.15)' },
  urgent: { color: '#ef4444', label: 'Urgent', bg: 'rgba(239, 68, 68, 0.15)' },
};

const statusConfig = {
  pending: { color: '#6b7280', label: 'Pending', bg: 'rgba(107, 114, 128, 0.15)' },
  in_progress: { color: '#3b82f6', label: 'In Progress', bg: 'rgba(59, 130, 246, 0.15)' },
  completed: { color: '#10b981', label: 'Completed', bg: 'rgba(16, 185, 129, 0.15)' },
  cancelled: { color: '#ef4444', label: 'Cancelled', bg: 'rgba(239, 68, 68, 0.15)' },
};

export default function TaskManagerPage() {
  const { user } = useAuthStore();

  // Data states
  const [tasks, setTasks] = useState<Task[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [assignableUsers, setAssignableUsers] = useState<AssignableUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filter states
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterPriority, setFilterPriority] = useState<string>('');
  const [filterDepartment, setFilterDepartment] = useState<string>('');
  const [filterAssignee, setFilterAssignee] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  // Form state
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
  const [_completionNotes, setCompletionNotes] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);

  // Fetch all data
  const fetchData = useCallback(async () => {
    try {
      // Fetch departments
      const { data: deptData } = await supabase
        .from('departments')
        .select('id, name, icon, color')
        .eq('is_active', true)
        .order('display_order');
      if (deptData) setDepartments(deptData);

      // Fetch all assignable users
      const { data: usersData } = await supabase.rpc('get_all_assignable_users');
      if (usersData) setAssignableUsers(usersData);

      // Fetch all tasks
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false });

      if (tasksError) throw tasksError;

      // Enrich tasks with user and department info
      if (tasksData && deptData && usersData) {
        const deptMap = new Map<string, Department>(deptData.map((d: Department) => [d.id, d]));
        const userMap = new Map<string, AssignableUser>(usersData.map((u: AssignableUser) => [u.user_id, u]));

        // Get assigner names
        const assignerIds = [...new Set(tasksData.map((t: Task) => t.assigned_by).filter(Boolean))];
        let assignerMap = new Map<string, string>();

        if (assignerIds.length > 0) {
          const { data: assignerData } = await supabase.rpc('get_users_display_info', {
            user_ids: assignerIds
          });
          if (assignerData) {
            assignerMap = new Map(assignerData.map((u: { id: string; full_name: string }) => [u.id, u.full_name]));
          }
        }

        const enrichedTasks = tasksData.map((t: Task) => {
          const dept = t.department_id ? deptMap.get(t.department_id) : null;
          const assignee: AssignableUser | undefined = t.assigned_to ? userMap.get(t.assigned_to) : undefined;
          return {
            ...t,
            department_name: dept?.name,
            department_color: dept?.color,
            assignee_name: assignee?.full_name,
            assignee_email: assignee?.email,
            assigner_name: t.assigned_by ? assignerMap.get(t.assigned_by) : undefined,
          };
        });

        setTasks(enrichedTasks);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
  };

  // Filtered tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      if (filterStatus && task.status !== filterStatus) return false;
      if (filterPriority && task.priority !== filterPriority) return false;
      if (filterDepartment && task.department_id !== filterDepartment) return false;
      if (filterAssignee && task.assigned_to !== filterAssignee) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          task.title.toLowerCase().includes(query) ||
          task.description?.toLowerCase().includes(query) ||
          task.assignee_name?.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [tasks, filterStatus, filterPriority, filterDepartment, filterAssignee, searchQuery]);

  // Stats
  const stats = useMemo(() => ({
    pending: tasks.filter(t => t.status === 'pending').length,
    in_progress: tasks.filter(t => t.status === 'in_progress').length,
    completed: tasks.filter(t => t.status === 'completed').length,
    total: tasks.length,
  }), [tasks]);

  // Filter assignable users by department
  const filteredAssignableUsers = useMemo(() => {
    if (!formData.department_id) return assignableUsers;
    return assignableUsers.filter(u => u.department_id === formData.department_id);
  }, [assignableUsers, formData.department_id]);

  // Helpers
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const isOverdue = (task: Task) => {
    if (!task.due_date || task.status === 'completed' || task.status === 'cancelled') return false;
    return new Date(task.due_date) < new Date();
  };

  // Modal handlers
  const openCreateModal = () => {
    setEditingTask(null);
    setFormData({
      title: '',
      description: '',
      priority: 'medium',
      department_id: '',
      assigned_to: '',
      due_date: '',
      location: '',
      notes: '',
    });
    setShowCreateModal(true);
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
    setShowCreateModal(true);
  };

  const openDetailModal = (task: Task) => {
    setSelectedTask(task);
    setCompletionNotes(task.completion_notes || '');
    setShowDetailModal(true);
  };

  const openDeleteModal = (task: Task) => {
    setSelectedTask(task);
    setShowDeleteModal(true);
  };

  // CRUD operations
  const handleSave = async () => {
    if (!formData.title.trim()) return;

    setSaving(true);
    try {
      let taskId = editingTask?.id;

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
        const { data, error } = await supabase
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
          })
          .select('id')
          .single();

        if (error) throw error;
        taskId = data?.id;
      }

      // Upload attachments if any
      if (selectedFiles.length > 0 && taskId) {
        setUploadingFiles(true);
        for (const file of selectedFiles) {
          const fileExt = file.name.split('.').pop();
          const fileName = `${taskId}/${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;

          // Upload to storage
          const { error: uploadError } = await supabase.storage
            .from('task-attachments')
            .upload(fileName, file);

          if (uploadError) {
            console.error('Upload error:', uploadError);
            continue;
          }

          // Get public URL
          const { data: urlData } = supabase.storage
            .from('task-attachments')
            .getPublicUrl(fileName);

          // Insert attachment record
          await supabase.from('task_attachments').insert({
            task_id: taskId,
            file_name: file.name,
            file_path: urlData.publicUrl,
            file_type: file.type,
            file_size: file.size,
            uploaded_by: user?.id,
          });
        }
        setUploadingFiles(false);
      }

      setShowCreateModal(false);
      setSelectedFiles([]);
      fetchData();
    } catch (error) {
      console.error('Error saving task:', error);
    } finally {
      setSaving(false);
    }
  };

  const updateTaskStatus = async (task: Task, newStatus: Task['status'], notes?: string) => {
    try {
      const updateData: Record<string, unknown> = { status: newStatus };
      if (newStatus === 'completed') {
        updateData.completed_at = new Date().toISOString();
        if (notes) updateData.completion_notes = notes;
      }

      const { error } = await supabase
        .from('tasks')
        .update(updateData)
        .eq('id', task.id);

      if (error) throw error;

      setTasks(prev =>
        prev.map(t =>
          t.id === task.id
            ? { ...t, status: newStatus, ...(newStatus === 'completed' ? { completed_at: new Date().toISOString(), completion_notes: notes } : {}) }
            : t
        )
      );
    } catch (error) {
      console.error('Error updating task status:', error);
    }
  };

  const handleDelete = async () => {
    if (!selectedTask) return;

    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', selectedTask.id);

      if (error) throw error;

      setTasks(prev => prev.filter(t => t.id !== selectedTask.id));
      setShowDeleteModal(false);
      setShowDetailModal(false);
      setSelectedTask(null);
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  };

  // Loading state
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
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[#f59e0b] rounded-full blur-[250px] opacity-[0.03]" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-[#3b82f6] rounded-full blur-[200px] opacity-[0.02]" />

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
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">
                  Task Manager
                </h1>
                <p className="text-[#6b6b7a] text-sm mt-0.5">
                  Manage and monitor all tasks across departments
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
                onClick={openCreateModal}
                className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-[#f59e0b] to-[#d97706] text-white rounded-xl font-medium shadow-lg shadow-[#f59e0b]/25 hover:shadow-[#f59e0b]/40 transition-all"
              >
                <FiPlus className="w-5 h-5" />
                <span>New Task</span>
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
            { label: 'Pending', value: stats.pending, color: '#6b7280', gradient: 'from-[#6b7280] to-[#4b5563]' },
            { label: 'In Progress', value: stats.in_progress, color: '#3b82f6', gradient: 'from-[#3b82f6] to-[#2563eb]' },
            { label: 'Completed', value: stats.completed, color: '#10b981', gradient: 'from-[#10b981] to-[#059669]' },
            { label: 'Total', value: stats.total, color: '#f59e0b', gradient: 'from-[#f59e0b] to-[#d97706]' },
          ].map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: 0.15 + index * 0.05 }}
              className="relative bg-[#141418] border border-[#1f1f28] rounded-2xl p-4 lg:p-5 overflow-hidden group hover:border-[#2a2a35] transition-colors"
            >
              <div className={`absolute top-0 left-0 w-1 h-full bg-gradient-to-b ${stat.gradient}`} />
              <p className="text-3xl lg:text-4xl font-bold text-white mb-1" style={{ color: stat.color }}>
                {stat.value}
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
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-[#1a1a23] border border-[#2a2a35] rounded-xl text-white text-sm placeholder-[#4a4a58] focus:outline-none focus:border-[#f59e0b]/50 transition-colors"
              />
            </div>

            {/* Status Filter */}
            <div className="relative">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="appearance-none pl-4 pr-10 py-2.5 bg-[#1a1a23] border border-[#2a2a35] rounded-xl text-white text-sm focus:outline-none focus:border-[#f59e0b]/50 cursor-pointer transition-colors"
              >
                <option value="">All Status</option>
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
              <FiChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6b6b7a] pointer-events-none" />
            </div>

            {/* Priority Filter */}
            <div className="relative">
              <select
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value)}
                className="appearance-none pl-4 pr-10 py-2.5 bg-[#1a1a23] border border-[#2a2a35] rounded-xl text-white text-sm focus:outline-none focus:border-[#f59e0b]/50 cursor-pointer transition-colors"
              >
                <option value="">All Priority</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
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
                  <option key={dept.id} value={dept.id}>{dept.name}</option>
                ))}
              </select>
              <FiChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6b6b7a] pointer-events-none" />
            </div>

            {/* Assignee Filter */}
            <div className="relative">
              <select
                value={filterAssignee}
                onChange={(e) => setFilterAssignee(e.target.value)}
                className="appearance-none pl-4 pr-10 py-2.5 bg-[#1a1a23] border border-[#2a2a35] rounded-xl text-white text-sm focus:outline-none focus:border-[#f59e0b]/50 cursor-pointer transition-colors"
              >
                <option value="">All Assignees</option>
                {assignableUsers.map((u) => (
                  <option key={u.user_id} value={u.user_id}>{u.full_name}</option>
                ))}
              </select>
              <FiChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6b6b7a] pointer-events-none" />
            </div>
          </div>
        </motion.div>

        {/* Tasks Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="bg-[#141418] border border-[#1f1f28] rounded-2xl overflow-hidden"
        >
          {/* Desktop Table */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#1f1f28]">
                  <th className="px-6 py-4 text-left text-xs font-semibold text-[#6b6b7a] uppercase tracking-wider">Task</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-[#6b6b7a] uppercase tracking-wider">Department</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-[#6b6b7a] uppercase tracking-wider">Assignee</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-[#6b6b7a] uppercase tracking-wider">Priority</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-[#6b6b7a] uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-[#6b6b7a] uppercase tracking-wider">Due Date</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-[#6b6b7a] uppercase tracking-wider">Created</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-[#6b6b7a] uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1f1f28]">
                {filteredTasks.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-16 text-center">
                      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#1a1a23] flex items-center justify-center">
                        <svg className="w-8 h-8 text-[#3a3a48]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                      </div>
                      <p className="text-[#6b6b7a] mb-1">No tasks found</p>
                      <p className="text-[#4a4a58] text-sm">Create a new task or adjust your filters</p>
                    </td>
                  </tr>
                ) : (
                  filteredTasks.map((task, index) => (
                    <motion.tr
                      key={task.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.03 }}
                      onClick={() => openDetailModal(task)}
                      className={`cursor-pointer hover:bg-[#1a1a23] transition-colors ${
                        isOverdue(task) ? 'border-l-4 border-l-[#ef4444]' : ''
                      }`}
                    >
                      <td className="px-6 py-4">
                        <div className="max-w-[300px]">
                          <p className={`font-medium text-white truncate ${task.status === 'completed' ? 'line-through opacity-60' : ''}`}>
                            {task.title}
                          </p>
                          {task.description && (
                            <p className="text-sm text-[#6b6b7a] truncate mt-0.5">{task.description}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {task.department_name ? (
                          <span
                            className="px-2.5 py-1 rounded-lg text-xs font-medium"
                            style={{
                              backgroundColor: `${task.department_color}20`,
                              color: task.department_color,
                            }}
                          >
                            {task.department_name}
                          </span>
                        ) : (
                          <span className="text-[#4a4a58]">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {task.assignee_name ? (
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-[#2a2a38] flex items-center justify-center text-xs font-medium text-white">
                              {task.assignee_name.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-sm text-white">{task.assignee_name}</span>
                          </div>
                        ) : (
                          <span className="text-[#4a4a58]">Unassigned</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className="px-2.5 py-1 rounded-lg text-xs font-medium"
                          style={{
                            backgroundColor: priorityConfig[task.priority].bg,
                            color: priorityConfig[task.priority].color,
                          }}
                        >
                          {priorityConfig[task.priority].label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className="px-2.5 py-1 rounded-lg text-xs font-medium"
                          style={{
                            backgroundColor: statusConfig[task.status].bg,
                            color: statusConfig[task.status].color,
                          }}
                        >
                          {statusConfig[task.status].label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {task.due_date ? (
                          <span className={`text-sm ${isOverdue(task) ? 'text-[#ef4444] font-medium' : 'text-[#8b8b9a]'}`}>
                            {formatDate(task.due_date)}
                            {isOverdue(task) && ' (Overdue)'}
                          </span>
                        ) : (
                          <span className="text-[#4a4a58]">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-[#6b6b7a]">{formatDate(task.created_at)}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                          {/* Quick status change */}
                          <select
                            value={task.status}
                            onChange={(e) => updateTaskStatus(task, e.target.value as Task['status'])}
                            className="appearance-none px-2 py-1.5 bg-[#1a1a23] border border-[#2a2a35] rounded-lg text-xs text-white focus:outline-none focus:border-[#f59e0b]/50 cursor-pointer"
                            style={{ minWidth: '100px' }}
                          >
                            <option value="pending">Pending</option>
                            <option value="in_progress">In Progress</option>
                            <option value="completed">Completed</option>
                            <option value="cancelled">Cancelled</option>
                          </select>

                          <button
                            onClick={() => openEditModal(task)}
                            className="p-2 text-[#6b6b7a] hover:text-[#f59e0b] hover:bg-[#f59e0b]/10 rounded-lg transition-colors"
                          >
                            <FiEdit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openDeleteModal(task)}
                            className="p-2 text-[#6b6b7a] hover:text-[#ef4444] hover:bg-[#ef4444]/10 rounded-lg transition-colors"
                          >
                            <FiTrash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="lg:hidden divide-y divide-[#1f1f28]">
            {filteredTasks.length === 0 ? (
              <div className="px-6 py-16 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#1a1a23] flex items-center justify-center">
                  <svg className="w-8 h-8 text-[#3a3a48]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <p className="text-[#6b6b7a] mb-1">No tasks found</p>
                <p className="text-[#4a4a58] text-sm">Create a new task or adjust your filters</p>
              </div>
            ) : (
              filteredTasks.map((task, index) => (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.03 }}
                  onClick={() => openDetailModal(task)}
                  className={`p-4 cursor-pointer hover:bg-[#1a1a23] transition-colors ${
                    isOverdue(task) ? 'border-l-4 border-l-[#ef4444]' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className={`font-medium text-white ${task.status === 'completed' ? 'line-through opacity-60' : ''}`}>
                        {task.title}
                      </h3>
                      {task.description && (
                        <p className="text-sm text-[#6b6b7a] mt-1 line-clamp-2">{task.description}</p>
                      )}
                    </div>
                    <span
                      className="px-2 py-1 rounded-lg text-xs font-medium shrink-0"
                      style={{
                        backgroundColor: priorityConfig[task.priority].bg,
                        color: priorityConfig[task.priority].color,
                      }}
                    >
                      {priorityConfig[task.priority].label}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className="px-2 py-1 rounded-lg text-xs font-medium"
                      style={{
                        backgroundColor: statusConfig[task.status].bg,
                        color: statusConfig[task.status].color,
                      }}
                    >
                      {statusConfig[task.status].label}
                    </span>
                    {task.department_name && (
                      <span
                        className="px-2 py-1 rounded-lg text-xs font-medium"
                        style={{
                          backgroundColor: `${task.department_color}20`,
                          color: task.department_color,
                        }}
                      >
                        {task.department_name}
                      </span>
                    )}
                    {task.due_date && (
                      <span className={`text-xs ${isOverdue(task) ? 'text-[#ef4444]' : 'text-[#6b6b7a]'}`}>
                        Due: {formatDate(task.due_date)}
                      </span>
                    )}
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </motion.div>

        {/* Results count */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mt-4 text-center text-sm text-[#4a4a58]"
        >
          Showing {filteredTasks.length} of {tasks.length} tasks
        </motion.div>
      </div>

      {/* Create/Edit Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-4"
            onClick={() => setShowCreateModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2 }}
              className="bg-[#141418] border border-[#2a2a35] rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-6 py-4 border-b border-[#2a2a35] flex items-center justify-between">
                <h2 className="text-lg font-bold text-white">
                  {editingTask ? 'Edit Task' : 'Create New Task'}
                </h2>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="p-2 text-[#6b6b7a] hover:text-white hover:bg-[#1f1f28] rounded-lg transition-colors"
                >
                  <FiX className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4 overflow-y-auto max-h-[calc(90vh-140px)]">
                {/* Title */}
                <div>
                  <label className="block text-sm font-medium text-[#8b8b9a] mb-2">Title *</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="What needs to be done?"
                    className="w-full px-4 py-3 bg-[#1a1a23] border border-[#2a2a35] rounded-xl text-white placeholder-[#4a4a58] focus:outline-none focus:border-[#f59e0b]/50 transition-colors"
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
                    className="w-full px-4 py-3 bg-[#1a1a23] border border-[#2a2a35] rounded-xl text-white placeholder-[#4a4a58] focus:outline-none focus:border-[#f59e0b]/50 resize-none transition-colors"
                  />
                </div>

                {/* Department & Priority */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#8b8b9a] mb-2">Department</label>
                    <div className="relative">
                      <select
                        value={formData.department_id}
                        onChange={(e) => setFormData({ ...formData, department_id: e.target.value, assigned_to: '' })}
                        className="w-full appearance-none px-4 py-3 pr-10 bg-[#1a1a23] border border-[#2a2a35] rounded-xl text-white focus:outline-none focus:border-[#f59e0b]/50 cursor-pointer transition-colors"
                      >
                        <option value="">Select...</option>
                        {departments.map((d) => (
                          <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                      </select>
                      <FiChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6b6b7a] pointer-events-none" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#8b8b9a] mb-2">Priority</label>
                    <div className="relative">
                      <select
                        value={formData.priority}
                        onChange={(e) => setFormData({ ...formData, priority: e.target.value as Task['priority'] })}
                        className="w-full appearance-none px-4 py-3 pr-10 bg-[#1a1a23] border border-[#2a2a35] rounded-xl text-white focus:outline-none focus:border-[#f59e0b]/50 cursor-pointer transition-colors"
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="urgent">Urgent</option>
                      </select>
                      <FiChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6b6b7a] pointer-events-none" />
                    </div>
                  </div>
                </div>

                {/* Assignee */}
                <div>
                  <label className="block text-sm font-medium text-[#8b8b9a] mb-2">Assign To</label>
                  <div className="relative">
                    <select
                      value={formData.assigned_to}
                      onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
                      className="w-full appearance-none px-4 py-3 pr-10 bg-[#1a1a23] border border-[#2a2a35] rounded-xl text-white focus:outline-none focus:border-[#f59e0b]/50 cursor-pointer transition-colors"
                    >
                      <option value="">Unassigned</option>
                      {filteredAssignableUsers.map((u) => (
                        <option key={u.user_id} value={u.user_id}>
                          {u.full_name} ({u.role_name})
                        </option>
                      ))}
                    </select>
                    <FiChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6b6b7a] pointer-events-none" />
                  </div>
                </div>

                {/* Due Date & Location */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#8b8b9a] mb-2">Due Date</label>
                    <input
                      type="date"
                      value={formData.due_date}
                      onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                      className="w-full px-4 py-3 bg-[#1a1a23] border border-[#2a2a35] rounded-xl text-white focus:outline-none focus:border-[#f59e0b]/50 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#8b8b9a] mb-2">Location</label>
                    <input
                      type="text"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      placeholder="Where?"
                      className="w-full px-4 py-3 bg-[#1a1a23] border border-[#2a2a35] rounded-xl text-white placeholder-[#4a4a58] focus:outline-none focus:border-[#f59e0b]/50 transition-colors"
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
                    className="w-full px-4 py-3 bg-[#1a1a23] border border-[#2a2a35] rounded-xl text-white placeholder-[#4a4a58] focus:outline-none focus:border-[#f59e0b]/50 resize-none transition-colors"
                  />
                </div>

                {/* Attachments */}
                <div>
                  <label className="block text-sm font-medium text-[#8b8b9a] mb-2">
                    <FiPaperclip className="inline w-4 h-4 mr-1" />
                    Attachments
                  </label>
                  <div className="space-y-3">
                    {/* File Input */}
                    <label className="flex items-center justify-center gap-2 px-4 py-3 bg-[#1a1a23] border border-dashed border-[#2a2a35] rounded-xl cursor-pointer hover:border-[#f59e0b]/50 transition-colors">
                      <FiImage className="w-5 h-5 text-[#6b6b7a]" />
                      <span className="text-[#6b6b7a]">Click to attach images</span>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={(e) => {
                          if (e.target.files) {
                            setSelectedFiles(prev => [...prev, ...Array.from(e.target.files!)]);
                          }
                        }}
                        className="hidden"
                      />
                    </label>

                    {/* Selected Files Preview */}
                    {selectedFiles.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {selectedFiles.map((file, index) => (
                          <div
                            key={index}
                            className="relative group flex items-center gap-2 px-3 py-2 bg-[#1a1a23] border border-[#2a2a35] rounded-lg"
                          >
                            <FiImage className="w-4 h-4 text-[#f59e0b]" />
                            <span className="text-sm text-white max-w-[120px] truncate">{file.name}</span>
                            <button
                              onClick={() => setSelectedFiles(prev => prev.filter((_, i) => i !== index))}
                              className="p-1 text-[#6b6b7a] hover:text-[#ef4444] transition-colors"
                            >
                              <FiX className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="px-6 py-4 border-t border-[#2a2a35] flex gap-3">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-3 bg-[#1f1f28] hover:bg-[#2a2a38] text-white rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || uploadingFiles || !formData.title.trim()}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-[#f59e0b] to-[#d97706] text-white rounded-xl font-medium disabled:opacity-50 flex items-center justify-center gap-2 transition-opacity"
                >
                  {saving || uploadingFiles ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      {uploadingFiles ? 'Uploading...' : 'Saving...'}
                    </>
                  ) : editingTask ? (
                    'Update Task'
                  ) : (
                    'Create Task'
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Task Detail Modal */}
      <AnimatePresence>
        {showDetailModal && selectedTask && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-4"
            onClick={() => setShowDetailModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2 }}
              className="bg-[#141418] border border-[#2a2a35] rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header with badges */}
              <div className="px-6 py-4 border-b border-[#2a2a35]">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className="px-3 py-1 rounded-lg text-xs font-medium"
                      style={{
                        backgroundColor: statusConfig[selectedTask.status].bg,
                        color: statusConfig[selectedTask.status].color,
                      }}
                    >
                      {statusConfig[selectedTask.status].label}
                    </span>
                    <span
                      className="px-3 py-1 rounded-lg text-xs font-medium"
                      style={{
                        backgroundColor: priorityConfig[selectedTask.priority].bg,
                        color: priorityConfig[selectedTask.priority].color,
                      }}
                    >
                      {priorityConfig[selectedTask.priority].label}
                    </span>
                    {selectedTask.department_name && (
                      <span
                        className="px-3 py-1 rounded-lg text-xs font-medium"
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
                    className="p-2 text-[#6b6b7a] hover:text-white hover:bg-[#1f1f28] rounded-lg transition-colors shrink-0"
                  >
                    <FiX className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-220px)]">
                <h2 className={`text-xl font-bold text-white mb-2 ${selectedTask.status === 'completed' ? 'line-through opacity-60' : ''}`}>
                  {selectedTask.title}
                </h2>

                {selectedTask.description && (
                  <p className="text-[#8b8b9a] mb-6">{selectedTask.description}</p>
                )}

                <div className="space-y-3">
                  {/* Assignee */}
                  <div className="flex items-center gap-3 p-3 bg-[#1a1a23] rounded-xl">
                    <div className="w-10 h-10 rounded-xl bg-[#2a2a38] flex items-center justify-center">
                      <FiUser className="w-5 h-5 text-[#6b6b7a]" />
                    </div>
                    <div>
                      <p className="text-xs text-[#6b6b7a]">Assigned to</p>
                      <p className="text-white font-medium">{selectedTask.assignee_name || 'Unassigned'}</p>
                    </div>
                  </div>

                  {/* Location */}
                  {selectedTask.location && (
                    <div className="flex items-center gap-3 p-3 bg-[#1a1a23] rounded-xl">
                      <div className="w-10 h-10 rounded-xl bg-[#2a2a38] flex items-center justify-center">
                        <FiMapPin className="w-5 h-5 text-[#6b6b7a]" />
                      </div>
                      <div>
                        <p className="text-xs text-[#6b6b7a]">Location</p>
                        <p className="text-white font-medium">{selectedTask.location}</p>
                      </div>
                    </div>
                  )}

                  {/* Due Date */}
                  {selectedTask.due_date && (
                    <div className={`flex items-center gap-3 p-3 rounded-xl ${isOverdue(selectedTask) ? 'bg-[#ef4444]/10' : 'bg-[#1a1a23]'}`}>
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isOverdue(selectedTask) ? 'bg-[#ef4444]/20' : 'bg-[#2a2a38]'}`}>
                        <FiCalendar className={`w-5 h-5 ${isOverdue(selectedTask) ? 'text-[#ef4444]' : 'text-[#6b6b7a]'}`} />
                      </div>
                      <div>
                        <p className="text-xs text-[#6b6b7a]">Due date</p>
                        <p className={`font-medium ${isOverdue(selectedTask) ? 'text-[#ef4444]' : 'text-white'}`}>
                          {formatDate(selectedTask.due_date)}
                          {isOverdue(selectedTask) && ' (Overdue)'}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Notes */}
                  {selectedTask.notes && (
                    <div className="p-3 bg-[#1a1a23] rounded-xl">
                      <p className="text-xs text-[#6b6b7a] mb-1">Notes</p>
                      <p className="text-white">{selectedTask.notes}</p>
                    </div>
                  )}

                  {/* Completion notes */}
                  {selectedTask.status === 'completed' && selectedTask.completion_notes && (
                    <div className="p-3 bg-[#10b981]/10 border border-[#10b981]/20 rounded-xl">
                      <p className="text-xs text-[#10b981] mb-1">Completion Notes</p>
                      <p className="text-white">{selectedTask.completion_notes}</p>
                    </div>
                  )}

                  {/* Created info */}
                  <div className="pt-3 border-t border-[#2a2a35] text-xs text-[#4a4a58] space-y-1">
                    <p>Created {formatDateTime(selectedTask.created_at)}</p>
                    {selectedTask.assigner_name && (
                      <p>Assigned by {selectedTask.assigner_name}</p>
                    )}
                    {selectedTask.completed_at && (
                      <p>Completed {formatDateTime(selectedTask.completed_at)}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="px-6 py-4 border-t border-[#2a2a35] flex flex-wrap gap-2">
                {/* Status actions */}
                {selectedTask.status === 'pending' && (
                  <button
                    onClick={() => {
                      updateTaskStatus(selectedTask, 'in_progress');
                      setShowDetailModal(false);
                    }}
                    className="flex-1 px-4 py-3 bg-[#3b82f6] hover:bg-[#2563eb] text-white rounded-xl transition-colors flex items-center justify-center gap-2"
                  >
                    <FiPlay className="w-4 h-4" />
                    Start Task
                  </button>
                )}

                {selectedTask.status === 'in_progress' && (
                  <button
                    onClick={() => {
                      updateTaskStatus(selectedTask, 'completed');
                      setShowDetailModal(false);
                    }}
                    className="flex-1 px-4 py-3 bg-[#10b981] hover:bg-[#059669] text-white rounded-xl transition-colors flex items-center justify-center gap-2"
                  >
                    <FiCheckCircle className="w-4 h-4" />
                    Complete
                  </button>
                )}

                {(selectedTask.status === 'completed' || selectedTask.status === 'cancelled') && (
                  <button
                    onClick={() => {
                      updateTaskStatus(selectedTask, 'pending');
                      setShowDetailModal(false);
                    }}
                    className="flex-1 px-4 py-3 bg-[#6b7280] hover:bg-[#4b5563] text-white rounded-xl transition-colors flex items-center justify-center gap-2"
                  >
                    <FiPause className="w-4 h-4" />
                    Reopen
                  </button>
                )}

                <button
                  onClick={() => {
                    setShowDetailModal(false);
                    openEditModal(selectedTask);
                  }}
                  className="px-4 py-3 bg-[#1f1f28] hover:bg-[#2a2a38] text-white rounded-xl transition-colors"
                >
                  <FiEdit2 className="w-4 h-4" />
                </button>

                <button
                  onClick={() => {
                    openDeleteModal(selectedTask);
                  }}
                  className="px-4 py-3 bg-[#ef4444]/10 hover:bg-[#ef4444]/20 text-[#ef4444] rounded-xl transition-colors"
                >
                  <FiTrash2 className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteModal && selectedTask && (
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
                <h3 className="text-xl font-bold text-white mb-2">Delete Task?</h3>
                <p className="text-[#6b6b7a] mb-6">
                  Are you sure you want to delete "<span className="text-white">{selectedTask.title}</span>"? This action cannot be undone.
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
