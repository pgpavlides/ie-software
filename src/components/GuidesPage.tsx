import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Editor } from '@tiptap/react';
import {
  FiBook,
  FiPlus,
  FiSearch,
  FiArrowLeft,
  FiGrid,
  FiList,
  FiEye,
  FiClock,
  FiUser,
  FiX,
  FiSave,
  FiEdit2,
  FiTrash2,
  FiChevronRight,
  FiBookOpen,
  FiFileText,
  FiLoader,
  FiImage,
  FiUpload,
} from 'react-icons/fi';
import supabase from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import TiptapEditor, { TiptapToolbar } from './TiptapEditor';

// Types
interface Department {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  display_order: number;
  is_active: boolean;
}

interface Guide {
  id: string;
  title: string;
  slug: string;
  content: string;
  summary: string | null;
  department_id: string | null;
  author_id: string | null;
  cover_image: string | null;
  is_published: boolean;
  is_featured: boolean;
  view_count: number;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  departments?: {
    id: string;
    name: string;
    icon: string;
    color: string;
  } | null;
  user_profiles?: {
    display_name: string;
    role_name: string | null;
    role_color: string | null;
  } | null;
}


// Icon mapping for departments
const DEPARTMENT_ICONS: Record<string, React.ReactNode> = {
  crown: <FiUser className="w-6 h-6" />,
  settings: <FiGrid className="w-6 h-6" />,
  code: <FiFileText className="w-6 h-6" />,
  calculator: <FiGrid className="w-6 h-6" />,
  megaphone: <FiBookOpen className="w-6 h-6" />,
  palette: <FiEdit2 className="w-6 h-6" />,
  hammer: <FiGrid className="w-6 h-6" />,
  cog: <FiGrid className="w-6 h-6" />,
  zap: <FiGrid className="w-6 h-6" />,
  clipboard: <FiFileText className="w-6 h-6" />,
};

const getDepartmentIcon = (iconName: string) => {
  return DEPARTMENT_ICONS[iconName] || <FiBook className="w-6 h-6" />;
};

// Format date helper
const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const formatRelativeTime = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  return formatDate(dateString);
};

// Department Card Component
const DepartmentCard: React.FC<{
  department: Department;
  guideCount: number;
  index: number;
  onClick: () => void;
}> = ({ department, guideCount, index, onClick }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.4 }}
      onClick={onClick}
      className="group relative cursor-pointer"
    >
      <div
        className="relative overflow-hidden rounded-2xl bg-[#141418] border-2 border-[#1f1f28] hover:border-[#2a2a35] transition-all duration-300 p-6"
        style={{
          boxShadow: `0 0 0 0 ${department.color}00`,
        }}
      >
        {/* Accent bar */}
        <div
          className="absolute left-0 top-0 bottom-0 w-1 transition-all duration-300 group-hover:w-1.5"
          style={{ backgroundColor: department.color }}
        />

        {/* Glow effect on hover */}
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
          style={{
            background: `radial-gradient(circle at 20% 50%, ${department.color}08 0%, transparent 50%)`,
          }}
        />

        <div className="relative flex items-start gap-4 h-[88px]">
          <div
            className="flex-shrink-0 w-14 h-14 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110"
            style={{ backgroundColor: `${department.color}15` }}
          >
            <span style={{ color: department.color }}>
              {getDepartmentIcon(department.icon)}
            </span>
          </div>

          <div className="flex-1 min-w-0 flex flex-col">
            <h3 className="text-lg font-semibold text-white group-hover:text-[#ea2127] transition-colors truncate">
              {department.name}
            </h3>
            <p className="text-sm text-[#6b6b7a] mt-1 line-clamp-2 flex-1">
              {department.description}
            </p>
            <div className="flex items-center gap-2 mt-auto pt-2">
              <span
                className="px-2.5 py-1 rounded-lg text-xs font-medium"
                style={{
                  backgroundColor: `${department.color}15`,
                  color: department.color,
                }}
              >
                {guideCount} {guideCount === 1 ? 'guide' : 'guides'}
              </span>
            </div>
          </div>

          <FiChevronRight className="w-5 h-5 text-[#4a4a58] group-hover:text-[#ea2127] group-hover:translate-x-1 transition-all flex-shrink-0" />
        </div>
      </div>
    </motion.div>
  );
};

// Recent Guide Item Component
const RecentGuideItem: React.FC<{
  guide: Guide;
  index: number;
  onClick: () => void;
}> = ({ guide, index, onClick }) => {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      onClick={onClick}
      className="group flex items-center gap-4 p-4 rounded-xl bg-[#141418]/50 hover:bg-[#1a1a23] border border-[#1f1f28] hover:border-[#2a2a35] cursor-pointer transition-all"
    >
      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-[#1f1f28] flex items-center justify-center">
        <FiFileText className="w-5 h-5 text-[#6b6b7a] group-hover:text-[#ea2127] transition-colors" />
      </div>

      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-medium text-white group-hover:text-[#ea2127] transition-colors truncate">
          {guide.title}
        </h4>
        <div className="flex items-center gap-3 mt-1">
          {guide.departments && (
            <span
              className="px-2 py-0.5 rounded text-xs font-medium"
              style={{
                backgroundColor: `${guide.departments.color}15`,
                color: guide.departments.color,
              }}
            >
              {guide.departments.name}
            </span>
          )}
          <span className="text-xs text-[#5a5a68]">
            {guide.user_profiles?.display_name || 'Unknown'}
            {guide.user_profiles?.role_name && (
              <span
                className="ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-medium"
                style={{
                  backgroundColor: `${guide.user_profiles.role_color || '#6b7280'}15`,
                  color: guide.user_profiles.role_color || '#6b7280',
                }}
              >
                {guide.user_profiles.role_name}
              </span>
            )}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-4 text-[#5a5a68]">
        <div className="flex items-center gap-1.5">
          <FiEye className="w-3.5 h-3.5" />
          <span className="text-xs">{guide.view_count}</span>
        </div>
        <span className="text-xs">{formatRelativeTime(guide.created_at)}</span>
      </div>
    </motion.div>
  );
};

// Guide Card Component for department view
const GuideCard: React.FC<{
  guide: Guide;
  index: number;
  viewMode: 'grid' | 'list';
  onClick: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  canEdit: boolean;
}> = ({ guide, index, viewMode, onClick, onEdit, onDelete, canEdit }) => {
  if (viewMode === 'list') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.03 }}
        className="group flex items-center gap-4 p-4 rounded-xl bg-[#141418] hover:bg-[#1a1a23] border border-[#1f1f28] hover:border-[#2a2a35] cursor-pointer transition-all"
        onClick={onClick}
      >
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-white group-hover:text-[#ea2127] transition-colors">
            {guide.title}
          </h4>
          {guide.summary && (
            <p className="text-sm text-[#6b6b7a] mt-1 line-clamp-1">{guide.summary}</p>
          )}
          <div className="flex items-center gap-4 mt-2 text-xs text-[#5a5a68]">
            <span className="flex items-center gap-1">
              <FiUser className="w-3 h-3" />
              {guide.user_profiles?.display_name || 'Unknown'}
              {guide.user_profiles?.role_name && (
                <span
                  className="ml-1 px-1.5 py-0.5 rounded text-[10px] font-medium"
                  style={{
                    backgroundColor: `${guide.user_profiles.role_color || '#6b7280'}15`,
                    color: guide.user_profiles.role_color || '#6b7280',
                  }}
                >
                  {guide.user_profiles.role_name}
                </span>
              )}
            </span>
            <span className="flex items-center gap-1">
              <FiClock className="w-3 h-3" />
              {formatDate(guide.created_at)}
            </span>
            <span className="flex items-center gap-1">
              <FiEye className="w-3 h-3" />
              {guide.view_count}
            </span>
          </div>
        </div>

        {canEdit && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => { e.stopPropagation(); onEdit?.(); }}
              className="p-2 text-[#6b6b7a] hover:text-white hover:bg-[#2a2a35] rounded-lg transition-colors"
            >
              <FiEdit2 className="w-4 h-4" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete?.(); }}
              className="p-2 text-[#6b6b7a] hover:text-[#ea2127] hover:bg-[#ea2127]/10 rounded-lg transition-colors"
            >
              <FiTrash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="group relative rounded-2xl bg-[#141418] hover:bg-[#1a1a23] border border-[#1f1f28] hover:border-[#2a2a35] cursor-pointer transition-all overflow-hidden"
      onClick={onClick}
    >
      {/* Cover image or gradient */}
      <div
        className="h-32 w-full"
        style={{
          background: guide.cover_image
            ? `url(${guide.cover_image}) center/cover`
            : `linear-gradient(135deg, ${guide.departments?.color || '#ea2127'}20 0%, transparent 100%)`,
        }}
      />

      <div className="p-5">
        <h4 className="font-semibold text-white group-hover:text-[#ea2127] transition-colors line-clamp-2">
          {guide.title}
        </h4>
        {guide.summary && (
          <p className="text-sm text-[#6b6b7a] mt-2 line-clamp-2">{guide.summary}</p>
        )}
        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-[#2a2a35] flex items-center justify-center">
              <FiUser className="w-3 h-3 text-[#6b6b7a]" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-[#6b6b7a]">{guide.user_profiles?.display_name || 'Unknown'}</span>
              {guide.user_profiles?.role_name && (
                <span
                  className="text-[10px] font-medium"
                  style={{ color: guide.user_profiles.role_color || '#6b7280' }}
                >
                  {guide.user_profiles.role_name}
                </span>
              )}
            </div>
          </div>
          <span className="text-xs text-[#5a5a68]">{formatRelativeTime(guide.created_at)}</span>
        </div>
      </div>

      {canEdit && (
        <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => { e.stopPropagation(); onEdit?.(); }}
            className="p-2 bg-[#1a1a23]/90 backdrop-blur text-white hover:bg-[#2a2a35] rounded-lg transition-colors"
          >
            <FiEdit2 className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete?.(); }}
            className="p-2 bg-[#1a1a23]/90 backdrop-blur text-white hover:bg-[#ea2127] rounded-lg transition-colors"
          >
            <FiTrash2 className="w-4 h-4" />
          </button>
        </div>
      )}
    </motion.div>
  );
};

// Main Component
const GuidesPage: React.FC = () => {
  const { user, hasRole } = useAuthStore();

  // View state
  const [viewMode, setViewMode] = useState<'departments' | 'department-guides' | 'guide-detail' | 'editor'>('departments');
  const [previousViewMode, setPreviousViewMode] = useState<'departments' | 'department-guides' | 'guide-detail'>('departments');
  const [listViewMode, setListViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);
  const [selectedGuide, setSelectedGuide] = useState<Guide | null>(null);

  // Data state
  const [departments, setDepartments] = useState<Department[]>([]);
  const [guides, setGuides] = useState<Guide[]>([]);
  const [guideCounts, setGuideCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Editor state
  const [editingGuide, setEditingGuide] = useState<Guide | null>(null);
  const [editorTitle, setEditorTitle] = useState('');
  const [editorSummary, setEditorSummary] = useState('');
  const [editorContent, setEditorContent] = useState('');
  const [editorDepartmentId, setEditorDepartmentId] = useState<string>('');
  const [editorIsPublished, setEditorIsPublished] = useState(false);
  const [editorCoverImage, setEditorCoverImage] = useState<string>('');
  const [uploadingCover, setUploadingCover] = useState(false);
  const [saving, setSaving] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);

  // Delete confirmation
  const [deleteConfirmGuide, setDeleteConfirmGuide] = useState<Guide | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Editor ref for external toolbar
  const editorRef = useRef<Editor | null>(null);

  // Check if user can write guides (not Client or Prospect)
  const canWriteGuides = !hasRole('Client') && !hasRole('Prospect') && !!user;

  // Upload image to Supabase Storage
  const uploadImage = useCallback(async (file: File, folder: 'covers' | 'content' = 'content'): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop()?.toLowerCase();
      const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('guides-data')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        return null;
      }

      const { data } = supabase.storage
        .from('guides-data')
        .getPublicUrl(fileName);

      return data.publicUrl;
    } catch (err) {
      console.error('Upload failed:', err);
      return null;
    }
  }, []);

  // Handle cover image upload
  const handleCoverUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingCover(true);
    const url = await uploadImage(file, 'covers');
    if (url) {
      setEditorCoverImage(url);
    }
    setUploadingCover(false);

    // Reset input
    if (coverInputRef.current) {
      coverInputRef.current.value = '';
    }
  }, [uploadImage]);

  // Handler for inline image upload in TiptapEditor
  const handleInlineImageUpload = useCallback(async (file: File): Promise<string | null> => {
    return await uploadImage(file, 'content');
  }, [uploadImage]);

  // Fetch departments
  const fetchDepartments = useCallback(async () => {
    const { data, error } = await supabase
      .from('departments')
      .select('*')
      .eq('is_active', true)
      .order('display_order');

    if (!error && data) {
      setDepartments(data);
    }
  }, []);

  // Fetch guides
  const fetchGuides = useCallback(async () => {
    // First fetch guides with departments
    const { data: guidesData, error } = await supabase
      .from('guides')
      .select(`
        *,
        departments:department_id(id, name, icon, color)
      `)
      .order('created_at', { ascending: false });

    if (error || !guidesData) {
      console.error('Error fetching guides:', error);
      setLoading(false);
      return;
    }

    // Get unique author IDs
    const authorIds = [...new Set(guidesData.map(g => g.author_id).filter(Boolean))];

    // Fetch user profiles for authors
    let userProfilesMap: Record<string, { display_name: string; role_name: string | null; role_color: string | null }> = {};

    if (authorIds.length > 0) {
      const { data: profiles } = await supabase
        .rpc('get_user_profiles', { user_ids: authorIds });

      if (profiles) {
        userProfilesMap = profiles.reduce((acc: typeof userProfilesMap, p: { id: string; display_name: string; role_name: string | null; role_color: string | null }) => {
          acc[p.id] = { display_name: p.display_name, role_name: p.role_name, role_color: p.role_color };
          return acc;
        }, {} as typeof userProfilesMap);
      }
    }

    // Merge user profiles into guides
    const data = guidesData.map(guide => ({
      ...guide,
      user_profiles: guide.author_id ? userProfilesMap[guide.author_id] || null : null
    }));

    if (!error && data) {
      setGuides(data);

      // Calculate guide counts per department
      const counts: Record<string, number> = {};
      data.forEach((guide: Guide) => {
        if (guide.department_id && guide.is_published) {
          counts[guide.department_id] = (counts[guide.department_id] || 0) + 1;
        }
      });
      setGuideCounts(counts);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchDepartments();
    fetchGuides();
  }, [fetchDepartments, fetchGuides]);

  // Filter guides based on view and search
  const filteredGuides = guides.filter((guide) => {
    // Only show published guides unless user is the author
    const canSee = guide.is_published || guide.author_id === user?.id;
    if (!canSee) return false;

    // Filter by department if in department view
    if (viewMode === 'department-guides' && selectedDepartment) {
      if (guide.department_id !== selectedDepartment.id) return false;
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        guide.title.toLowerCase().includes(query) ||
        guide.summary?.toLowerCase().includes(query) ||
        guide.departments?.name.toLowerCase().includes(query)
      );
    }

    return true;
  });

  // Recent guides (last 5 published)
  const recentGuides = guides
    .filter((g) => g.is_published)
    .slice(0, 5);

  // Handle department click
  const handleDepartmentClick = (department: Department) => {
    setSelectedDepartment(department);
    setViewMode('department-guides');
  };

  // Handle guide click
  const handleGuideClick = async (guide: Guide) => {
    setSelectedGuide(guide);
    setViewMode('guide-detail');

    // Increment view count
    await supabase
      .from('guides')
      .update({ view_count: guide.view_count + 1 })
      .eq('id', guide.id);
  };

  // Handle back navigation
  const handleBack = () => {
    if (viewMode === 'guide-detail') {
      if (selectedDepartment) {
        setViewMode('department-guides');
      } else {
        setViewMode('departments');
      }
      setSelectedGuide(null);
    } else if (viewMode === 'department-guides') {
      setViewMode('departments');
      setSelectedDepartment(null);
    }
  };

  // Open editor for new guide
  const openNewGuide = () => {
    setEditingGuide(null);
    setEditorTitle('');
    setEditorSummary('');
    setEditorContent('');
    setEditorDepartmentId(selectedDepartment?.id || '');
    setEditorIsPublished(false);
    setEditorCoverImage('');
    setPreviousViewMode(viewMode as 'departments' | 'department-guides' | 'guide-detail');
    setViewMode('editor');
  };

  // Open editor for existing guide
  const openEditGuide = (guide: Guide) => {
    setEditingGuide(guide);
    setEditorTitle(guide.title);
    setEditorSummary(guide.summary || '');
    setEditorContent(guide.content);
    setEditorDepartmentId(guide.department_id || '');
    setEditorIsPublished(guide.is_published);
    setEditorCoverImage(guide.cover_image || '');
    setPreviousViewMode(viewMode as 'departments' | 'department-guides' | 'guide-detail');
    setViewMode('editor');
  };

  // Close editor and go back
  const closeEditor = () => {
    // If we came from guide-detail but the guide was deleted or is new, go to departments
    if (previousViewMode === 'guide-detail' && !editingGuide) {
      setViewMode('departments');
    } else {
      setViewMode(previousViewMode || 'departments');
    }
    setEditingGuide(null);
  };

  // Save guide
  const handleSaveGuide = async () => {
    if (!editorTitle.trim()) return;

    setSaving(true);

    const slug = editorTitle
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') + '-' + Date.now();

    const guideData = {
      title: editorTitle,
      slug: editingGuide?.slug || slug,
      content: editorContent,
      summary: editorSummary || null,
      department_id: editorDepartmentId || null,
      cover_image: editorCoverImage || null,
      is_published: editorIsPublished,
      published_at: editorIsPublished ? new Date().toISOString() : null,
    };

    if (editingGuide) {
      // Update existing
      const { error } = await supabase
        .from('guides')
        .update(guideData)
        .eq('id', editingGuide.id);

      if (!error) {
        closeEditor();
        fetchGuides();
      }
    } else {
      // Create new
      const { error } = await supabase
        .from('guides')
        .insert({
          ...guideData,
          author_id: user?.id,
        });

      if (!error) {
        closeEditor();
        fetchGuides();
      }
    }

    setSaving(false);
  };

  // Delete guide
  const handleDeleteGuide = async () => {
    if (!deleteConfirmGuide) return;

    setDeleting(true);

    const { error } = await supabase
      .from('guides')
      .delete()
      .eq('id', deleteConfirmGuide.id);

    if (!error) {
      setDeleteConfirmGuide(null);
      if (selectedGuide?.id === deleteConfirmGuide.id) {
        handleBack();
      }
      fetchGuides();
    }

    setDeleting(false);
  };

  // Check if user can edit a specific guide
  const canEditGuide = (guide: Guide) => {
    if (!canWriteGuides) return false;
    if (guide.author_id === user?.id) return true;
    if (hasRole('Super Admin') || hasRole('Admin') || hasRole('Boss')) return true;
    return false;
  };

  return (
    <div className="min-h-screen bg-[#0f0f12] text-white">
      {/* Background texture */}
      <div className="fixed inset-0 opacity-30 pointer-events-none">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `radial-gradient(circle at 50% 0%, #ea212710 0%, transparent 50%)`,
          }}
        />
      </div>

      <div className="relative max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <header className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            {viewMode !== 'departments' && (
              <motion.button
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                onClick={handleBack}
                className="p-2 text-[#6b6b7a] hover:text-white hover:bg-[#1f1f28] rounded-xl transition-colors"
              >
                <FiArrowLeft className="w-5 h-5" />
              </motion.button>
            )}

            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#ea2127]/10 flex items-center justify-center">
                  <FiBook className="w-5 h-5 text-[#ea2127]" />
                </div>
                {viewMode === 'departments' && 'Guides'}
                {viewMode === 'department-guides' && selectedDepartment?.name}
                {viewMode === 'guide-detail' && 'Guide'}
              </h1>
              {viewMode === 'departments' && (
                <p className="text-[#6b6b7a] mt-1">Knowledge base organized by department</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Search */}
            {viewMode !== 'guide-detail' && (
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5a5a68]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search guides..."
                  className="w-64 pl-10 pr-4 py-2.5 bg-[#141418] border border-[#2a2a35] rounded-xl text-white placeholder-[#5a5a68] focus:outline-none focus:border-[#ea2127]/50 transition-colors"
                />
              </div>
            )}

            {/* View toggle for department guides */}
            {viewMode === 'department-guides' && (
              <div className="flex items-center bg-[#141418] border border-[#2a2a35] rounded-xl p-1">
                <button
                  onClick={() => setListViewMode('grid')}
                  className={`p-2 rounded-lg transition-colors ${
                    listViewMode === 'grid'
                      ? 'bg-[#ea2127] text-white'
                      : 'text-[#6b6b7a] hover:text-white'
                  }`}
                >
                  <FiGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setListViewMode('list')}
                  className={`p-2 rounded-lg transition-colors ${
                    listViewMode === 'list'
                      ? 'bg-[#ea2127] text-white'
                      : 'text-[#6b6b7a] hover:text-white'
                  }`}
                >
                  <FiList className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* New Guide button */}
            {canWriteGuides && viewMode !== 'guide-detail' && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={openNewGuide}
                className="flex items-center gap-2 px-4 py-2.5 bg-[#ea2127] hover:bg-[#d11920] text-white rounded-xl font-medium transition-colors"
              >
                <FiPlus className="w-4 h-4" />
                <span>New Guide</span>
              </motion.button>
            )}
          </div>
        </header>

        {/* Content */}
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center justify-center py-20"
            >
              <FiLoader className="w-8 h-8 text-[#ea2127] animate-spin" />
            </motion.div>
          ) : viewMode === 'departments' ? (
            <motion.div
              key="departments"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {/* Department Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-12">
                {departments.map((dept, index) => (
                  <DepartmentCard
                    key={dept.id}
                    department={dept}
                    guideCount={guideCounts[dept.id] || 0}
                    index={index}
                    onClick={() => handleDepartmentClick(dept)}
                  />
                ))}
              </div>

              {/* Recent Guides Section */}
              {recentGuides.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                      <FiClock className="w-5 h-5 text-[#6b6b7a]" />
                      Recent Guides
                    </h2>
                  </div>

                  <div className="space-y-2">
                    {recentGuides.map((guide, index) => (
                      <RecentGuideItem
                        key={guide.id}
                        guide={guide}
                        index={index}
                        onClick={() => handleGuideClick(guide)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Empty state */}
              {departments.length === 0 && recentGuides.length === 0 && (
                <div className="text-center py-20">
                  <div className="w-20 h-20 rounded-2xl bg-[#1a1a23] flex items-center justify-center mx-auto mb-4">
                    <FiBook className="w-10 h-10 text-[#3a3a48]" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">No guides yet</h3>
                  <p className="text-[#6b6b7a] mb-6">Be the first to create a guide!</p>
                  {canWriteGuides && (
                    <button
                      onClick={openNewGuide}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-[#ea2127] hover:bg-[#d11920] text-white rounded-xl font-medium transition-colors"
                    >
                      <FiPlus className="w-4 h-4" />
                      Create Guide
                    </button>
                  )}
                </div>
              )}
            </motion.div>
          ) : viewMode === 'department-guides' ? (
            <motion.div
              key="department-guides"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              {/* Department header */}
              {selectedDepartment && (
                <div className="flex items-center gap-4 mb-6 p-4 bg-[#141418] border border-[#1f1f28] rounded-2xl">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: `${selectedDepartment.color}15` }}
                  >
                    <span style={{ color: selectedDepartment.color }}>
                      {getDepartmentIcon(selectedDepartment.icon)}
                    </span>
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-white">{selectedDepartment.name}</h2>
                    <p className="text-sm text-[#6b6b7a]">{selectedDepartment.description}</p>
                  </div>
                </div>
              )}

              {/* Guides list */}
              {filteredGuides.length > 0 ? (
                <div className={
                  listViewMode === 'grid'
                    ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
                    : 'space-y-2'
                }>
                  {filteredGuides.map((guide, index) => (
                    <GuideCard
                      key={guide.id}
                      guide={guide}
                      index={index}
                      viewMode={listViewMode}
                      onClick={() => handleGuideClick(guide)}
                      onEdit={() => openEditGuide(guide)}
                      onDelete={() => setDeleteConfirmGuide(guide)}
                      canEdit={canEditGuide(guide)}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-20">
                  <div className="w-20 h-20 rounded-2xl bg-[#1a1a23] flex items-center justify-center mx-auto mb-4">
                    <FiFileText className="w-10 h-10 text-[#3a3a48]" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">No guides in this department</h3>
                  <p className="text-[#6b6b7a] mb-6">Create the first guide for {selectedDepartment?.name}</p>
                  {canWriteGuides && (
                    <button
                      onClick={openNewGuide}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-[#ea2127] hover:bg-[#d11920] text-white rounded-xl font-medium transition-colors"
                    >
                      <FiPlus className="w-4 h-4" />
                      Create Guide
                    </button>
                  )}
                </div>
              )}
            </motion.div>
          ) : viewMode === 'guide-detail' && selectedGuide ? (
            <motion.div
              key="guide-detail"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="-mx-6 -mt-6"
            >
              {/* Header Bar */}
              <div className="bg-[#141418] border-b border-[#2a2a35] px-4 py-3 flex items-center justify-between sticky top-0 z-20">
                <div className="flex items-center gap-4">
                  <button
                    onClick={handleBack}
                    className="flex items-center gap-2 px-3 py-2 text-[#8b8b9a] hover:text-white hover:bg-[#1f1f28] rounded-lg transition-colors"
                  >
                    <FiArrowLeft className="w-5 h-5" />
                    <span className="hidden sm:inline">Back</span>
                  </button>
                  <div className="h-6 w-px bg-[#2a2a35]" />
                  <h1 className="text-lg font-semibold text-white truncate max-w-[300px] sm:max-w-none">
                    {selectedGuide.title}
                  </h1>
                </div>

                {canEditGuide(selectedGuide) && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openEditGuide(selectedGuide)}
                      className="flex items-center gap-2 px-4 py-2 bg-[#1f1f28] hover:bg-[#2a2a35] text-white rounded-lg transition-colors"
                    >
                      <FiEdit2 className="w-4 h-4" />
                      <span className="hidden sm:inline">Edit</span>
                    </button>
                    <button
                      onClick={() => setDeleteConfirmGuide(selectedGuide)}
                      className="flex items-center gap-2 px-4 py-2 bg-[#ea2127]/10 hover:bg-[#ea2127]/20 text-[#ea2127] rounded-lg transition-colors"
                    >
                      <FiTrash2 className="w-4 h-4" />
                      <span className="hidden sm:inline">Delete</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Main Layout */}
              <div className="flex flex-col lg:flex-row">
                {/* Left Sidebar - Metadata */}
                <div className="lg:w-72 flex-shrink-0 bg-[#0f0f12] border-r border-[#2a2a35] p-4 space-y-5">
                  {/* Cover Image */}
                  {selectedGuide.cover_image && (
                    <div>
                      <label className="block text-xs font-medium text-[#6b6b7a] uppercase tracking-wider mb-2">Cover</label>
                      <img
                        src={selectedGuide.cover_image}
                        alt="Cover"
                        className="w-full h-40 object-cover rounded-lg"
                      />
                    </div>
                  )}

                  {/* Department */}
                  {selectedGuide.departments && (
                    <div>
                      <label className="block text-xs font-medium text-[#6b6b7a] uppercase tracking-wider mb-2">Department</label>
                      <span
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium"
                        style={{
                          backgroundColor: `${selectedGuide.departments.color}15`,
                          color: selectedGuide.departments.color,
                        }}
                      >
                        {getDepartmentIcon(selectedGuide.departments.icon)}
                        {selectedGuide.departments.name}
                      </span>
                    </div>
                  )}

                  {/* Summary */}
                  {selectedGuide.summary && (
                    <div>
                      <label className="block text-xs font-medium text-[#6b6b7a] uppercase tracking-wider mb-2">Summary</label>
                      <p className="text-sm text-[#8b8b9a] leading-relaxed">{selectedGuide.summary}</p>
                    </div>
                  )}

                  {/* Meta Info */}
                  <div className="pt-4 border-t border-[#2a2a35] space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#1f1f28] flex items-center justify-center">
                        <FiUser className="w-4 h-4 text-[#6b6b7a]" />
                      </div>
                      <div>
                        <p className="text-xs text-[#6b6b7a] uppercase tracking-wider">Author</p>
                        <p className="text-sm text-white">{selectedGuide.user_profiles?.display_name || 'Unknown'}</p>
                        {selectedGuide.user_profiles?.role_name && (
                          <span
                            className="text-xs font-medium"
                            style={{ color: selectedGuide.user_profiles.role_color || '#6b7280' }}
                          >
                            {selectedGuide.user_profiles.role_name}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#1f1f28] flex items-center justify-center">
                        <FiClock className="w-4 h-4 text-[#6b6b7a]" />
                      </div>
                      <div>
                        <p className="text-xs text-[#6b6b7a] uppercase tracking-wider">Published</p>
                        <p className="text-sm text-white">{formatDate(selectedGuide.created_at)}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#1f1f28] flex items-center justify-center">
                        <FiEye className="w-4 h-4 text-[#6b6b7a]" />
                      </div>
                      <div>
                        <p className="text-xs text-[#6b6b7a] uppercase tracking-wider">Views</p>
                        <p className="text-sm text-white">{selectedGuide.view_count}</p>
                      </div>
                    </div>
                  </div>

                  {/* Status */}
                  <div className="pt-4 border-t border-[#2a2a35]">
                    <label className="block text-xs font-medium text-[#6b6b7a] uppercase tracking-wider mb-2">Status</label>
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium ${
                      selectedGuide.is_published
                        ? 'bg-green-500/10 text-green-400'
                        : 'bg-yellow-500/10 text-yellow-400'
                    }`}>
                      <span className={`w-2 h-2 rounded-full ${selectedGuide.is_published ? 'bg-green-400' : 'bg-yellow-400'}`} />
                      {selectedGuide.is_published ? 'Published' : 'Draft'}
                    </span>
                  </div>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 min-h-[calc(100vh-180px)] bg-[#0f0f12]">
                  <div className="guide-content-wrapper p-6 lg:p-8">
                    <div
                      className="guide-content"
                      dangerouslySetInnerHTML={{ __html: selectedGuide.content || '<p class="text-[#6b6b7a]">No content yet.</p>' }}
                    />
                    <style>{`
                      .guide-content {
                        color: #ffffff;
                        line-height: 1.8;
                        font-size: 1rem;
                      }
                      .guide-content p {
                        margin: 0.75em 0;
                        color: #e0e0e0;
                      }
                      .guide-content h1 {
                        font-size: 2em;
                        font-weight: 700;
                        margin: 1em 0 0.5em;
                        color: #ffffff;
                      }
                      .guide-content h2 {
                        font-size: 1.5em;
                        font-weight: 600;
                        margin: 1em 0 0.5em;
                        color: #ffffff;
                      }
                      .guide-content h3 {
                        font-size: 1.25em;
                        font-weight: 600;
                        margin: 1em 0 0.5em;
                        color: #ffffff;
                      }
                      .guide-content ul,
                      .guide-content ol {
                        padding-left: 1.5em;
                        margin: 0.75em 0;
                      }
                      .guide-content ul {
                        list-style-type: disc;
                      }
                      .guide-content ol {
                        list-style-type: decimal;
                      }
                      .guide-content li {
                        margin: 0.35em 0;
                        color: #e0e0e0;
                      }
                      .guide-content blockquote {
                        border-left: 3px solid #ea2127;
                        padding-left: 1em;
                        margin: 1em 0;
                        color: #8b8b9a;
                        font-style: italic;
                      }
                      .guide-content code {
                        background: #2a2a35;
                        color: #ea2127;
                        padding: 0.15em 0.4em;
                        border-radius: 0.25em;
                        font-family: 'JetBrains Mono', 'Fira Code', monospace;
                        font-size: 0.9em;
                      }
                      .guide-content pre {
                        background: #141418;
                        border: 1px solid #2a2a35;
                        border-radius: 0.5em;
                        padding: 1em;
                        margin: 1em 0;
                        overflow-x: auto;
                      }
                      .guide-content pre code {
                        background: none;
                        color: #e0e0e0;
                        padding: 0;
                        border-radius: 0;
                      }
                      .guide-content hr {
                        border: none;
                        border-top: 1px solid #2a2a35;
                        margin: 1.5em 0;
                      }
                      .guide-content s {
                        text-decoration: line-through;
                        color: #6b6b7a;
                      }
                      .guide-content strong {
                        font-weight: 700;
                        color: #ffffff;
                      }
                      .guide-content em {
                        font-style: italic;
                      }
                      .guide-content a {
                        color: #ea2127;
                        text-decoration: underline;
                      }
                      .guide-content a:hover {
                        color: #ff4a4f;
                      }
                      .guide-content img {
                        max-width: 100%;
                        height: auto;
                        border-radius: 0.5em;
                        margin: 1em 0;
                        display: block;
                      }
                    `}</style>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : viewMode === 'editor' ? (
            <motion.div
              key="editor"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="-mx-6 -mt-6"
            >
              {/* Office-style Header Bar */}
              <div className="bg-[#141418] border-b border-[#2a2a35] px-4 py-3 flex items-center justify-between sticky top-0 z-20">
                <div className="flex items-center gap-4">
                  <button
                    onClick={closeEditor}
                    className="flex items-center gap-2 px-3 py-2 text-[#8b8b9a] hover:text-white hover:bg-[#1f1f28] rounded-lg transition-colors"
                  >
                    <FiArrowLeft className="w-5 h-5" />
                    <span className="hidden sm:inline">Back</span>
                  </button>
                  <div className="h-6 w-px bg-[#2a2a35]" />
                  <h1 className="text-lg font-semibold text-white">
                    {editingGuide ? 'Edit Guide' : 'New Guide'}
                  </h1>
                </div>

                <div className="flex items-center gap-3">
                  {/* Publish Toggle */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setEditorIsPublished(!editorIsPublished)}
                      className={`relative w-12 h-7 rounded-full transition-colors ${
                        editorIsPublished ? 'bg-[#ea2127]' : 'bg-[#2a2a35]'
                      }`}
                    >
                      <div
                        className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-transform ${
                          editorIsPublished ? 'left-6' : 'left-1'
                        }`}
                      />
                    </button>
                    <span className="text-sm text-[#8b8b9a] hidden sm:inline">
                      {editorIsPublished ? 'Published' : 'Draft'}
                    </span>
                  </div>

                  <button
                    onClick={handleSaveGuide}
                    disabled={saving || !editorTitle.trim()}
                    className="flex items-center gap-2 px-5 py-2 bg-[#ea2127] hover:bg-[#d11920] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
                  >
                    {saving ? (
                      <FiLoader className="w-4 h-4 animate-spin" />
                    ) : (
                      <FiSave className="w-4 h-4" />
                    )}
                    <span className="hidden sm:inline">{saving ? 'Saving...' : 'Save'}</span>
                  </button>
                </div>
              </div>

              {/* Office-style Toolbar Ribbon */}
              <div className="sticky top-[57px] z-10">
                <TiptapToolbar editor={editorRef.current} />
              </div>

              {/* Main Editor Layout */}
              <div className="flex flex-col lg:flex-row">
                {/* Left Sidebar - Metadata */}
                <div className="lg:w-72 flex-shrink-0 bg-[#0f0f12] border-r border-[#2a2a35] p-4 space-y-4">
                  {/* Cover Image */}
                  <div>
                    <label className="block text-xs font-medium text-[#6b6b7a] uppercase tracking-wider mb-2">Cover Image</label>
                    <input
                      ref={coverInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleCoverUpload}
                      className="hidden"
                    />
                    {editorCoverImage ? (
                      <div className="relative group">
                        <img
                          src={editorCoverImage}
                          alt="Cover"
                          className="w-full h-32 object-cover rounded-lg"
                        />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
                          <button
                            onClick={() => coverInputRef.current?.click()}
                            className="p-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors"
                            title="Change cover"
                          >
                            <FiUpload className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setEditorCoverImage('')}
                            className="p-2 bg-[#ea2127]/80 hover:bg-[#ea2127] text-white rounded-lg transition-colors"
                            title="Remove cover"
                          >
                            <FiX className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => coverInputRef.current?.click()}
                        disabled={uploadingCover}
                        className="w-full h-32 border-2 border-dashed border-[#2a2a35] hover:border-[#ea2127]/50 rounded-lg flex flex-col items-center justify-center gap-2 transition-colors"
                      >
                        {uploadingCover ? (
                          <FiLoader className="w-6 h-6 text-[#ea2127] animate-spin" />
                        ) : (
                          <>
                            <FiImage className="w-6 h-6 text-[#5a5a68]" />
                            <span className="text-xs text-[#5a5a68]">Add cover image</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>

                  {/* Title */}
                  <div>
                    <label className="block text-xs font-medium text-[#6b6b7a] uppercase tracking-wider mb-2">Title</label>
                    <input
                      type="text"
                      value={editorTitle}
                      onChange={(e) => setEditorTitle(e.target.value)}
                      placeholder="Guide title..."
                      className="w-full px-3 py-2.5 bg-[#141418] border border-[#2a2a35] rounded-lg text-white placeholder-[#5a5a68] focus:outline-none focus:border-[#ea2127]/50 transition-colors text-sm"
                    />
                  </div>

                  {/* Department */}
                  <div>
                    <label className="block text-xs font-medium text-[#6b6b7a] uppercase tracking-wider mb-2">Department</label>
                    <select
                      value={editorDepartmentId}
                      onChange={(e) => setEditorDepartmentId(e.target.value)}
                      className="w-full px-3 py-2.5 bg-[#141418] border border-[#2a2a35] rounded-lg text-white focus:outline-none focus:border-[#ea2127]/50 transition-colors text-sm"
                    >
                      <option value="">No department</option>
                      {departments.map((dept) => (
                        <option key={dept.id} value={dept.id}>{dept.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Summary */}
                  <div>
                    <label className="block text-xs font-medium text-[#6b6b7a] uppercase tracking-wider mb-2">Summary</label>
                    <textarea
                      value={editorSummary}
                      onChange={(e) => setEditorSummary(e.target.value)}
                      placeholder="Brief description..."
                      rows={3}
                      className="w-full px-3 py-2.5 bg-[#141418] border border-[#2a2a35] rounded-lg text-white placeholder-[#5a5a68] focus:outline-none focus:border-[#ea2127]/50 transition-colors resize-none text-sm"
                    />
                  </div>

                  {/* Tips */}
                  <div className="pt-4 border-t border-[#2a2a35]">
                    <p className="text-xs text-[#5a5a68]">
                      <strong className="text-[#8b8b9a]">Tips:</strong> Use Ctrl+B for bold, Ctrl+I for italic. Click the image icon in the toolbar to add inline images.
                    </p>
                  </div>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 min-h-[calc(100vh-180px)]">
                  <TiptapEditor
                    content={editorContent}
                    onChange={setEditorContent}
                    placeholder="Start writing your guide..."
                    minHeight="calc(100vh - 180px)"
                    toolbarPosition="external"
                    externalToolbarRef={editorRef}
                    onImageUpload={handleInlineImageUpload}
                  />
                </div>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirmGuide && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setDeleteConfirmGuide(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-[#141418] border border-[#2a2a35] rounded-2xl p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-12 h-12 rounded-xl bg-[#ea2127]/10 flex items-center justify-center mx-auto mb-4">
                <FiTrash2 className="w-6 h-6 text-[#ea2127]" />
              </div>
              <h3 className="text-lg font-semibold text-white text-center mb-2">Delete Guide</h3>
              <p className="text-[#6b6b7a] text-center mb-6">
                Are you sure you want to delete "{deleteConfirmGuide.title}"? This action cannot be undone.
              </p>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setDeleteConfirmGuide(null)}
                  className="flex-1 px-4 py-2.5 bg-[#1f1f28] hover:bg-[#2a2a35] text-white rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteGuide}
                  disabled={deleting}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-[#ea2127] hover:bg-[#d11920] disabled:opacity-50 text-white rounded-xl transition-colors"
                >
                  {deleting ? (
                    <FiLoader className="w-4 h-4 animate-spin" />
                  ) : (
                    <FiTrash2 className="w-4 h-4" />
                  )}
                  <span>{deleting ? 'Deleting...' : 'Delete'}</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default GuidesPage;
