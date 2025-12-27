import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiRefreshCw,
  FiSearch,
  FiFilter,
  FiChevronDown,
  FiClock,
  FiCheck,
  FiX,
  FiAlertTriangle,
  FiTrash2,
  FiMessageCircle,
  FiPaperclip,
  FiCalendar,
  FiMonitor,
  FiTool,
  FiHelpCircle,
  FiAlertCircle,
  FiStar,
  FiSend,
  FiSave,
  FiExternalLink,
} from 'react-icons/fi';
import supabase from '../lib/supabase';
import { useAuthStore } from '../store/authStore';

// Types
interface Ticket {
  id: string;
  ticket_number: string;
  type: string;
  category: string;
  subject: string;
  description: string;
  priority: string;
  status: string;
  leave_start_date: string | null;
  leave_end_date: string | null;
  leave_type: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
  admin_notes: string | null;
  resolution_notes: string | null;
  creator_email?: string;
  creator_name?: string;
}

interface TicketComment {
  id: string;
  ticket_id: string;
  content: string;
  created_by: string;
  created_at: string;
  is_admin_reply: boolean;
  creator_email?: string;
  creator_name?: string;
}

interface TicketAttachment {
  id: string;
  ticket_id: string;
  file_name: string;
  file_path: string;
  file_type: string;
  uploaded_by: string;
  uploaded_at: string;
}

interface TicketStats {
  open: number;
  in_progress: number;
  resolved: number;
  closed: number;
  total: number;
}

// Configuration
const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  open: { label: 'Open', color: '#3b82f6', bgColor: 'rgba(59, 130, 246, 0.15)' },
  in_progress: { label: 'In Progress', color: '#f59e0b', bgColor: 'rgba(245, 158, 11, 0.15)' },
  resolved: { label: 'Resolved', color: '#22c55e', bgColor: 'rgba(34, 197, 94, 0.15)' },
  closed: { label: 'Closed', color: '#6b7280', bgColor: 'rgba(107, 114, 128, 0.15)' },
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  low: { label: 'Low', color: '#22c55e', bgColor: 'rgba(34, 197, 94, 0.15)' },
  medium: { label: 'Medium', color: '#f59e0b', bgColor: 'rgba(245, 158, 11, 0.15)' },
  high: { label: 'High', color: '#f97316', bgColor: 'rgba(249, 115, 22, 0.15)' },
  urgent: { label: 'Urgent', color: '#ef4444', bgColor: 'rgba(239, 68, 68, 0.15)' },
};

const TYPE_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  leave_request: { label: 'Leave Request', icon: <FiCalendar />, color: '#22c55e' },
  suggestion: { label: 'Suggestion', icon: <FiMessageCircle />, color: '#f59e0b' },
  it_support: { label: 'IT Support', icon: <FiMonitor />, color: '#3b82f6' },
  maintenance: { label: 'Maintenance', icon: <FiTool />, color: '#8b5cf6' },
  support: { label: 'Support', icon: <FiHelpCircle />, color: '#22c55e' },
  bug_report: { label: 'Bug Report', icon: <FiAlertCircle />, color: '#ef4444' },
  feature_request: { label: 'Feature Request', icon: <FiStar />, color: '#f59e0b' },
};

const CATEGORY_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  staff: { label: 'Staff', color: '#3b82f6', bgColor: 'rgba(59, 130, 246, 0.15)' },
  client: { label: 'Client', color: '#22c55e', bgColor: 'rgba(34, 197, 94, 0.15)' },
  prospect: { label: 'Prospect', color: '#f59e0b', bgColor: 'rgba(245, 158, 11, 0.15)' },
};

export default function TicketManagerPage() {
  const { user } = useAuthStore();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<TicketStats>({ open: 0, in_progress: 0, resolved: 0, closed: 0, total: 0 });

  // Filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected ticket state
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [comments, setComments] = useState<TicketComment[]>([]);
  const [attachments, setAttachments] = useState<TicketAttachment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [ticketStatus, setTicketStatus] = useState('');
  const [saving, setSaving] = useState(false);
  const [sendingComment, setSendingComment] = useState(false);

  // Delete modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [ticketToDelete, setTicketToDelete] = useState<Ticket | null>(null);
  const [deleting, setDeleting] = useState(false);

  // View mode
  const [viewMode, setViewMode] = useState<'detailed' | 'compact'>('detailed');

  // Fetch all tickets
  const fetchTickets = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      // Fetch tickets
      const { data: ticketsData, error: ticketsError } = await supabase
        .from('tickets')
        .select('*')
        .order('created_at', { ascending: false });

      if (ticketsError) throw ticketsError;

      // Fetch user info for all creators using RPC function
      if (ticketsData && ticketsData.length > 0) {
        const creatorIds = [...new Set(ticketsData.map(t => t.created_by))];
        const { data: usersData } = await supabase
          .rpc('get_users_display_info', { user_ids: creatorIds });

        type UserInfo = { id: string; email: string; full_name: string };
        const userMap = new Map<string, UserInfo>(
          usersData?.map((u: UserInfo) => [u.id, u] as [string, UserInfo]) || []
        );

        const enrichedTickets = ticketsData.map(ticket => ({
          ...ticket,
          creator_email: userMap.get(ticket.created_by)?.email || 'Unknown',
          creator_name: userMap.get(ticket.created_by)?.full_name || 'Unknown User',
        }));

        setTickets(enrichedTickets);

        // Calculate stats
        const statsCalc = enrichedTickets.reduce(
          (acc, t) => {
            acc.total++;
            if (t.status === 'open') acc.open++;
            else if (t.status === 'in_progress') acc.in_progress++;
            else if (t.status === 'resolved') acc.resolved++;
            else if (t.status === 'closed') acc.closed++;
            return acc;
          },
          { open: 0, in_progress: 0, resolved: 0, closed: 0, total: 0 }
        );
        setStats(statsCalc);
      } else {
        setTickets([]);
        setStats({ open: 0, in_progress: 0, resolved: 0, closed: 0, total: 0 });
      }
    } catch (error) {
      console.error('Error fetching tickets:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Fetch comments for selected ticket
  const fetchComments = useCallback(async (ticketId: string) => {
    try {
      const { data: commentsData, error } = await supabase
        .from('ticket_comments')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Enrich with user info using RPC function
      if (commentsData && commentsData.length > 0) {
        const creatorIds = [...new Set(commentsData.map(c => c.created_by))];
        const { data: usersData } = await supabase
          .rpc('get_users_display_info', { user_ids: creatorIds });

        type UserInfo = { id: string; email: string; full_name: string };
        const userMap = new Map<string, UserInfo>(
          usersData?.map((u: UserInfo) => [u.id, u] as [string, UserInfo]) || []
        );

        const enrichedComments = commentsData.map(comment => ({
          ...comment,
          creator_email: userMap.get(comment.created_by)?.email || 'Unknown',
          creator_name: userMap.get(comment.created_by)?.full_name || 'Unknown User',
        }));

        setComments(enrichedComments);
      } else {
        setComments([]);
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
    }
  }, []);

  // Fetch attachments for selected ticket
  const fetchAttachments = useCallback(async (ticketId: string) => {
    try {
      const { data, error } = await supabase
        .from('ticket_attachments')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('uploaded_at', { ascending: true });

      if (error) throw error;
      setAttachments(data || []);
    } catch (error) {
      console.error('Error fetching attachments:', error);
    }
  }, []);

  // Get signed URL for attachment
  const getAttachmentUrl = async (filePath: string): Promise<string | null> => {
    try {
      const { data, error } = await supabase.storage
        .from('ticket-attachments')
        .createSignedUrl(filePath, 3600);

      if (error) throw error;
      return data?.signedUrl || null;
    } catch (error) {
      console.error('Error getting attachment URL:', error);
      return null;
    }
  };

  // Open attachment in new tab
  const openAttachment = async (attachment: TicketAttachment) => {
    const url = await getAttachmentUrl(attachment.file_path);
    if (url) {
      window.open(url, '_blank');
    }
  };

  // Select ticket and load details
  const selectTicket = useCallback(async (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setAdminNotes(ticket.admin_notes || '');
    setResolutionNotes(ticket.resolution_notes || '');
    setTicketStatus(ticket.status);
    setNewComment('');
    await Promise.all([fetchComments(ticket.id), fetchAttachments(ticket.id)]);
  }, [fetchComments, fetchAttachments]);

  // Save ticket changes
  const saveTicketChanges = async () => {
    if (!selectedTicket || !user) return;

    setSaving(true);
    try {
      const updateData: Record<string, unknown> = {
        status: ticketStatus,
        admin_notes: adminNotes,
        resolution_notes: resolutionNotes,
        updated_at: new Date().toISOString(),
      };

      if (ticketStatus === 'resolved' && selectedTicket.status !== 'resolved') {
        updateData.resolved_at = new Date().toISOString();
        updateData.resolved_by = user.id;
      }

      const { error } = await supabase
        .from('tickets')
        .update(updateData)
        .eq('id', selectedTicket.id);

      if (error) throw error;

      // Update local state
      setSelectedTicket(prev => prev ? { ...prev, ...updateData } as Ticket : null);
      fetchTickets(true);
    } catch (error) {
      console.error('Error saving ticket:', error);
      alert('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  // Add comment
  const addComment = async () => {
    if (!selectedTicket || !user || !newComment.trim()) return;

    setSendingComment(true);
    try {
      const { error } = await supabase.from('ticket_comments').insert({
        ticket_id: selectedTicket.id,
        content: newComment.trim(),
        created_by: user.id,
        is_admin_reply: true,
      });

      if (error) throw error;

      setNewComment('');
      await fetchComments(selectedTicket.id);
    } catch (error) {
      console.error('Error adding comment:', error);
    } finally {
      setSendingComment(false);
    }
  };

  // Quick status update from table
  const quickStatusUpdate = async (ticket: Ticket, newStatus: string) => {
    if (!user) return;

    try {
      const updateData: Record<string, unknown> = {
        status: newStatus,
        updated_at: new Date().toISOString(),
      };

      if (newStatus === 'resolved' && ticket.status !== 'resolved') {
        updateData.resolved_at = new Date().toISOString();
        updateData.resolved_by = user.id;
      }

      const { error } = await supabase
        .from('tickets')
        .update(updateData)
        .eq('id', ticket.id);

      if (error) throw error;
      fetchTickets(true);
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  // Delete ticket
  const deleteTicket = async () => {
    if (!ticketToDelete) return;

    setDeleting(true);
    try {
      // Delete attachments from storage
      const { data: ticketAttachments } = await supabase
        .from('ticket_attachments')
        .select('file_path')
        .eq('ticket_id', ticketToDelete.id);

      if (ticketAttachments && ticketAttachments.length > 0) {
        const filePaths = ticketAttachments.map(a => a.file_path);
        await supabase.storage.from('ticket-attachments').remove(filePaths);
      }

      // Delete ticket (cascade handles comments and attachment records)
      const { error } = await supabase
        .from('tickets')
        .delete()
        .eq('id', ticketToDelete.id);

      if (error) throw error;

      setShowDeleteModal(false);
      setTicketToDelete(null);
      if (selectedTicket?.id === ticketToDelete.id) {
        setSelectedTicket(null);
      }
      fetchTickets(true);
    } catch (error) {
      console.error('Error deleting ticket:', error);
      alert('Failed to delete ticket');
    } finally {
      setDeleting(false);
    }
  };

  // Confirm delete
  const confirmDelete = (ticket: Ticket, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setTicketToDelete(ticket);
    setShowDeleteModal(true);
  };

  // Filter tickets
  const filteredTickets = useMemo(() => {
    return tickets.filter(ticket => {
      if (statusFilter !== 'all' && ticket.status !== statusFilter) return false;
      if (typeFilter !== 'all' && ticket.type !== typeFilter) return false;
      if (priorityFilter !== 'all' && ticket.priority !== priorityFilter) return false;
      if (categoryFilter !== 'all' && ticket.category !== categoryFilter) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesNumber = ticket.ticket_number.toLowerCase().includes(query);
        const matchesSubject = ticket.subject.toLowerCase().includes(query);
        const matchesCreator = (ticket.creator_name?.toLowerCase().includes(query) || ticket.creator_email?.toLowerCase().includes(query));
        if (!matchesNumber && !matchesSubject && !matchesCreator) return false;
      }
      return true;
    });
  }, [tickets, statusFilter, typeFilter, priorityFilter, categoryFilter, searchQuery]);

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  // Format relative time
  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return formatDate(dateString);
  };

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  // Dropdown component
  const FilterDropdown = ({
    value,
    onChange,
    options,
    placeholder,
  }: {
    value: string;
    onChange: (v: string) => void;
    options: { value: string; label: string }[];
    placeholder: string;
  }) => (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none bg-[#1a1a23] border border-[#2a2a35] rounded-xl px-4 py-2.5 pr-10 text-sm text-white cursor-pointer hover:border-[#3a3a48] focus:border-[#ea2127] focus:outline-none transition-colors"
      >
        <option value="all">{placeholder}</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <FiChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6b6b7a] pointer-events-none" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0f0f12] p-6 lg:p-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#ea2127] to-[#ff4d52] flex items-center justify-center shadow-lg shadow-[#ea2127]/20">
              <FiFilter className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">
                Ticket Manager
              </h1>
              <p className="text-[#6b6b7a] text-sm mt-0.5">
                Manage and respond to all tickets across the system
              </p>
            </div>
          </div>

          <button
            onClick={() => fetchTickets(true)}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#1a1a23] border border-[#2a2a35] rounded-xl text-white text-sm font-medium hover:bg-[#252530] hover:border-[#3a3a48] transition-all disabled:opacity-50"
          >
            <FiRefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {[
            { key: 'open', label: 'Open', value: stats.open, color: '#3b82f6' },
            { key: 'in_progress', label: 'In Progress', value: stats.in_progress, color: '#f59e0b' },
            { key: 'resolved', label: 'Resolved', value: stats.resolved, color: '#22c55e' },
            { key: 'closed', label: 'Closed', value: stats.closed, color: '#6b7280' },
            { key: 'total', label: 'Total', value: stats.total, color: '#ea2127' },
          ].map((stat, i) => (
            <motion.div
              key={stat.key}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => stat.key !== 'total' && setStatusFilter(stat.key === statusFilter ? 'all' : stat.key)}
              className={`bg-[#141418] border rounded-2xl p-4 cursor-pointer transition-all hover:border-[${stat.color}]/50 ${
                statusFilter === stat.key ? 'border-[' + stat.color + ']' : 'border-[#2a2a35]'
              }`}
              style={{
                borderColor: statusFilter === stat.key ? stat.color : undefined,
              }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                style={{ backgroundColor: `${stat.color}20` }}
              >
                {stat.key === 'open' && <FiClock className="w-5 h-5" style={{ color: stat.color }} />}
                {stat.key === 'in_progress' && <FiRefreshCw className="w-5 h-5" style={{ color: stat.color }} />}
                {stat.key === 'resolved' && <FiCheck className="w-5 h-5" style={{ color: stat.color }} />}
                {stat.key === 'closed' && <FiX className="w-5 h-5" style={{ color: stat.color }} />}
                {stat.key === 'total' && <FiFilter className="w-5 h-5" style={{ color: stat.color }} />}
              </div>
              <p className="text-3xl font-bold text-white mb-1">{stat.value}</p>
              <p className="text-sm text-[#6b6b7a]">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Filter Bar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-[#141418] border border-[#2a2a35] rounded-2xl p-4 mb-6"
      >
        <div className="flex flex-wrap items-center gap-3">
          <FilterDropdown
            value={statusFilter}
            onChange={setStatusFilter}
            placeholder="All Status"
            options={[
              { value: 'open', label: 'Open' },
              { value: 'in_progress', label: 'In Progress' },
              { value: 'resolved', label: 'Resolved' },
              { value: 'closed', label: 'Closed' },
            ]}
          />

          <FilterDropdown
            value={typeFilter}
            onChange={setTypeFilter}
            placeholder="All Types"
            options={Object.entries(TYPE_CONFIG).map(([key, val]) => ({
              value: key,
              label: val.label,
            }))}
          />

          <FilterDropdown
            value={priorityFilter}
            onChange={setPriorityFilter}
            placeholder="All Priority"
            options={[
              { value: 'low', label: 'Low' },
              { value: 'medium', label: 'Medium' },
              { value: 'high', label: 'High' },
              { value: 'urgent', label: 'Urgent' },
            ]}
          />

          <FilterDropdown
            value={categoryFilter}
            onChange={setCategoryFilter}
            placeholder="All Categories"
            options={[
              { value: 'staff', label: 'Staff' },
              { value: 'client', label: 'Client' },
            ]}
          />

          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-[#6b6b7a]" />
              <input
                type="text"
                placeholder="Search by ticket #, subject, or creator..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#1a1a23] border border-[#2a2a35] rounded-xl pl-11 pr-4 py-2.5 text-sm text-white placeholder-[#6b6b7a] focus:border-[#ea2127] focus:outline-none transition-colors"
              />
            </div>
          </div>

          {(statusFilter !== 'all' || typeFilter !== 'all' || priorityFilter !== 'all' || categoryFilter !== 'all' || searchQuery) && (
            <button
              onClick={() => {
                setStatusFilter('all');
                setTypeFilter('all');
                setPriorityFilter('all');
                setCategoryFilter('all');
                setSearchQuery('');
              }}
              className="px-4 py-2.5 text-sm text-[#ea2127] hover:bg-[#ea2127]/10 rounded-xl transition-colors"
            >
              Clear Filters
            </button>
          )}

          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 bg-[#1a1a23] rounded-xl p-1 ml-auto">
            <button
              onClick={() => setViewMode('detailed')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                viewMode === 'detailed'
                  ? 'bg-[#ea2127] text-white'
                  : 'text-[#6b6b7a] hover:text-white'
              }`}
            >
              Detailed
            </button>
            <button
              onClick={() => setViewMode('compact')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                viewMode === 'compact'
                  ? 'bg-[#ea2127] text-white'
                  : 'text-[#6b6b7a] hover:text-white'
              }`}
            >
              Compact
            </button>
          </div>
        </div>
      </motion.div>

      {/* Tickets Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="bg-[#141418] border border-[#2a2a35] rounded-2xl overflow-hidden"
      >
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-4">
              <div className="w-12 h-12 rounded-full border-4 border-[#2a2a35] border-t-[#ea2127] animate-spin" />
              <p className="text-[#6b6b7a]">Loading tickets...</p>
            </div>
          </div>
        ) : filteredTickets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-[#1a1a23] flex items-center justify-center mb-4">
              <FiFilter className="w-8 h-8 text-[#3a3a48]" />
            </div>
            <p className="text-white font-medium mb-1">No tickets found</p>
            <p className="text-[#6b6b7a] text-sm">Try adjusting your filters</p>
          </div>
        ) : viewMode === 'detailed' ? (
          /* Detailed View */
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#2a2a35]">
                  <th className="text-left px-6 py-4 text-xs font-semibold text-[#6b6b7a] uppercase tracking-wider">Ticket</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-[#6b6b7a] uppercase tracking-wider">Type</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-[#6b6b7a] uppercase tracking-wider">Subject</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-[#6b6b7a] uppercase tracking-wider">Created By</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-[#6b6b7a] uppercase tracking-wider">Priority</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-[#6b6b7a] uppercase tracking-wider">Status</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-[#6b6b7a] uppercase tracking-wider">Created</th>
                  <th className="text-right px-6 py-4 text-xs font-semibold text-[#6b6b7a] uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {filteredTickets.map((ticket, i) => {
                    const typeConfig = TYPE_CONFIG[ticket.type] || { label: ticket.type, icon: <FiHelpCircle />, color: '#6b7280' };
                    const priorityConfig = PRIORITY_CONFIG[ticket.priority] || PRIORITY_CONFIG.medium;
                    const statusConfig = STATUS_CONFIG[ticket.status] || STATUS_CONFIG.open;

                    return (
                      <motion.tr
                        key={ticket.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ delay: i * 0.02 }}
                        onClick={() => selectTicket(ticket)}
                        className="border-b border-[#1f1f28] hover:bg-[#1a1a23] cursor-pointer transition-colors group"
                      >
                        <td className="px-6 py-4">
                          <span className="text-white font-mono text-sm font-medium">{ticket.ticket_number}</span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span style={{ color: typeConfig.color }}>{typeConfig.icon}</span>
                            <span className="text-sm text-[#9a9aa8]">{typeConfig.label}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-white text-sm line-clamp-1 max-w-[200px]">{ticket.subject}</span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1">
                            <span className="text-white text-sm">{ticket.creator_name}</span>
                            <span
                              className="px-2 py-0.5 rounded text-xs font-medium w-fit"
                              style={{
                                backgroundColor: CATEGORY_CONFIG[ticket.category]?.bgColor || 'rgba(107, 114, 128, 0.15)',
                                color: CATEGORY_CONFIG[ticket.category]?.color || '#6b7280',
                              }}
                            >
                              {CATEGORY_CONFIG[ticket.category]?.label || ticket.category}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className="px-2.5 py-1 rounded-lg text-xs font-medium"
                            style={{
                              backgroundColor: priorityConfig.bgColor,
                              color: priorityConfig.color,
                            }}
                          >
                            {priorityConfig.label}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className="px-2.5 py-1 rounded-lg text-xs font-medium"
                            style={{
                              backgroundColor: statusConfig.bgColor,
                              color: statusConfig.color,
                            }}
                          >
                            {statusConfig.label}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-[#6b6b7a]">{formatRelativeTime(ticket.created_at)}</span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <select
                              value={ticket.status}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => quickStatusUpdate(ticket, e.target.value)}
                              className="bg-[#1a1a23] border border-[#2a2a35] rounded-lg px-2 py-1 text-xs text-white cursor-pointer hover:border-[#3a3a48] focus:border-[#ea2127] focus:outline-none"
                            >
                              <option value="open">Open</option>
                              <option value="in_progress">In Progress</option>
                              <option value="resolved">Resolved</option>
                              <option value="closed">Closed</option>
                            </select>
                            <button
                              onClick={(e) => confirmDelete(ticket, e)}
                              className="p-2 text-[#6b6b7a] hover:text-[#ef4444] hover:bg-[#ef4444]/10 rounded-lg transition-colors"
                            >
                              <FiTrash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        ) : (
          /* Compact View - Ultra minimal table */
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[#2a2a35] bg-[#0f0f12]">
                  <th className="text-left px-3 py-2 font-medium text-[#6b6b7a]">#</th>
                  <th className="text-left px-3 py-2 font-medium text-[#6b6b7a]">Subject</th>
                  <th className="text-left px-3 py-2 font-medium text-[#6b6b7a]">From</th>
                  <th className="text-center px-3 py-2 font-medium text-[#6b6b7a]">Cat</th>
                  <th className="text-center px-3 py-2 font-medium text-[#6b6b7a]">Pri</th>
                  <th className="text-center px-3 py-2 font-medium text-[#6b6b7a]">Status</th>
                  <th className="text-right px-3 py-2 font-medium text-[#6b6b7a]">Date</th>
                </tr>
              </thead>
              <tbody>
                {filteredTickets.map((ticket) => {
                  const priorityConfig = PRIORITY_CONFIG[ticket.priority] || PRIORITY_CONFIG.medium;
                  const statusConfig = STATUS_CONFIG[ticket.status] || STATUS_CONFIG.open;
                  const categoryConfig = CATEGORY_CONFIG[ticket.category] || { color: '#6b7280', bgColor: 'rgba(107, 114, 128, 0.15)', label: ticket.category };

                  return (
                    <tr
                      key={ticket.id}
                      onClick={() => selectTicket(ticket)}
                      className="border-b border-[#1f1f28]/50 hover:bg-[#1a1a23] cursor-pointer transition-colors"
                    >
                      <td className="px-3 py-1.5">
                        <span className="text-[#6b6b7a] font-mono">{ticket.ticket_number.replace('TKT-', '')}</span>
                      </td>
                      <td className="px-3 py-1.5 max-w-[300px]">
                        <span className="text-white truncate block">{ticket.subject}</span>
                      </td>
                      <td className="px-3 py-1.5">
                        <span className="text-[#9a9aa8]">{ticket.creator_name?.split(' ')[0] || 'Unknown'}</span>
                      </td>
                      <td className="px-3 py-1.5 text-center">
                        <span
                          className="inline-block w-2 h-2 rounded-full"
                          style={{ backgroundColor: categoryConfig.color }}
                          title={categoryConfig.label}
                        />
                      </td>
                      <td className="px-3 py-1.5 text-center">
                        <span
                          className="inline-block w-2 h-2 rounded-full"
                          style={{ backgroundColor: priorityConfig.color }}
                          title={priorityConfig.label}
                        />
                      </td>
                      <td className="px-3 py-1.5 text-center">
                        <span
                          className="px-1.5 py-0.5 rounded text-[10px] font-medium"
                          style={{
                            backgroundColor: statusConfig.bgColor,
                            color: statusConfig.color,
                          }}
                        >
                          {statusConfig.label.substring(0, 4)}
                        </span>
                      </td>
                      <td className="px-3 py-1.5 text-right">
                        <span className="text-[#6b6b7a]">{formatDate(ticket.created_at).replace(', ', ' ')}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>

      {/* Ticket Detail Modal */}
      <AnimatePresence>
        {selectedTicket && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedTicket(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#141418] border border-[#2a2a35] rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
            >
              {/* Modal Header */}
              <div className="flex items-start justify-between p-6 border-b border-[#2a2a35]">
                <div className="flex items-start gap-4">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: `${TYPE_CONFIG[selectedTicket.type]?.color || '#6b7280'}20` }}
                  >
                    <span style={{ color: TYPE_CONFIG[selectedTicket.type]?.color || '#6b7280' }}>
                      {TYPE_CONFIG[selectedTicket.type]?.icon || <FiHelpCircle className="w-6 h-6" />}
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <span className="text-white font-mono font-bold">{selectedTicket.ticket_number}</span>
                      <span
                        className="px-2.5 py-0.5 rounded-lg text-xs font-medium"
                        style={{
                          backgroundColor: STATUS_CONFIG[selectedTicket.status]?.bgColor,
                          color: STATUS_CONFIG[selectedTicket.status]?.color,
                        }}
                      >
                        {STATUS_CONFIG[selectedTicket.status]?.label}
                      </span>
                      <span
                        className="px-2.5 py-0.5 rounded-lg text-xs font-medium"
                        style={{
                          backgroundColor: PRIORITY_CONFIG[selectedTicket.priority]?.bgColor,
                          color: PRIORITY_CONFIG[selectedTicket.priority]?.color,
                        }}
                      >
                        {PRIORITY_CONFIG[selectedTicket.priority]?.label} Priority
                      </span>
                    </div>
                    <h2 className="text-xl text-white font-semibold">{selectedTicket.subject}</h2>
                    <p className="text-sm text-[#6b6b7a] mt-1 flex items-center gap-2 flex-wrap">
                      <span>By {selectedTicket.creator_name}</span>
                      <span
                        className="px-2 py-0.5 rounded text-xs font-medium"
                        style={{
                          backgroundColor: CATEGORY_CONFIG[selectedTicket.category]?.bgColor || 'rgba(107, 114, 128, 0.15)',
                          color: CATEGORY_CONFIG[selectedTicket.category]?.color || '#6b7280',
                        }}
                      >
                        {CATEGORY_CONFIG[selectedTicket.category]?.label || selectedTicket.category}
                      </span>
                      <span>• {formatDate(selectedTicket.created_at)}</span>
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedTicket(null)}
                  className="p-2 text-[#6b6b7a] hover:text-white hover:bg-[#2a2a35] rounded-xl transition-colors"
                >
                  <FiX className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="flex-1 overflow-y-auto p-6">
                <div className="grid lg:grid-cols-2 gap-6">
                  {/* Left Column - Ticket Details */}
                  <div className="space-y-6">
                    {/* Description */}
                    <div>
                      <h3 className="text-sm font-semibold text-[#6b6b7a] uppercase tracking-wider mb-2">Description</h3>
                      <div className="bg-[#1a1a23] border border-[#2a2a35] rounded-xl p-4">
                        <p className="text-white text-sm whitespace-pre-wrap">{selectedTicket.description}</p>
                      </div>
                    </div>

                    {/* Leave Details (if applicable) */}
                    {selectedTicket.type === 'leave_request' && selectedTicket.leave_start_date && (
                      <div>
                        <h3 className="text-sm font-semibold text-[#6b6b7a] uppercase tracking-wider mb-2">Leave Details</h3>
                        <div className="bg-[#1a1a23] border border-[#2a2a35] rounded-xl p-4">
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-[#6b6b7a]">Type:</span>
                              <span className="text-white ml-2 capitalize">{selectedTicket.leave_type}</span>
                            </div>
                            <div>
                              <span className="text-[#6b6b7a]">Start:</span>
                              <span className="text-white ml-2">{selectedTicket.leave_start_date}</span>
                            </div>
                            <div>
                              <span className="text-[#6b6b7a]">End:</span>
                              <span className="text-white ml-2">{selectedTicket.leave_end_date}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Attachments */}
                    {attachments.length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold text-[#6b6b7a] uppercase tracking-wider mb-2 flex items-center gap-2">
                          <FiPaperclip className="w-4 h-4" />
                          Attachments ({attachments.length})
                        </h3>
                        <div className="grid grid-cols-2 gap-2">
                          {attachments.map((att) => (
                            <button
                              key={att.id}
                              onClick={() => openAttachment(att)}
                              className="flex items-center gap-2 bg-[#1a1a23] border border-[#2a2a35] rounded-xl p-3 hover:border-[#3a3a48] transition-colors text-left group"
                            >
                              <FiExternalLink className="w-4 h-4 text-[#6b6b7a] group-hover:text-white" />
                              <span className="text-sm text-white truncate flex-1">{att.file_name}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Admin Notes */}
                    <div>
                      <h3 className="text-sm font-semibold text-[#6b6b7a] uppercase tracking-wider mb-2">Admin Notes</h3>
                      <textarea
                        value={adminNotes}
                        onChange={(e) => setAdminNotes(e.target.value)}
                        placeholder="Internal notes (not visible to ticket creator)..."
                        className="w-full bg-[#1a1a23] border border-[#2a2a35] rounded-xl p-4 text-white text-sm placeholder-[#6b6b7a] focus:border-[#ea2127] focus:outline-none resize-none h-24"
                      />
                    </div>

                    {/* Resolution Notes */}
                    <div>
                      <h3 className="text-sm font-semibold text-[#6b6b7a] uppercase tracking-wider mb-2">Resolution Notes</h3>
                      <textarea
                        value={resolutionNotes}
                        onChange={(e) => setResolutionNotes(e.target.value)}
                        placeholder="Resolution details (visible to ticket creator)..."
                        className="w-full bg-[#1a1a23] border border-[#2a2a35] rounded-xl p-4 text-white text-sm placeholder-[#6b6b7a] focus:border-[#ea2127] focus:outline-none resize-none h-24"
                      />
                    </div>
                  </div>

                  {/* Right Column - Comments */}
                  <div className="flex flex-col">
                    <h3 className="text-sm font-semibold text-[#6b6b7a] uppercase tracking-wider mb-2 flex items-center gap-2">
                      <FiMessageCircle className="w-4 h-4" />
                      Comments ({comments.length})
                    </h3>
                    <div className="bg-[#1a1a23] border border-[#2a2a35] rounded-xl overflow-hidden flex flex-col h-[350px]">
                      {/* Comments List */}
                      <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        {comments.length === 0 ? (
                          <div className="flex flex-col items-center justify-center h-full text-center py-8">
                            <FiMessageCircle className="w-8 h-8 text-[#3a3a48] mb-2" />
                            <p className="text-[#6b6b7a] text-sm">No comments yet</p>
                          </div>
                        ) : (
                          comments.map((comment) => (
                            <div
                              key={comment.id}
                              className={`p-3 rounded-xl ${
                                comment.is_admin_reply
                                  ? 'bg-[#ea2127]/10 border border-[#ea2127]/20 ml-4'
                                  : 'bg-[#252530] mr-4'
                              }`}
                            >
                              <div className="flex items-center gap-2 mb-1">
                                <span className={`text-xs font-medium ${comment.is_admin_reply ? 'text-[#ea2127]' : 'text-[#3b82f6]'}`}>
                                  {comment.creator_name}
                                </span>
                                {comment.is_admin_reply && (
                                  <span className="px-1.5 py-0.5 bg-[#ea2127]/20 text-[#ea2127] text-[10px] font-bold uppercase rounded">
                                    Admin
                                  </span>
                                )}
                                <span className="text-[#6b6b7a] text-xs">{formatRelativeTime(comment.created_at)}</span>
                              </div>
                              <p className="text-white text-sm">{comment.content}</p>
                            </div>
                          ))
                        )}
                      </div>

                      {/* Add Comment */}
                      <div className="border-t border-[#2a2a35] p-3">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            placeholder="Add admin reply..."
                            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && addComment()}
                            className="flex-1 bg-[#141418] border border-[#2a2a35] rounded-xl px-4 py-2 text-white text-sm placeholder-[#6b6b7a] focus:border-[#ea2127] focus:outline-none"
                          />
                          <button
                            onClick={addComment}
                            disabled={!newComment.trim() || sendingComment}
                            className="px-4 py-2 bg-[#ea2127] hover:bg-[#ff3b3f] disabled:opacity-50 disabled:hover:bg-[#ea2127] text-white rounded-xl transition-colors flex items-center gap-2"
                          >
                            {sendingComment ? (
                              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                              <FiSend className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-between p-6 border-t border-[#2a2a35] bg-[#0f0f12]">
                <div className="flex items-center gap-3">
                  <span className="text-sm text-[#6b6b7a]">Status:</span>
                  <select
                    value={ticketStatus}
                    onChange={(e) => setTicketStatus(e.target.value)}
                    className="bg-[#1a1a23] border border-[#2a2a35] rounded-xl px-4 py-2 text-white text-sm cursor-pointer hover:border-[#3a3a48] focus:border-[#ea2127] focus:outline-none"
                  >
                    <option value="open">Open</option>
                    <option value="in_progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => confirmDelete(selectedTicket)}
                    className="px-4 py-2 text-[#ef4444] hover:bg-[#ef4444]/10 rounded-xl transition-colors flex items-center gap-2"
                  >
                    <FiTrash2 className="w-4 h-4" />
                    Delete
                  </button>
                  <button
                    onClick={saveTicketChanges}
                    disabled={saving}
                    className="px-6 py-2 bg-[#22c55e] hover:bg-[#16a34a] disabled:opacity-50 text-white rounded-xl font-medium transition-colors flex items-center gap-2"
                  >
                    {saving ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <FiSave className="w-4 h-4" />
                    )}
                    Save Changes
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteModal && ticketToDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
            onClick={() => setShowDeleteModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#141418] border border-[#2a2a35] rounded-2xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6">
                <div className="flex justify-center mb-4">
                  <div className="w-16 h-16 rounded-full bg-[#ef4444]/20 flex items-center justify-center">
                    <FiAlertTriangle className="w-8 h-8 text-[#ef4444]" />
                  </div>
                </div>

                <h2 className="text-xl font-bold text-white text-center mb-2">Delete Ticket?</h2>
                <p className="text-[#6b6b7a] text-center text-sm mb-4">
                  Are you sure you want to delete ticket <span className="text-white font-mono font-bold">{ticketToDelete.ticket_number}</span>?
                  This action cannot be undone.
                </p>

                <div className="bg-[#1a1a23] border border-[#2a2a35] rounded-xl p-3 mb-6">
                  <p className="text-white text-sm font-medium truncate">{ticketToDelete.subject}</p>
                  <p className="text-[#6b6b7a] text-xs mt-1">
                    Created by {ticketToDelete.creator_name} • {formatDate(ticketToDelete.created_at)}
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowDeleteModal(false)}
                    className="flex-1 px-4 py-3 bg-[#2a2a35] hover:bg-[#3a3a48] text-white rounded-xl font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={deleteTicket}
                    disabled={deleting}
                    className="flex-1 px-4 py-3 bg-[#ef4444] hover:bg-[#dc2626] disabled:opacity-50 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    {deleting ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <FiTrash2 className="w-4 h-4" />
                        Delete
                      </>
                    )}
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
