import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiLink,
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiExternalLink,
  FiSearch,
  FiCheck,
  FiGrid,
  FiList,
} from 'react-icons/fi';
import supabase from '../lib/supabase';
import { useAuthStore } from '../store/authStore';

interface LinkCategory {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  color: string;
  display_order: number;
  is_active: boolean;
}

interface UsefulLink {
  id: string;
  title: string;
  description: string | null;
  url: string;
  icon: string | null;
  color: string;
  category_id: string | null;
  display_order: number;
  is_active: boolean;
  open_in_new_tab: boolean;
  created_by: string | null;
  created_at: string;
  link_categories?: LinkCategory;
}

export default function UsefulLinksPage() {
  const { user, hasRole } = useAuthStore();
  const [canManage, setCanManage] = useState(false);

  // Check edit permission from database
  useEffect(() => {
    const checkEditPermission = async () => {
      // Super Admin always has edit permission
      if (hasRole('Super Admin')) {
        setCanManage(true);
        return;
      }

      if (!user) return;

      try {
        // Get user's role IDs
        const { data: userRoles } = await supabase
          .from('user_roles')
          .select('role_id')
          .eq('user_id', user.id);

        if (!userRoles || userRoles.length === 0) return;

        const roleIds = userRoles.map(ur => ur.role_id);

        // Check if any role has edit permission for useful-links
        const { data: permissions } = await supabase
          .from('role_section_permissions')
          .select('can_edit')
          .in('role_id', roleIds)
          .eq('section_key', 'useful-links')
          .eq('can_edit', true);

        if (permissions && permissions.length > 0) {
          setCanManage(true);
        }
      } catch (error) {
        console.error('Error checking edit permission:', error);
      }
    };

    checkEditPermission();
  }, [user, hasRole]);

  // State
  const [links, setLinks] = useState<UsefulLink[]>([]);
  const [categories, setCategories] = useState<LinkCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLink, setEditingLink] = useState<UsefulLink | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    url: '',
    icon: 'link',
    color: '#3b82f6',
    category_id: '',
    open_in_new_tab: true,
  });
  const [saving, setSaving] = useState(false);

  // Delete confirmation
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Fetch data
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch categories
      const { data: categoriesData } = await supabase
        .from('link_categories')
        .select('*')
        .eq('is_active', true)
        .order('display_order');

      if (categoriesData) {
        setCategories(categoriesData);
      }

      // Fetch links with category info
      const { data: linksData } = await supabase
        .from('useful_links')
        .select('*, link_categories(*)')
        .eq('is_active', true)
        .order('display_order');

      if (linksData) {
        setLinks(linksData);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter links
  const filteredLinks = links.filter(link => {
    const matchesSearch = !searchQuery ||
      link.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      link.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || link.category_id === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Group links by category
  const linksByCategory = categories.map(cat => ({
    category: cat,
    links: filteredLinks.filter(l => l.category_id === cat.id),
  })).filter(group => group.links.length > 0);

  // Uncategorized links
  const uncategorizedLinks = filteredLinks.filter(l => !l.category_id);

  // Open link
  const openLink = (link: UsefulLink) => {
    if (link.open_in_new_tab) {
      window.open(link.url, '_blank', 'noopener,noreferrer');
    } else {
      window.location.href = link.url;
    }
  };

  // Open modal for new/edit
  const openModal = (link?: UsefulLink) => {
    if (link) {
      setEditingLink(link);
      setFormData({
        title: link.title,
        description: link.description || '',
        url: link.url,
        icon: link.icon || 'link',
        color: link.color || '#3b82f6',
        category_id: link.category_id || '',
        open_in_new_tab: link.open_in_new_tab,
      });
    } else {
      setEditingLink(null);
      setFormData({
        title: '',
        description: '',
        url: '',
        icon: 'link',
        color: '#3b82f6',
        category_id: '',
        open_in_new_tab: true,
      });
    }
    setIsModalOpen(true);
  };

  // Save link
  const handleSave = async () => {
    if (!formData.title.trim() || !formData.url.trim()) return;

    setSaving(true);
    try {
      const linkData = {
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        url: formData.url.trim(),
        icon: formData.icon,
        color: formData.color,
        category_id: formData.category_id || null,
        open_in_new_tab: formData.open_in_new_tab,
      };

      if (editingLink) {
        await supabase
          .from('useful_links')
          .update({ ...linkData, updated_at: new Date().toISOString() })
          .eq('id', editingLink.id);
      } else {
        await supabase
          .from('useful_links')
          .insert({
            ...linkData,
            display_order: links.length,
          });
      }

      await fetchData();
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error saving link:', error);
    } finally {
      setSaving(false);
    }
  };

  // Delete link
  const handleDelete = async (id: string) => {
    setDeleting(true);
    try {
      await supabase.from('useful_links').delete().eq('id', id);
      await fetchData();
      setDeleteConfirm(null);
    } catch (error) {
      console.error('Error deleting link:', error);
    } finally {
      setDeleting(false);
    }
  };

  // Color options
  const colorOptions = [
    '#ea2127', '#ef4444', '#f59e0b', '#22c55e', '#10b981',
    '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#ec4899',
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f0f12] p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-12 bg-[#1a1a23] rounded-xl w-1/3" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="h-32 bg-[#1a1a23] rounded-xl" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f0f12] p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#8b5cf6] to-[#a78bfa] flex items-center justify-center">
              <FiLink className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Useful Links</h1>
              <p className="text-sm text-[#8b8b9a]">Quick access to important resources</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5a5a68]" />
              <input
                type="text"
                placeholder="Search links..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2.5 bg-[#1a1a23] border border-[#2a2a35] rounded-xl text-white placeholder:text-[#5a5a68] focus:outline-none focus:border-[#8b5cf6] w-64"
              />
            </div>

            {/* View Toggle */}
            <div className="flex items-center bg-[#1a1a23] rounded-lg p-1 border border-[#2a2a35]">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-md transition-all ${
                  viewMode === 'grid'
                    ? 'bg-[#8b5cf6] text-white'
                    : 'text-[#6b6b7a] hover:text-white'
                }`}
              >
                <FiGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-md transition-all ${
                  viewMode === 'list'
                    ? 'bg-[#8b5cf6] text-white'
                    : 'text-[#6b6b7a] hover:text-white'
                }`}
              >
                <FiList className="w-4 h-4" />
              </button>
            </div>

            {/* Add Link Button */}
            {canManage && (
              <button
                onClick={() => openModal()}
                className="flex items-center gap-2 px-4 py-2.5 bg-[#8b5cf6] hover:bg-[#7c3aed] rounded-xl text-white font-medium transition-colors"
              >
                <FiPlus className="w-5 h-5" />
                <span className="hidden sm:inline">Add Link</span>
              </button>
            )}
          </div>
        </div>

        {/* Category Filter */}
        {categories.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                !selectedCategory
                  ? 'bg-[#8b5cf6] text-white'
                  : 'bg-[#1a1a23] text-[#8b8b9a] hover:bg-[#2a2a35] hover:text-white border border-[#2a2a35]'
              }`}
            >
              All
            </button>
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  selectedCategory === cat.id
                    ? 'text-white'
                    : 'bg-[#1a1a23] text-[#8b8b9a] hover:bg-[#2a2a35] hover:text-white border border-[#2a2a35]'
                }`}
                style={selectedCategory === cat.id ? { backgroundColor: cat.color } : {}}
              >
                {cat.name}
              </button>
            ))}
          </div>
        )}

        {/* Links Display */}
        {filteredLinks.length === 0 ? (
          <div className="bg-[#141418] border border-[#2a2a35] rounded-xl p-12 text-center">
            <FiLink className="w-16 h-16 text-[#3a3a45] mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">No links found</h3>
            <p className="text-[#8b8b9a]">
              {searchQuery ? 'Try adjusting your search' : 'Add your first useful link to get started'}
            </p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="space-y-8">
            {linksByCategory.map(({ category, links: catLinks }) => (
              <div key={category.id}>
                <div className="flex items-center gap-2 mb-4">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: category.color }}
                  />
                  <h2 className="text-lg font-semibold text-white">{category.name}</h2>
                  <span className="text-sm text-[#5a5a68]">({catLinks.length})</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {catLinks.map((link, index) => (
                    <motion.div
                      key={link.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="group relative bg-[#141418] border border-[#2a2a35] rounded-xl p-5 hover:border-[#3a3a45] transition-all cursor-pointer"
                      onClick={() => openLink(link)}
                    >
                      {/* Color accent */}
                      <div
                        className="absolute top-0 left-0 right-0 h-1 rounded-t-xl"
                        style={{ backgroundColor: link.color }}
                      />

                      <div className="flex items-start gap-4">
                        <div
                          className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                          style={{ backgroundColor: `${link.color}20` }}
                        >
                          <FiLink className="w-5 h-5" style={{ color: link.color }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-white group-hover:text-[#8b5cf6] transition-colors truncate">
                            {link.title}
                          </h3>
                          {link.description && (
                            <p className="text-sm text-[#8b8b9a] mt-1 line-clamp-2">
                              {link.description}
                            </p>
                          )}
                          <p className="text-xs text-[#5a5a68] mt-2 truncate">
                            {link.url}
                          </p>
                        </div>
                        <FiExternalLink className="w-4 h-4 text-[#5a5a68] group-hover:text-[#8b5cf6] shrink-0" />
                      </div>

                      {/* Edit/Delete buttons */}
                      {canManage && (
                        <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openModal(link);
                            }}
                            className="p-1.5 bg-[#2a2a35] hover:bg-[#3a3a45] rounded-lg text-[#8b8b9a] hover:text-white transition-colors"
                          >
                            <FiEdit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteConfirm(link.id);
                            }}
                            className="p-1.5 bg-[#2a2a35] hover:bg-red-500/20 rounded-lg text-[#8b8b9a] hover:text-red-400 transition-colors"
                          >
                            <FiTrash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              </div>
            ))}

            {uncategorizedLinks.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-3 h-3 rounded-full bg-[#5a5a68]" />
                  <h2 className="text-lg font-semibold text-white">Other</h2>
                  <span className="text-sm text-[#5a5a68]">({uncategorizedLinks.length})</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {uncategorizedLinks.map((link, index) => (
                    <motion.div
                      key={link.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="group relative bg-[#141418] border border-[#2a2a35] rounded-xl p-5 hover:border-[#3a3a45] transition-all cursor-pointer"
                      onClick={() => openLink(link)}
                    >
                      <div
                        className="absolute top-0 left-0 right-0 h-1 rounded-t-xl"
                        style={{ backgroundColor: link.color }}
                      />

                      <div className="flex items-start gap-4">
                        <div
                          className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                          style={{ backgroundColor: `${link.color}20` }}
                        >
                          <FiLink className="w-5 h-5" style={{ color: link.color }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-white group-hover:text-[#8b5cf6] transition-colors truncate">
                            {link.title}
                          </h3>
                          {link.description && (
                            <p className="text-sm text-[#8b8b9a] mt-1 line-clamp-2">
                              {link.description}
                            </p>
                          )}
                          <p className="text-xs text-[#5a5a68] mt-2 truncate">
                            {link.url}
                          </p>
                        </div>
                        <FiExternalLink className="w-4 h-4 text-[#5a5a68] group-hover:text-[#8b5cf6] shrink-0" />
                      </div>

                      {canManage && (
                        <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openModal(link);
                            }}
                            className="p-1.5 bg-[#2a2a35] hover:bg-[#3a3a45] rounded-lg text-[#8b8b9a] hover:text-white transition-colors"
                          >
                            <FiEdit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteConfirm(link.id);
                            }}
                            className="p-1.5 bg-[#2a2a35] hover:bg-red-500/20 rounded-lg text-[#8b8b9a] hover:text-red-400 transition-colors"
                          >
                            <FiTrash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* List View */
          <div className="bg-[#141418] border border-[#2a2a35] rounded-xl overflow-hidden">
            {filteredLinks.map((link, index) => (
              <motion.div
                key={link.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: index * 0.03 }}
                className={`group flex items-center gap-4 px-5 py-4 hover:bg-[#1a1a23] cursor-pointer transition-colors ${
                  index !== filteredLinks.length - 1 ? 'border-b border-[#2a2a35]' : ''
                }`}
                onClick={() => openLink(link)}
              >
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                  style={{ backgroundColor: `${link.color}20` }}
                >
                  <FiLink className="w-4 h-4" style={{ color: link.color }} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-white group-hover:text-[#8b5cf6] transition-colors truncate">
                      {link.title}
                    </h3>
                    {link.link_categories && (
                      <span
                        className="px-2 py-0.5 rounded text-xs font-medium"
                        style={{
                          backgroundColor: `${link.link_categories.color}20`,
                          color: link.link_categories.color,
                        }}
                      >
                        {link.link_categories.name}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-[#5a5a68] truncate">{link.url}</p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {canManage && (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openModal(link);
                        }}
                        className="p-2 hover:bg-[#2a2a35] rounded-lg text-[#5a5a68] hover:text-white transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <FiEdit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteConfirm(link.id);
                        }}
                        className="p-2 hover:bg-red-500/20 rounded-lg text-[#5a5a68] hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <FiTrash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                  <FiExternalLink className="w-4 h-4 text-[#5a5a68] group-hover:text-[#8b5cf6]" />
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setIsModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#141418] border border-[#2a2a35] rounded-xl w-full max-w-lg overflow-hidden"
            >
              <div className="p-6 border-b border-[#2a2a35]">
                <h2 className="text-xl font-bold text-white">
                  {editingLink ? 'Edit Link' : 'Add New Link'}
                </h2>
              </div>

              <div className="p-6 space-y-4">
                {/* Title */}
                <div>
                  <label className="block text-sm font-medium text-[#8b8b9a] mb-2">Title *</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-4 py-2.5 bg-[#1a1a23] border border-[#2a2a35] rounded-lg text-white focus:outline-none focus:border-[#8b5cf6]"
                    placeholder="Link title"
                  />
                </div>

                {/* URL */}
                <div>
                  <label className="block text-sm font-medium text-[#8b8b9a] mb-2">URL *</label>
                  <input
                    type="url"
                    value={formData.url}
                    onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                    className="w-full px-4 py-2.5 bg-[#1a1a23] border border-[#2a2a35] rounded-lg text-white focus:outline-none focus:border-[#8b5cf6]"
                    placeholder="https://example.com"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-[#8b8b9a] mb-2">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-2.5 bg-[#1a1a23] border border-[#2a2a35] rounded-lg text-white focus:outline-none focus:border-[#8b5cf6] resize-none"
                    rows={2}
                    placeholder="Brief description (optional)"
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="block text-sm font-medium text-[#8b8b9a] mb-2">Category</label>
                  <select
                    value={formData.category_id}
                    onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                    className="w-full px-4 py-2.5 bg-[#1a1a23] border border-[#2a2a35] rounded-lg text-white focus:outline-none focus:border-[#8b5cf6]"
                  >
                    <option value="">No category</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>

                {/* Color */}
                <div>
                  <label className="block text-sm font-medium text-[#8b8b9a] mb-2">Color</label>
                  <div className="flex flex-wrap gap-2">
                    {colorOptions.map(color => (
                      <button
                        key={color}
                        onClick={() => setFormData({ ...formData, color })}
                        className={`w-8 h-8 rounded-lg transition-transform ${
                          formData.color === color ? 'ring-2 ring-white ring-offset-2 ring-offset-[#141418] scale-110' : ''
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>

                {/* Open in new tab */}
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-[#8b8b9a]">Open in new tab</label>
                  <button
                    onClick={() => setFormData({ ...formData, open_in_new_tab: !formData.open_in_new_tab })}
                    className={`w-12 h-6 rounded-full transition-colors ${
                      formData.open_in_new_tab ? 'bg-[#8b5cf6]' : 'bg-[#2a2a35]'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full bg-white shadow-md transition-transform ${
                        formData.open_in_new_tab ? 'translate-x-6' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </div>
              </div>

              <div className="p-6 border-t border-[#2a2a35] flex justify-end gap-3">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 bg-[#2a2a35] hover:bg-[#3a3a45] rounded-lg text-white font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || !formData.title.trim() || !formData.url.trim()}
                  className="flex items-center gap-2 px-5 py-2.5 bg-[#8b5cf6] hover:bg-[#7c3aed] disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white font-medium transition-colors"
                >
                  {saving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <FiCheck className="w-4 h-4" />
                      {editingLink ? 'Update' : 'Add Link'}
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setDeleteConfirm(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#141418] border border-[#2a2a35] rounded-xl w-full max-w-md p-6"
            >
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
                  <FiTrash2 className="w-8 h-8 text-red-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Delete Link?</h3>
                <p className="text-[#8b8b9a] mb-6">
                  This action cannot be undone. The link will be permanently removed.
                </p>
                <div className="flex justify-center gap-3">
                  <button
                    onClick={() => setDeleteConfirm(null)}
                    className="px-5 py-2.5 bg-[#2a2a35] hover:bg-[#3a3a45] rounded-lg text-white font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleDelete(deleteConfirm)}
                    disabled={deleting}
                    className="flex items-center gap-2 px-5 py-2.5 bg-red-500 hover:bg-red-600 disabled:opacity-50 rounded-lg text-white font-medium transition-colors"
                  >
                    {deleting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Deleting...
                      </>
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
