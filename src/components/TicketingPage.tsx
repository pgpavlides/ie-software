import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiCalendar,
  FiMessageCircle,
  FiMonitor,
  FiTool,
  FiHelpCircle,
  FiAlertCircle,
  FiStar,
  FiPlus,
  FiClock,
  FiCheck,
  FiX,
  FiChevronRight,
  FiFilter,
  FiLoader,
  FiRefreshCw,
  FiImage,
  FiTrash2,
  FiPaperclip,
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
  creator?: {
    email: string;
    raw_user_meta_data: { full_name?: string };
  };
}

interface TicketComment {
  id: string;
  ticket_id: string;
  content: string;
  created_by: string;
  created_at: string;
  is_admin_reply: boolean;
  creator?: {
    email: string;
    raw_user_meta_data: { full_name?: string };
  };
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

interface PendingAttachment {
  id: string;
  file: File;
  preview: string;
}

interface TicketType {
  key: string;
  label: string;
  icon: React.ReactNode;
  color: string;
  description: string;
  category: 'staff' | 'client';
}

// Ticket type configurations
const STAFF_TICKET_TYPES: TicketType[] = [
  {
    key: 'leave_request',
    label: 'Leave Request',
    icon: <FiCalendar className="w-8 h-8" />,
    color: '#22c55e',
    description: 'Request time off or vacation',
    category: 'staff',
  },
  {
    key: 'suggestion',
    label: 'Suggestion',
    icon: <FiMessageCircle className="w-8 h-8" />,
    color: '#f59e0b',
    description: 'Share ideas for improvement',
    category: 'staff',
  },
  {
    key: 'it_support',
    label: 'IT Support',
    icon: <FiMonitor className="w-8 h-8" />,
    color: '#3b82f6',
    description: 'Technical issues and requests',
    category: 'staff',
  },
  {
    key: 'maintenance',
    label: 'Maintenance',
    icon: <FiTool className="w-8 h-8" />,
    color: '#8b5cf6',
    description: 'Building/equipment maintenance',
    category: 'staff',
  },
];

const CLIENT_TICKET_TYPES: TicketType[] = [
  {
    key: 'support',
    label: 'Support Request',
    icon: <FiHelpCircle className="w-8 h-8" />,
    color: '#22c55e',
    description: 'Get help with your project',
    category: 'client',
  },
  {
    key: 'bug_report',
    label: 'Bug Report',
    icon: <FiAlertCircle className="w-8 h-8" />,
    color: '#ef4444',
    description: 'Report an issue or problem',
    category: 'client',
  },
  {
    key: 'feature_request',
    label: 'Feature Request',
    icon: <FiStar className="w-8 h-8" />,
    color: '#f59e0b',
    description: 'Suggest a new feature',
    category: 'client',
  },
];

const TICKET_MANAGERS = ['Super Admin', 'Boss', 'Efficiency Coordinator'];

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

const TYPE_LABELS: Record<string, string> = {
  leave_request: 'Leave Request',
  suggestion: 'Suggestion',
  it_support: 'IT Support',
  maintenance: 'Maintenance',
  support: 'Support',
  bug_report: 'Bug Report',
  feature_request: 'Feature Request',
};

export default function TicketingPage() {
  const { user, hasRole } = useAuthStore();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [comments, setComments] = useState<TicketComment[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTicketType, setSelectedTicketType] = useState<TicketType | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>([]);
  const [ticketAttachments, setTicketAttachments] = useState<TicketAttachment[]>([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [ticketToDelete, setTicketToDelete] = useState<Ticket | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Form state for creating tickets
  const [formData, setFormData] = useState({
    subject: '',
    description: '',
    priority: 'medium',
    leave_start_date: '',
    leave_end_date: '',
    leave_type: 'vacation',
  });

  // Check if user is a ticket manager (for status updates - used in Ticket Manager page)
  const isTicketManager = useMemo(() => {
    return TICKET_MANAGERS.some(role => hasRole(role));
  }, [hasRole]);

  // Check if user can delete tickets (managers + heads)
  const canDeleteTicket = useMemo(() => {
    return isTicketManager ||
           hasRole('Head') ||
           hasRole('Head of Software') ||
           hasRole('Head of Electronics') ||
           hasRole('Head Architect') ||
           hasRole('Head Project Manager') ||
           hasRole('Head of Accounting');
  }, [hasRole, isTicketManager]);

  // Check if user is a client/prospect
  const isClientOrProspect = useMemo(() => {
    return hasRole('Client') || hasRole('Prospect');
  }, [hasRole]);

  // Get available ticket types based on role
  const availableTicketTypes = useMemo(() => {
    if (isClientOrProspect) {
      return CLIENT_TICKET_TYPES;
    }
    return STAFF_TICKET_TYPES;
  }, [isClientOrProspect]);

  // Fetch tickets
  // Fetch user's own tickets only (All Tickets view moved to Ticket Manager)
  const fetchTickets = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    try {
      let query = supabase
        .from('tickets')
        .select('*')
        .eq('created_by', user.id)
        .order('created_at', { ascending: false });

      // Apply status filter
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;

      if (error) throw error;
      setTickets(data || []);
    } catch (error) {
      console.error('Error fetching tickets:', error);
    } finally {
      setLoading(false);
    }
  }, [user, statusFilter]);

  // Fetch comments for a ticket
  const fetchComments = useCallback(async (ticketId: string) => {
    try {
      const { data, error } = await supabase
        .from('ticket_comments')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setComments(data || []);
    } catch (error) {
      console.error('Error fetching comments:', error);
    }
  }, []);

  // Fetch attachments for a ticket
  const fetchAttachments = useCallback(async (ticketId: string) => {
    try {
      const { data, error } = await supabase
        .from('ticket_attachments')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('uploaded_at', { ascending: true });

      if (error) throw error;
      setTicketAttachments(data || []);
    } catch (error) {
      console.error('Error fetching attachments:', error);
    }
  }, []);

  // Handle file selection for attachments
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newAttachments: PendingAttachment[] = [];
    Array.from(files).forEach((file) => {
      // Only allow images
      if (!file.type.startsWith('image/')) {
        alert('Only image files are allowed');
        return;
      }
      // Limit to 5MB per file
      if (file.size > 5 * 1024 * 1024) {
        alert(`File ${file.name} is too large. Maximum size is 5MB.`);
        return;
      }
      newAttachments.push({
        id: crypto.randomUUID(),
        file,
        preview: URL.createObjectURL(file),
      });
    });

    setPendingAttachments((prev) => [...prev, ...newAttachments]);
    // Reset input
    e.target.value = '';
  };

  // Remove pending attachment
  const removePendingAttachment = (id: string) => {
    setPendingAttachments((prev) => {
      const attachment = prev.find((a) => a.id === id);
      if (attachment) {
        URL.revokeObjectURL(attachment.preview);
      }
      return prev.filter((a) => a.id !== id);
    });
  };

  // Get signed URL for attachment
  const getAttachmentUrl = async (filePath: string): Promise<string | null> => {
    try {
      const { data, error } = await supabase.storage
        .from('ticket-attachments')
        .createSignedUrl(filePath, 3600); // 1 hour

      if (error) throw error;
      return data?.signedUrl || null;
    } catch (error) {
      console.error('Error getting attachment URL:', error);
      return null;
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  useEffect(() => {
    if (selectedTicket) {
      fetchComments(selectedTicket.id);
      fetchAttachments(selectedTicket.id);
    }
  }, [selectedTicket, fetchComments, fetchAttachments]);

  // Create ticket
  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedTicketType) return;

    setSubmitting(true);
    try {
      const ticketData: Record<string, unknown> = {
        type: selectedTicketType.key,
        category: selectedTicketType.category,
        subject: formData.subject,
        description: formData.description,
        priority: formData.priority,
        created_by: user.id,
      };

      // Add leave-specific fields if it's a leave request
      if (selectedTicketType.key === 'leave_request') {
        ticketData.leave_start_date = formData.leave_start_date;
        ticketData.leave_end_date = formData.leave_end_date;
        ticketData.leave_type = formData.leave_type;
      }

      const { data: createdTicket, error } = await supabase
        .from('tickets')
        .insert(ticketData)
        .select('id')
        .single();

      if (error) throw error;

      // Upload attachments if any (for client ticket types)
      if (pendingAttachments.length > 0 && createdTicket) {
        for (const attachment of pendingAttachments) {
          const fileExt = attachment.file.name.split('.').pop();
          const filePath = `${user.id}/${createdTicket.id}/${attachment.id}.${fileExt}`;

          // Upload to storage
          const { error: uploadError } = await supabase.storage
            .from('ticket-attachments')
            .upload(filePath, attachment.file);

          if (uploadError) {
            console.error('Failed to upload attachment:', uploadError);
            continue;
          }

          // Create attachment record
          await supabase.from('ticket_attachments').insert({
            ticket_id: createdTicket.id,
            file_name: attachment.file.name,
            file_path: filePath,
            file_type: attachment.file.type,
            uploaded_by: user.id,
          });

          // Revoke preview URL
          URL.revokeObjectURL(attachment.preview);
        }
      }

      // Reset form and close modal
      setFormData({
        subject: '',
        description: '',
        priority: 'medium',
        leave_start_date: '',
        leave_end_date: '',
        leave_type: 'vacation',
      });
      setPendingAttachments([]);
      setShowCreateModal(false);
      setSelectedTicketType(null);
      fetchTickets();
    } catch (error: unknown) {
      console.error('Error creating ticket:', error);
      alert('Failed to create ticket: ' + (error as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  // Add comment
  const handleAddComment = async () => {
    if (!user || !selectedTicket || !newComment.trim()) return;

    setSubmitting(true);
    try {
      const { error } = await supabase.from('ticket_comments').insert({
        ticket_id: selectedTicket.id,
        content: newComment.trim(),
        created_by: user.id,
        is_admin_reply: isTicketManager,
      });

      if (error) throw error;

      setNewComment('');
      fetchComments(selectedTicket.id);
    } catch (error) {
      console.error('Error adding comment:', error);
    } finally {
      setSubmitting(false);
    }
  };

  // Update ticket status (managers only)
  const handleUpdateStatus = async (ticketId: string, newStatus: string) => {
    if (!isTicketManager) return;

    try {
      const updateData: Record<string, unknown> = { status: newStatus };
      if (newStatus === 'resolved') {
        updateData.resolved_at = new Date().toISOString();
        updateData.resolved_by = user?.id;
      }

      const { error } = await supabase
        .from('tickets')
        .update(updateData)
        .eq('id', ticketId);

      if (error) throw error;

      fetchTickets();
      if (selectedTicket?.id === ticketId) {
        setSelectedTicket(prev => prev ? { ...prev, status: newStatus } : null);
      }
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  // Open delete confirmation modal
  const confirmDeleteTicket = (ticket: Ticket) => {
    if (!canDeleteTicket) return;
    setTicketToDelete(ticket);
    setShowDeleteModal(true);
  };

  // Delete ticket (managers and heads only)
  const handleDeleteTicket = async () => {
    if (!canDeleteTicket || !ticketToDelete) return;

    setDeleting(true);
    try {
      // Delete attachments from storage first
      const { data: attachments } = await supabase
        .from('ticket_attachments')
        .select('file_path')
        .eq('ticket_id', ticketToDelete.id);

      if (attachments && attachments.length > 0) {
        const filePaths = attachments.map(a => a.file_path);
        await supabase.storage.from('ticket-attachments').remove(filePaths);
      }

      // Delete the ticket (cascade will handle comments and attachment records)
      const { error } = await supabase
        .from('tickets')
        .delete()
        .eq('id', ticketToDelete.id);

      if (error) throw error;

      setSelectedTicket(null);
      setShowDeleteModal(false);
      setTicketToDelete(null);
      fetchTickets();
    } catch (error) {
      console.error('Error deleting ticket:', error);
      alert('Failed to delete ticket');
    } finally {
      setDeleting(false);
    }
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
    return date.toLocaleDateString();
  };

  return (
    <div className="min-h-screen bg-[#0f0f12] text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Ticketing System</h1>
            <p className="text-[#6b6b7a] mt-1">Submit and track your requests</p>
          </div>
          <button
            onClick={() => fetchTickets()}
            className="p-2 rounded-lg bg-[#1a1a23] border border-[#2a2a35] hover:bg-[#252530] transition-colors"
          >
            <FiRefreshCw className="w-5 h-5 text-[#6b6b7a]" />
          </button>
        </div>

        {/* Ticket Type Cards */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-white mb-4">Create a New Ticket</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {availableTicketTypes.map((type) => (
              <motion.button
                key={type.key}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  setSelectedTicketType(type);
                  setShowCreateModal(true);
                }}
                className="p-6 rounded-2xl border border-[#2a2a35] bg-[#1a1a23] hover:bg-[#252530] transition-all group"
              >
                <div
                  className="w-16 h-16 rounded-xl flex items-center justify-center mb-4 mx-auto transition-transform group-hover:scale-110"
                  style={{ backgroundColor: `${type.color}15` }}
                >
                  <span style={{ color: type.color }}>{type.icon}</span>
                </div>
                <h3 className="font-semibold text-white text-center">{type.label}</h3>
                <p className="text-sm text-[#6b6b7a] text-center mt-1">{type.description}</p>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4 mb-6">
          <div className="flex items-center gap-2">
            <FiFilter className="w-4 h-4 text-[#6b6b7a]" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-[#1a1a23] border border-[#2a2a35] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#ea2127]"
            >
              <option value="all">All Status</option>
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
          </div>

          <span className="text-sm text-[#6b6b7a]">
            {tickets.length} ticket{tickets.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Tickets List */}
        <div className="space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <FiLoader className="w-8 h-8 text-[#ea2127] animate-spin" />
            </div>
          ) : tickets.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-2xl bg-[#1a1a23] flex items-center justify-center mx-auto mb-4">
                <FiMessageCircle className="w-8 h-8 text-[#3a3a48]" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">No tickets yet</h3>
              <p className="text-[#6b6b7a]">Create a ticket to get started</p>
            </div>
          ) : (
            tickets.map((ticket) => (
              <motion.div
                key={ticket.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => setSelectedTicket(ticket)}
                className="p-4 rounded-xl border border-[#2a2a35] bg-[#1a1a23] hover:bg-[#252530] cursor-pointer transition-all group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: `${STATUS_CONFIG[ticket.status]?.bgColor}` }}
                    >
                      {ticket.status === 'open' && <FiClock className="w-5 h-5" style={{ color: STATUS_CONFIG[ticket.status]?.color }} />}
                      {ticket.status === 'in_progress' && <FiLoader className="w-5 h-5 animate-spin" style={{ color: STATUS_CONFIG[ticket.status]?.color }} />}
                      {ticket.status === 'resolved' && <FiCheck className="w-5 h-5" style={{ color: STATUS_CONFIG[ticket.status]?.color }} />}
                      {ticket.status === 'closed' && <FiX className="w-5 h-5" style={{ color: STATUS_CONFIG[ticket.status]?.color }} />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-mono text-[#6b6b7a]">{ticket.ticket_number}</span>
                        <span
                          className="px-2 py-0.5 rounded text-xs font-medium"
                          style={{
                            backgroundColor: PRIORITY_CONFIG[ticket.priority]?.bgColor,
                            color: PRIORITY_CONFIG[ticket.priority]?.color,
                          }}
                        >
                          {PRIORITY_CONFIG[ticket.priority]?.label}
                        </span>
                      </div>
                      <h3 className="font-semibold text-white">{ticket.subject}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-[#6b6b7a]">{TYPE_LABELS[ticket.type]}</span>
                        <span className="text-xs text-[#3a3a48]">|</span>
                        <span className="text-xs text-[#6b6b7a]">{formatRelativeTime(ticket.created_at)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className="px-3 py-1 rounded-full text-sm font-medium"
                      style={{
                        backgroundColor: STATUS_CONFIG[ticket.status]?.bgColor,
                        color: STATUS_CONFIG[ticket.status]?.color,
                      }}
                    >
                      {STATUS_CONFIG[ticket.status]?.label}
                    </span>
                    <FiChevronRight className="w-5 h-5 text-[#3a3a48] group-hover:text-white transition-colors" />
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>

      {/* Create Ticket Modal */}
      <AnimatePresence>
        {showCreateModal && selectedTicketType && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
            onClick={() => setShowCreateModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#1a1a23] border border-[#2a2a35] rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
            >
              {/* Header */}
              <div className="px-6 py-5 border-b border-[#2a2a35] flex items-center gap-4">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: `${selectedTicketType.color}15` }}
                >
                  <span style={{ color: selectedTicketType.color }}>{selectedTicketType.icon}</span>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">New {selectedTicketType.label}</h2>
                  <p className="text-sm text-[#6b6b7a]">{selectedTicketType.description}</p>
                </div>
              </div>

              {/* Form */}
              <form onSubmit={handleCreateTicket} className="p-6 space-y-5">
                <div>
                  <label className="block text-sm font-medium text-[#8b8b9a] mb-2">Subject</label>
                  <input
                    type="text"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    placeholder="Brief summary of your request"
                    className="w-full px-4 py-3 bg-[#0f0f12] border border-[#2a2a35] rounded-xl text-white placeholder-[#4a4a58] focus:outline-none focus:border-[#ea2127]"
                    required
                  />
                </div>

                {/* Leave Request Specific Fields */}
                {selectedTicketType.key === 'leave_request' && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-[#8b8b9a] mb-2">Start Date</label>
                        <input
                          type="date"
                          value={formData.leave_start_date}
                          onChange={(e) => setFormData({ ...formData, leave_start_date: e.target.value })}
                          className="w-full px-4 py-3 bg-[#0f0f12] border border-[#2a2a35] rounded-xl text-white focus:outline-none focus:border-[#ea2127]"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-[#8b8b9a] mb-2">End Date</label>
                        <input
                          type="date"
                          value={formData.leave_end_date}
                          onChange={(e) => setFormData({ ...formData, leave_end_date: e.target.value })}
                          className="w-full px-4 py-3 bg-[#0f0f12] border border-[#2a2a35] rounded-xl text-white focus:outline-none focus:border-[#ea2127]"
                          required
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#8b8b9a] mb-2">Leave Type</label>
                      <select
                        value={formData.leave_type}
                        onChange={(e) => setFormData({ ...formData, leave_type: e.target.value })}
                        className="w-full px-4 py-3 bg-[#0f0f12] border border-[#2a2a35] rounded-xl text-white focus:outline-none focus:border-[#ea2127]"
                      >
                        <option value="vacation">Vacation</option>
                        <option value="sick">Sick Leave</option>
                        <option value="personal">Personal</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-sm font-medium text-[#8b8b9a] mb-2">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Provide details about your request..."
                    rows={4}
                    className="w-full px-4 py-3 bg-[#0f0f12] border border-[#2a2a35] rounded-xl text-white placeholder-[#4a4a58] focus:outline-none focus:border-[#ea2127] resize-none"
                    required
                  />
                </div>

                {/* Image Attachments - Only for client ticket types */}
                {['support', 'bug_report', 'feature_request'].includes(selectedTicketType.key) && (
                  <div>
                    <label className="block text-sm font-medium text-[#8b8b9a] mb-2">
                      <FiPaperclip className="inline w-4 h-4 mr-1" />
                      Attachments (optional)
                    </label>
                    <p className="text-xs text-[#6b6b7a] mb-3">
                      Add screenshots or images to help explain the issue. Max 5MB per file.
                    </p>

                    {/* Pending Attachments Preview */}
                    {pendingAttachments.length > 0 && (
                      <div className="grid grid-cols-3 gap-3 mb-3">
                        {pendingAttachments.map((attachment) => (
                          <div
                            key={attachment.id}
                            className="relative group rounded-xl overflow-hidden border border-[#2a2a35] bg-[#0f0f12]"
                          >
                            <img
                              src={attachment.preview}
                              alt={attachment.file.name}
                              className="w-full h-24 object-cover"
                            />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <button
                                type="button"
                                onClick={() => removePendingAttachment(attachment.id)}
                                className="p-2 bg-[#ea2127] rounded-lg hover:bg-[#d91e24] transition-colors"
                              >
                                <FiTrash2 className="w-4 h-4 text-white" />
                              </button>
                            </div>
                            <div className="absolute bottom-0 left-0 right-0 px-2 py-1 bg-black/70 text-xs text-white truncate">
                              {attachment.file.name}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Upload Button */}
                    <label className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-[#0f0f12] border border-dashed border-[#3a3a48] rounded-xl text-[#6b6b7a] hover:border-[#ea2127] hover:text-[#ea2127] cursor-pointer transition-colors">
                      <FiImage className="w-5 h-5" />
                      <span>Add Images</span>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                    </label>
                  </div>
                )}

                {/* Priority - Only for staff ticket types */}
                {!['support', 'bug_report', 'feature_request'].includes(selectedTicketType.key) && (
                  <div>
                    <label className="block text-sm font-medium text-[#8b8b9a] mb-2">Priority</label>
                    <div className="flex gap-2">
                      {Object.entries(PRIORITY_CONFIG).map(([key, config]) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setFormData({ ...formData, priority: key })}
                          className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                            formData.priority === key
                              ? 'ring-2 ring-offset-2 ring-offset-[#1a1a23]'
                              : 'opacity-60 hover:opacity-100'
                          }`}
                          style={{
                            backgroundColor: config.bgColor,
                            color: config.color,
                            ...(formData.priority === key && { '--tw-ring-color': config.color } as React.CSSProperties),
                          }}
                        >
                          {config.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 px-4 py-3 bg-[#252530] text-white rounded-xl hover:bg-[#2a2a38] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 px-4 py-3 bg-[#ea2127] text-white rounded-xl hover:bg-[#d91e24] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {submitting ? (
                      <>
                        <FiLoader className="w-4 h-4 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <FiPlus className="w-4 h-4" />
                        Submit Ticket
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* View Ticket Modal */}
      <AnimatePresence>
        {selectedTicket && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedTicket(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#1a1a23] border border-[#2a2a35] rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
            >
              {/* Header */}
              <div className="px-6 py-5 border-b border-[#2a2a35]">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-sm text-[#6b6b7a]">{selectedTicket.ticket_number}</span>
                  <div className="flex items-center gap-2">
                    {canDeleteTicket && (
                      <button
                        onClick={() => confirmDeleteTicket(selectedTicket)}
                        className="p-1.5 rounded hover:bg-[#ea2127]/20 text-[#6b6b7a] hover:text-[#ea2127] transition-colors"
                        title="Delete ticket"
                      >
                        <FiTrash2 className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => setSelectedTicket(null)}
                      className="p-1 rounded hover:bg-[#252530]"
                    >
                      <FiX className="w-5 h-5 text-[#6b6b7a]" />
                    </button>
                  </div>
                </div>
                <h2 className="text-xl font-bold text-white">{selectedTicket.subject}</h2>
                <div className="flex items-center gap-3 mt-3">
                  <span
                    className="px-3 py-1 rounded-full text-sm font-medium"
                    style={{
                      backgroundColor: STATUS_CONFIG[selectedTicket.status]?.bgColor,
                      color: STATUS_CONFIG[selectedTicket.status]?.color,
                    }}
                  >
                    {STATUS_CONFIG[selectedTicket.status]?.label}
                  </span>
                  <span
                    className="px-2 py-1 rounded text-xs font-medium"
                    style={{
                      backgroundColor: PRIORITY_CONFIG[selectedTicket.priority]?.bgColor,
                      color: PRIORITY_CONFIG[selectedTicket.priority]?.color,
                    }}
                  >
                    {PRIORITY_CONFIG[selectedTicket.priority]?.label}
                  </span>
                  <span className="text-sm text-[#6b6b7a]">{TYPE_LABELS[selectedTicket.type]}</span>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Description */}
                <div>
                  <h3 className="text-sm font-semibold text-[#8b8b9a] mb-2">Description</h3>
                  <p className="text-white whitespace-pre-wrap">{selectedTicket.description}</p>
                </div>

                {/* Attachments */}
                {ticketAttachments.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-[#8b8b9a] mb-3 flex items-center gap-2">
                      <FiPaperclip className="w-4 h-4" />
                      Attachments ({ticketAttachments.length})
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {ticketAttachments.map((attachment) => (
                        <AttachmentPreview
                          key={attachment.id}
                          attachment={attachment}
                          getAttachmentUrl={getAttachmentUrl}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Leave Details */}
                {selectedTicket.type === 'leave_request' && selectedTicket.leave_start_date && (
                  <div className="p-4 bg-[#0f0f12] rounded-xl border border-[#2a2a35]">
                    <h3 className="text-sm font-semibold text-[#8b8b9a] mb-3">Leave Details</h3>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <span className="text-xs text-[#6b6b7a]">Start Date</span>
                        <p className="text-white">{new Date(selectedTicket.leave_start_date).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <span className="text-xs text-[#6b6b7a]">End Date</span>
                        <p className="text-white">{selectedTicket.leave_end_date ? new Date(selectedTicket.leave_end_date).toLocaleDateString() : '-'}</p>
                      </div>
                      <div>
                        <span className="text-xs text-[#6b6b7a]">Type</span>
                        <p className="text-white capitalize">{selectedTicket.leave_type || '-'}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Admin Actions */}
                {isTicketManager && selectedTicket.status !== 'closed' && (
                  <div className="p-4 bg-[#252530] rounded-xl border border-[#3a3a48]">
                    <h3 className="text-sm font-semibold text-[#8b8b9a] mb-3">Update Status</h3>
                    <div className="flex gap-2">
                      {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                        <button
                          key={key}
                          onClick={() => handleUpdateStatus(selectedTicket.id, key)}
                          disabled={selectedTicket.status === key}
                          className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                            selectedTicket.status === key ? 'ring-2' : 'opacity-60 hover:opacity-100'
                          }`}
                          style={{
                            backgroundColor: config.bgColor,
                            color: config.color,
                          }}
                        >
                          {config.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Resolution Notes */}
                {selectedTicket.resolution_notes && (
                  <div className="p-4 bg-green-500/10 rounded-xl border border-green-500/30">
                    <h3 className="text-sm font-semibold text-green-400 mb-2">Resolution</h3>
                    <p className="text-white">{selectedTicket.resolution_notes}</p>
                  </div>
                )}

                {/* Comments */}
                <div>
                  <h3 className="text-sm font-semibold text-[#8b8b9a] mb-3">Comments ({comments.length})</h3>
                  <div className="space-y-3">
                    {comments.map((comment) => (
                      <div
                        key={comment.id}
                        className={`p-4 rounded-xl ${
                          comment.is_admin_reply
                            ? 'bg-[#ea2127]/10 border border-[#ea2127]/30'
                            : 'bg-[#0f0f12] border border-[#2a2a35]'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`text-sm font-medium ${comment.is_admin_reply ? 'text-[#ea2127]' : 'text-white'}`}>
                            {comment.is_admin_reply ? 'Admin Reply' : 'You'}
                          </span>
                          <span className="text-xs text-[#6b6b7a]">{formatRelativeTime(comment.created_at)}</span>
                        </div>
                        <p className="text-white">{comment.content}</p>
                      </div>
                    ))}
                  </div>

                  {/* Add Comment */}
                  {selectedTicket.status !== 'closed' && (
                    <div className="mt-4 flex gap-2">
                      <input
                        type="text"
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Add a comment..."
                        className="flex-1 px-4 py-3 bg-[#0f0f12] border border-[#2a2a35] rounded-xl text-white placeholder-[#4a4a58] focus:outline-none focus:border-[#ea2127]"
                        onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
                      />
                      <button
                        onClick={handleAddComment}
                        disabled={!newComment.trim() || submitting}
                        className="px-4 py-3 bg-[#ea2127] text-white rounded-xl hover:bg-[#d91e24] transition-colors disabled:opacity-50"
                      >
                        Send
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-[#2a2a35] text-sm text-[#6b6b7a]">
                Created {formatRelativeTime(selectedTicket.created_at)}
                {selectedTicket.resolved_at && (
                  <span> | Resolved {formatRelativeTime(selectedTicket.resolved_at)}</span>
                )}
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
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[60] p-4"
            onClick={() => {
              setShowDeleteModal(false);
              setTicketToDelete(null);
            }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#1a1a23] border border-[#2a2a35] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl"
            >
              {/* Icon */}
              <div className="pt-8 pb-4 flex justify-center">
                <div className="w-16 h-16 rounded-full bg-[#ea2127]/20 flex items-center justify-center">
                  <FiTrash2 className="w-8 h-8 text-[#ea2127]" />
                </div>
              </div>

              {/* Content */}
              <div className="px-6 pb-6 text-center">
                <h3 className="text-xl font-bold text-white mb-2">Delete Ticket?</h3>
                <p className="text-[#8b8b9e] mb-2">
                  You are about to delete ticket
                </p>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#252530] rounded-lg mb-4">
                  <span className="font-mono text-sm text-[#ea2127] font-medium">
                    {ticketToDelete.ticket_number}
                  </span>
                  <span className="text-[#6b6b7a]">-</span>
                  <span className="text-sm text-white truncate max-w-[200px]">
                    {ticketToDelete.subject}
                  </span>
                </div>
                <p className="text-[#6b6b7a] text-sm">
                  This action cannot be undone. All comments and attachments will also be deleted.
                </p>
              </div>

              {/* Actions */}
              <div className="px-6 pb-6 flex gap-3">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setTicketToDelete(null);
                  }}
                  disabled={deleting}
                  className="flex-1 px-4 py-3 bg-[#252530] hover:bg-[#3a3a48] text-white rounded-xl font-medium transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteTicket}
                  disabled={deleting}
                  className="flex-1 px-4 py-3 bg-[#ea2127] hover:bg-[#d41e23] text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {deleting ? (
                    <>
                      <FiLoader className="w-4 h-4 animate-spin" />
                      <span>Deleting...</span>
                    </>
                  ) : (
                    <>
                      <FiTrash2 className="w-4 h-4" />
                      <span>Delete</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Attachment Preview Component
function AttachmentPreview({
  attachment,
  getAttachmentUrl,
}: {
  attachment: TicketAttachment;
  getAttachmentUrl: (filePath: string) => Promise<string | null>;
}) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const loadImage = async () => {
      const url = await getAttachmentUrl(attachment.file_path);
      setImageUrl(url);
      setLoading(false);
    };
    loadImage();
  }, [attachment.file_path, getAttachmentUrl]);

  return (
    <>
      <div
        className="relative group rounded-xl overflow-hidden border border-[#2a2a35] bg-[#0f0f12] cursor-pointer"
        onClick={() => setExpanded(true)}
      >
        {loading ? (
          <div className="w-full h-28 flex items-center justify-center">
            <FiLoader className="w-5 h-5 text-[#6b6b7a] animate-spin" />
          </div>
        ) : imageUrl ? (
          <img
            src={imageUrl}
            alt={attachment.file_name}
            className="w-full h-28 object-cover group-hover:scale-105 transition-transform"
          />
        ) : (
          <div className="w-full h-28 flex items-center justify-center text-[#6b6b7a]">
            <FiImage className="w-8 h-8" />
          </div>
        )}
        <div className="absolute bottom-0 left-0 right-0 px-2 py-1.5 bg-gradient-to-t from-black/80 to-transparent">
          <span className="text-xs text-white truncate block">{attachment.file_name}</span>
        </div>
      </div>

      {/* Expanded Image Modal */}
      <AnimatePresence>
        {expanded && imageUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 flex items-center justify-center z-[60] p-4"
            onClick={() => setExpanded(false)}
          >
            <button
              className="absolute top-4 right-4 p-2 bg-[#252530] rounded-lg hover:bg-[#3a3a48] transition-colors"
              onClick={() => setExpanded(false)}
            >
              <FiX className="w-6 h-6 text-white" />
            </button>
            <motion.img
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              src={imageUrl}
              alt={attachment.file_name}
              className="max-w-full max-h-[85vh] object-contain rounded-xl"
              onClick={(e) => e.stopPropagation()}
            />
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-[#252530] rounded-xl">
              <span className="text-sm text-white">{attachment.file_name}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
