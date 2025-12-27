import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiPackage,
  FiPlus,
  FiSearch,
  FiEdit2,
  FiTrash2,
  FiX,
  FiSave,
  FiRefreshCw,
  FiAlertTriangle,
  FiCheck,
  FiClock,
  FiDollarSign,
  FiBox,
  FiImage,
  FiUpload,
  FiTag,
  FiUser,
} from 'react-icons/fi';
import supabase from '../lib/supabase';
import { useAuthStore } from '../store/authStore';

// Types
interface ShopCategory {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  color: string;
  display_order: number;
  is_active: boolean;
}

interface ShopItem {
  id: string;
  name: string;
  description: string | null;
  category_id: string | null;
  sku: string | null;
  price: number;
  quantity: number;
  min_quantity: number;
  image_url: string | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  category?: ShopCategory | null;
}

interface ShopOrder {
  id: string;
  order_number: string;
  user_id: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  notes: string | null;
  admin_notes: string | null;
  processed_by: string | null;
  processed_at: string | null;
  created_at: string;
  user_name?: string;
  user_email?: string;
  items?: OrderItem[];
}

interface OrderItem {
  id: string;
  item_id: string | null;
  quantity: number;
  item_name: string;
  item_price: number;
}

// Status configurations
const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  pending: { label: 'Pending', color: '#3b82f6', bgColor: 'rgba(59, 130, 246, 0.15)' },
  approved: { label: 'Approved', color: '#f59e0b', bgColor: 'rgba(245, 158, 11, 0.15)' },
  rejected: { label: 'Rejected', color: '#ef4444', bgColor: 'rgba(239, 68, 68, 0.15)' },
  completed: { label: 'Completed', color: '#22c55e', bgColor: 'rgba(34, 197, 94, 0.15)' },
};

export default function ShopManagerPage() {
  const { user } = useAuthStore();

  // Tab state
  const [activeTab, setActiveTab] = useState<'items' | 'categories' | 'orders'>('items');

  // Data states
  const [items, setItems] = useState<ShopItem[]>([]);
  const [categories, setCategories] = useState<ShopCategory[]>([]);
  const [orders, setOrders] = useState<ShopOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modal states
  const [showItemModal, setShowItemModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDeleteOrderModal, setShowDeleteOrderModal] = useState(false);

  const [editingItem, setEditingItem] = useState<ShopItem | null>(null);
  const [editingCategory, setEditingCategory] = useState<ShopCategory | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<ShopOrder | null>(null);
  const [itemToDelete, setItemToDelete] = useState<{ type: 'item' | 'category'; id: string; name: string } | null>(null);
  const [orderToDelete, setOrderToDelete] = useState<ShopOrder | null>(null);

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deletingOrder, setDeletingOrder] = useState(false);

  // Form states
  const [itemForm, setItemForm] = useState({
    name: '',
    description: '',
    category_id: '',
    sku: '',
    price: 0,
    quantity: 0,
    min_quantity: 0,
    is_active: true,
  });

  const [categoryForm, setCategoryForm] = useState({
    name: '',
    description: '',
    icon: '',
    color: '#6b7280',
    display_order: 0,
    is_active: true,
  });

  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Fetch data
  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      // Fetch categories
      const { data: categoriesData } = await supabase
        .from('shop_categories')
        .select('*')
        .order('display_order');

      if (categoriesData) setCategories(categoriesData);

      // Fetch items with categories
      const { data: itemsData } = await supabase
        .from('shop_items')
        .select('*, category:category_id(*)')
        .order('created_at', { ascending: false });

      if (itemsData) setItems(itemsData);

      // Fetch orders
      const { data: ordersData } = await supabase
        .from('shop_orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (ordersData) {
        // Get user info for orders
        const userIds = [...new Set(ordersData.map(o => o.user_id).filter(Boolean))];
        let userMap = new Map();

        if (userIds.length > 0) {
          const { data: users } = await supabase.rpc('get_users_display_info', { user_ids: userIds });
          if (users) {
            userMap = new Map(users.map((u: { id: string; full_name: string; email: string }) => [u.id, u]));
          }
        }

        // Fetch order items for each order
        const enrichedOrders = await Promise.all(
          ordersData.map(async (order) => {
            const { data: orderItems } = await supabase
              .from('shop_order_items')
              .select('*')
              .eq('order_id', order.id);

            const userInfo = userMap.get(order.user_id);
            return {
              ...order,
              user_name: userInfo?.full_name || 'Unknown',
              user_email: userInfo?.email || '',
              items: orderItems || [],
            };
          })
        );

        setOrders(enrichedOrders);
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

  // Stats
  const stats = useMemo(() => {
    const totalItems = items.length;
    const lowStock = items.filter(i => i.quantity <= i.min_quantity && i.quantity > 0).length;
    const outOfStock = items.filter(i => i.quantity === 0).length;
    const pendingOrders = orders.filter(o => o.status === 'pending').length;
    const totalValue = items.reduce((sum, i) => sum + (i.price * i.quantity), 0);

    return { totalItems, lowStock, outOfStock, pendingOrders, totalValue };
  }, [items, orders]);

  // Filtered data
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      if (categoryFilter && item.category_id !== categoryFilter) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          item.name.toLowerCase().includes(query) ||
          item.sku?.toLowerCase().includes(query) ||
          item.description?.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [items, categoryFilter, searchQuery]);

  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      if (statusFilter && order.status !== statusFilter) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          order.order_number.toLowerCase().includes(query) ||
          order.user_name?.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [orders, statusFilter, searchQuery]);

  // Handle image selection
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  // Save item
  const handleSaveItem = async () => {
    if (!itemForm.name.trim()) return;
    setSaving(true);

    try {
      let imageUrl = editingItem?.image_url || null;

      // Upload image if selected
      if (selectedImage) {
        const fileExt = selectedImage.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
        const filePath = `items/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('shop-images')
          .upload(filePath, selectedImage);

        if (!uploadError) {
          const { data: urlData } = supabase.storage
            .from('shop-images')
            .getPublicUrl(filePath);
          imageUrl = urlData.publicUrl;
        }
      }

      const itemData = {
        name: itemForm.name.trim(),
        description: itemForm.description.trim() || null,
        category_id: itemForm.category_id || null,
        sku: itemForm.sku.trim() || null,
        price: itemForm.price,
        quantity: itemForm.quantity,
        min_quantity: itemForm.min_quantity,
        is_active: itemForm.is_active,
        image_url: imageUrl,
        updated_at: new Date().toISOString(),
      };

      if (editingItem) {
        await supabase.from('shop_items').update(itemData).eq('id', editingItem.id);
      } else {
        await supabase.from('shop_items').insert({ ...itemData, created_by: user?.id });
      }

      setShowItemModal(false);
      resetItemForm();
      fetchData(true);
    } catch (error) {
      console.error('Error saving item:', error);
    } finally {
      setSaving(false);
    }
  };

  // Save category
  const handleSaveCategory = async () => {
    if (!categoryForm.name.trim()) return;
    setSaving(true);

    try {
      const categoryData = {
        name: categoryForm.name.trim(),
        description: categoryForm.description.trim() || null,
        icon: categoryForm.icon.trim() || null,
        color: categoryForm.color,
        display_order: categoryForm.display_order,
        is_active: categoryForm.is_active,
      };

      if (editingCategory) {
        await supabase.from('shop_categories').update(categoryData).eq('id', editingCategory.id);
      } else {
        await supabase.from('shop_categories').insert(categoryData);
      }

      setShowCategoryModal(false);
      resetCategoryForm();
      fetchData(true);
    } catch (error) {
      console.error('Error saving category:', error);
    } finally {
      setSaving(false);
    }
  };

  // Update order status
  const handleUpdateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      await supabase
        .from('shop_orders')
        .update({
          status: newStatus,
          processed_by: user?.id,
          processed_at: new Date().toISOString(),
        })
        .eq('id', orderId);

      fetchData(true);
      if (selectedOrder?.id === orderId) {
        setSelectedOrder({ ...selectedOrder, status: newStatus as ShopOrder['status'] });
      }
    } catch (error) {
      console.error('Error updating order:', error);
    }
  };

  // Delete order - show confirmation modal
  const handleDeleteOrder = (order: ShopOrder) => {
    setOrderToDelete(order);
    setShowDeleteOrderModal(true);
  };

  // Confirm delete order
  const confirmDeleteOrder = async () => {
    if (!orderToDelete) return;
    setDeletingOrder(true);

    try {
      // Delete order items first (cascade should handle this, but being explicit)
      await supabase
        .from('shop_order_items')
        .delete()
        .eq('order_id', orderToDelete.id);

      // Delete the order
      await supabase
        .from('shop_orders')
        .delete()
        .eq('id', orderToDelete.id);

      fetchData(true);
      if (selectedOrder?.id === orderToDelete.id) {
        setShowOrderModal(false);
        setSelectedOrder(null);
      }
      setShowDeleteOrderModal(false);
      setOrderToDelete(null);
    } catch (error) {
      console.error('Error deleting order:', error);
    } finally {
      setDeletingOrder(false);
    }
  };

  // Delete item/category
  const handleDelete = async () => {
    if (!itemToDelete) return;
    setDeleting(true);

    try {
      const table = itemToDelete.type === 'item' ? 'shop_items' : 'shop_categories';
      await supabase.from(table).delete().eq('id', itemToDelete.id);

      setShowDeleteModal(false);
      setItemToDelete(null);
      fetchData(true);
    } catch (error) {
      console.error('Error deleting:', error);
    } finally {
      setDeleting(false);
    }
  };

  // Reset forms
  const resetItemForm = () => {
    setItemForm({
      name: '',
      description: '',
      category_id: '',
      sku: '',
      price: 0,
      quantity: 0,
      min_quantity: 0,
      is_active: true,
    });
    setSelectedImage(null);
    setImagePreview(null);
    setEditingItem(null);
  };

  const resetCategoryForm = () => {
    setCategoryForm({
      name: '',
      description: '',
      icon: '',
      color: '#6b7280',
      display_order: 0,
      is_active: true,
    });
    setEditingCategory(null);
  };

  // Open edit modals
  const openEditItem = (item: ShopItem) => {
    setEditingItem(item);
    setItemForm({
      name: item.name,
      description: item.description || '',
      category_id: item.category_id || '',
      sku: item.sku || '',
      price: item.price,
      quantity: item.quantity,
      min_quantity: item.min_quantity,
      is_active: item.is_active,
    });
    setImagePreview(item.image_url);
    setShowItemModal(true);
  };

  const openEditCategory = (category: ShopCategory) => {
    setEditingCategory(category);
    setCategoryForm({
      name: category.name,
      description: category.description || '',
      icon: category.icon || '',
      color: category.color,
      display_order: category.display_order,
      is_active: category.is_active,
    });
    setShowCategoryModal(true);
  };

  // Format currency
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-EU', { style: 'currency', currency: 'EUR' }).format(price);
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-4 border-[#2a2a35] border-t-[#ea2127] animate-spin" />
          <p className="text-[#6b6b7a]">Loading shop data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#ea2127] to-[#b91c1c] flex items-center justify-center shadow-lg shadow-[#ea2127]/20">
            <FiPackage className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Shop Manager</h1>
            <p className="text-[#6b6b7a]">Manage inventory, categories, and orders</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className="p-3 bg-[#1a1a23] border border-[#2a2a35] rounded-xl text-[#6b6b7a] hover:text-white hover:border-[#3a3a48] transition-colors disabled:opacity-50"
          >
            <FiRefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          {activeTab === 'items' && (
            <button
              onClick={() => { resetItemForm(); setShowItemModal(true); }}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#ea2127] hover:bg-[#d91e24] text-white rounded-xl font-medium transition-colors"
            >
              <FiPlus className="w-5 h-5" />
              Add Item
            </button>
          )}
          {activeTab === 'categories' && (
            <button
              onClick={() => { resetCategoryForm(); setShowCategoryModal(true); }}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#ea2127] hover:bg-[#d91e24] text-white rounded-xl font-medium transition-colors"
            >
              <FiPlus className="w-5 h-5" />
              Add Category
            </button>
          )}
        </div>
      </motion.div>

      {/* Stats Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 md:grid-cols-5 gap-4"
      >
        {[
          { label: 'Total Items', value: stats.totalItems, icon: FiBox, color: '#3b82f6' },
          { label: 'Low Stock', value: stats.lowStock, icon: FiAlertTriangle, color: '#f59e0b' },
          { label: 'Out of Stock', value: stats.outOfStock, icon: FiPackage, color: '#ef4444' },
          { label: 'Pending Orders', value: stats.pendingOrders, icon: FiClock, color: '#8b5cf6' },
          { label: 'Total Value', value: formatPrice(stats.totalValue), icon: FiDollarSign, color: '#22c55e' },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-[#141418] border border-[#2a2a35] rounded-xl p-4"
          >
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: `${stat.color}15` }}
              >
                <stat.icon className="w-5 h-5" style={{ color: stat.color }} />
              </div>
              <div>
                <p className="text-xs text-[#6b6b7a]">{stat.label}</p>
                <p className="text-xl font-bold text-white">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </motion.div>

      {/* Tabs & Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="bg-[#141418] border border-[#2a2a35] rounded-xl p-4"
      >
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          {/* Tabs */}
          <div className="flex gap-1 bg-[#0f0f12] rounded-xl p-1">
            {(['items', 'categories', 'orders'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => { setActiveTab(tab); setSearchQuery(''); }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize ${
                  activeTab === tab
                    ? 'bg-[#ea2127] text-white'
                    : 'text-[#6b6b7a] hover:text-white'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="flex-1 relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6b6b7a]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search ${activeTab}...`}
              className="w-full pl-10 pr-4 py-2.5 bg-[#0f0f12] border border-[#2a2a35] rounded-xl text-white placeholder-[#6b6b7a] focus:outline-none focus:border-[#ea2127]/50"
            />
          </div>

          {/* Category filter for items */}
          {activeTab === 'items' && (
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-4 py-2.5 bg-[#0f0f12] border border-[#2a2a35] rounded-xl text-white focus:outline-none focus:border-[#ea2127]/50"
            >
              <option value="">All Categories</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          )}

          {/* Status filter for orders */}
          {activeTab === 'orders' && (
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2.5 bg-[#0f0f12] border border-[#2a2a35] rounded-xl text-white focus:outline-none focus:border-[#ea2127]/50"
            >
              <option value="">All Statuses</option>
              {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                <option key={key} value={key}>{config.label}</option>
              ))}
            </select>
          )}
        </div>
      </motion.div>

      {/* Content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-[#141418] border border-[#2a2a35] rounded-xl overflow-hidden"
      >
        {/* Items Tab */}
        {activeTab === 'items' && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#2a2a35]">
                  <th className="text-left px-6 py-4 text-xs font-semibold text-[#6b6b7a] uppercase">Item</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-[#6b6b7a] uppercase">Category</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-[#6b6b7a] uppercase">SKU</th>
                  <th className="text-right px-6 py-4 text-xs font-semibold text-[#6b6b7a] uppercase">Price</th>
                  <th className="text-right px-6 py-4 text-xs font-semibold text-[#6b6b7a] uppercase">Qty</th>
                  <th className="text-center px-6 py-4 text-xs font-semibold text-[#6b6b7a] uppercase">Status</th>
                  <th className="text-right px-6 py-4 text-xs font-semibold text-[#6b6b7a] uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => (
                  <tr key={item.id} className="border-b border-[#1f1f28] hover:bg-[#1a1a23] transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {item.image_url ? (
                          <img src={item.image_url} alt={item.name} className="w-10 h-10 rounded-lg object-cover" />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-[#2a2a35] flex items-center justify-center">
                            <FiPackage className="w-5 h-5 text-[#6b6b7a]" />
                          </div>
                        )}
                        <div>
                          <p className="text-white font-medium">{item.name}</p>
                          {item.description && (
                            <p className="text-xs text-[#6b6b7a] line-clamp-1 max-w-[200px]">{item.description}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {item.category ? (
                        <span
                          className="px-2 py-1 rounded-lg text-xs font-medium"
                          style={{ backgroundColor: `${item.category.color}15`, color: item.category.color }}
                        >
                          {item.category.name}
                        </span>
                      ) : (
                        <span className="text-[#6b6b7a] text-sm">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-[#9a9aa8] font-mono text-sm">{item.sku || '—'}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-white font-medium">{formatPrice(item.price)}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className={`font-medium ${
                        item.quantity === 0 ? 'text-[#ef4444]' :
                        item.quantity <= item.min_quantity ? 'text-[#f59e0b]' :
                        'text-white'
                      }`}>
                        {item.quantity}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-2 py-1 rounded-lg text-xs font-medium ${
                        item.is_active
                          ? 'bg-[#22c55e]/15 text-[#22c55e]'
                          : 'bg-[#6b7280]/15 text-[#6b7280]'
                      }`}>
                        {item.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditItem(item)}
                          className="p-2 text-[#6b6b7a] hover:text-[#3b82f6] hover:bg-[#3b82f6]/10 rounded-lg transition-colors"
                        >
                          <FiEdit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => { setItemToDelete({ type: 'item', id: item.id, name: item.name }); setShowDeleteModal(true); }}
                          className="p-2 text-[#6b6b7a] hover:text-[#ef4444] hover:bg-[#ef4444]/10 rounded-lg transition-colors"
                        >
                          <FiTrash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredItems.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-[#6b6b7a]">
                      No items found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Categories Tab */}
        {activeTab === 'categories' && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#2a2a35]">
                  <th className="text-left px-6 py-4 text-xs font-semibold text-[#6b6b7a] uppercase">Category</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-[#6b6b7a] uppercase">Description</th>
                  <th className="text-center px-6 py-4 text-xs font-semibold text-[#6b6b7a] uppercase">Items</th>
                  <th className="text-center px-6 py-4 text-xs font-semibold text-[#6b6b7a] uppercase">Order</th>
                  <th className="text-center px-6 py-4 text-xs font-semibold text-[#6b6b7a] uppercase">Status</th>
                  <th className="text-right px-6 py-4 text-xs font-semibold text-[#6b6b7a] uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((cat) => {
                  const itemCount = items.filter(i => i.category_id === cat.id).length;
                  return (
                    <tr key={cat.id} className="border-b border-[#1f1f28] hover:bg-[#1a1a23] transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-10 h-10 rounded-lg flex items-center justify-center"
                            style={{ backgroundColor: `${cat.color}15` }}
                          >
                            <FiTag className="w-5 h-5" style={{ color: cat.color }} />
                          </div>
                          <span className="text-white font-medium">{cat.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-[#9a9aa8] text-sm">{cat.description || '—'}</span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-white font-medium">{itemCount}</span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-[#6b6b7a]">{cat.display_order}</span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`px-2 py-1 rounded-lg text-xs font-medium ${
                          cat.is_active
                            ? 'bg-[#22c55e]/15 text-[#22c55e]'
                            : 'bg-[#6b7280]/15 text-[#6b7280]'
                        }`}>
                          {cat.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEditCategory(cat)}
                            className="p-2 text-[#6b6b7a] hover:text-[#3b82f6] hover:bg-[#3b82f6]/10 rounded-lg transition-colors"
                          >
                            <FiEdit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => { setItemToDelete({ type: 'category', id: cat.id, name: cat.name }); setShowDeleteModal(true); }}
                            className="p-2 text-[#6b6b7a] hover:text-[#ef4444] hover:bg-[#ef4444]/10 rounded-lg transition-colors"
                          >
                            <FiTrash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Orders Tab */}
        {activeTab === 'orders' && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#2a2a35]">
                  <th className="text-left px-6 py-4 text-xs font-semibold text-[#6b6b7a] uppercase">Order #</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-[#6b6b7a] uppercase">User</th>
                  <th className="text-center px-6 py-4 text-xs font-semibold text-[#6b6b7a] uppercase">Items</th>
                  <th className="text-center px-6 py-4 text-xs font-semibold text-[#6b6b7a] uppercase">Status</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-[#6b6b7a] uppercase">Date</th>
                  <th className="text-right px-6 py-4 text-xs font-semibold text-[#6b6b7a] uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order) => {
                  const statusConfig = STATUS_CONFIG[order.status];
                  return (
                    <tr key={order.id} className="border-b border-[#1f1f28] hover:bg-[#1a1a23] transition-colors">
                      <td className="px-6 py-4">
                        <span className="text-white font-mono font-medium">{order.order_number}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-white">{order.user_name}</p>
                          <p className="text-xs text-[#6b6b7a]">{order.user_email}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-white font-medium">{order.items?.length || 0}</span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span
                          className="px-2.5 py-1 rounded-lg text-xs font-medium"
                          style={{ backgroundColor: statusConfig.bgColor, color: statusConfig.color }}
                        >
                          {statusConfig.label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-[#9a9aa8] text-sm">{formatDate(order.created_at)}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => { setSelectedOrder(order); setShowOrderModal(true); }}
                            className="px-3 py-1.5 text-xs text-white bg-[#2a2a35] hover:bg-[#3a3a48] rounded-lg transition-colors"
                          >
                            View
                          </button>
                          {order.status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleUpdateOrderStatus(order.id, 'approved')}
                                className="p-2 text-[#22c55e] hover:bg-[#22c55e]/10 rounded-lg transition-colors"
                              >
                                <FiCheck className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleUpdateOrderStatus(order.id, 'rejected')}
                                className="p-2 text-[#ef4444] hover:bg-[#ef4444]/10 rounded-lg transition-colors"
                                title="Reject"
                              >
                                <FiX className="w-4 h-4" />
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => handleDeleteOrder(order)}
                            className="p-2 text-[#6b6b7a] hover:text-[#ef4444] hover:bg-[#ef4444]/10 rounded-lg transition-colors"
                            title="Delete Order"
                          >
                            <FiTrash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredOrders.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-[#6b6b7a]">
                      No orders found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>

      {/* Item Modal */}
      <AnimatePresence>
        {showItemModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowItemModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#141418] border border-[#2a2a35] rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between p-6 border-b border-[#2a2a35]">
                <h2 className="text-xl font-bold text-white">
                  {editingItem ? 'Edit Item' : 'Add New Item'}
                </h2>
                <button onClick={() => setShowItemModal(false)} className="p-2 text-[#6b6b7a] hover:text-white rounded-lg">
                  <FiX className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                {/* Image Upload */}
                <div>
                  <label className="block text-sm font-medium text-[#9a9aa8] mb-2">Image</label>
                  <div className="flex items-center gap-4">
                    {imagePreview ? (
                      <img src={imagePreview} alt="Preview" className="w-20 h-20 rounded-xl object-cover" />
                    ) : (
                      <div className="w-20 h-20 rounded-xl bg-[#2a2a35] flex items-center justify-center">
                        <FiImage className="w-8 h-8 text-[#6b6b7a]" />
                      </div>
                    )}
                    <label className="flex items-center gap-2 px-4 py-2 bg-[#2a2a35] hover:bg-[#3a3a48] rounded-xl cursor-pointer transition-colors">
                      <FiUpload className="w-4 h-4 text-[#6b6b7a]" />
                      <span className="text-sm text-[#9a9aa8]">Upload Image</span>
                      <input type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
                    </label>
                  </div>
                </div>

                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-[#9a9aa8] mb-2">Name *</label>
                  <input
                    type="text"
                    value={itemForm.name}
                    onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
                    className="w-full px-4 py-2.5 bg-[#0f0f12] border border-[#2a2a35] rounded-xl text-white focus:outline-none focus:border-[#ea2127]/50"
                    placeholder="Item name"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-[#9a9aa8] mb-2">Description</label>
                  <textarea
                    value={itemForm.description}
                    onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2.5 bg-[#0f0f12] border border-[#2a2a35] rounded-xl text-white focus:outline-none focus:border-[#ea2127]/50 resize-none"
                    placeholder="Item description"
                  />
                </div>

                {/* Category & SKU */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#9a9aa8] mb-2">Category</label>
                    <select
                      value={itemForm.category_id}
                      onChange={(e) => setItemForm({ ...itemForm, category_id: e.target.value })}
                      className="w-full px-4 py-2.5 bg-[#0f0f12] border border-[#2a2a35] rounded-xl text-white focus:outline-none focus:border-[#ea2127]/50"
                    >
                      <option value="">Select category</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#9a9aa8] mb-2">SKU</label>
                    <input
                      type="text"
                      value={itemForm.sku}
                      onChange={(e) => setItemForm({ ...itemForm, sku: e.target.value })}
                      className="w-full px-4 py-2.5 bg-[#0f0f12] border border-[#2a2a35] rounded-xl text-white focus:outline-none focus:border-[#ea2127]/50"
                      placeholder="e.g., ELEC-001"
                    />
                  </div>
                </div>

                {/* Price & Quantities */}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#9a9aa8] mb-2">Price (EUR)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={itemForm.price}
                      onChange={(e) => setItemForm({ ...itemForm, price: parseFloat(e.target.value) || 0 })}
                      className="w-full px-4 py-2.5 bg-[#0f0f12] border border-[#2a2a35] rounded-xl text-white focus:outline-none focus:border-[#ea2127]/50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#9a9aa8] mb-2">Quantity</label>
                    <input
                      type="number"
                      min="0"
                      value={itemForm.quantity}
                      onChange={(e) => setItemForm({ ...itemForm, quantity: parseInt(e.target.value) || 0 })}
                      className="w-full px-4 py-2.5 bg-[#0f0f12] border border-[#2a2a35] rounded-xl text-white focus:outline-none focus:border-[#ea2127]/50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#9a9aa8] mb-2">Min Qty</label>
                    <input
                      type="number"
                      min="0"
                      value={itemForm.min_quantity}
                      onChange={(e) => setItemForm({ ...itemForm, min_quantity: parseInt(e.target.value) || 0 })}
                      className="w-full px-4 py-2.5 bg-[#0f0f12] border border-[#2a2a35] rounded-xl text-white focus:outline-none focus:border-[#ea2127]/50"
                    />
                  </div>
                </div>

                {/* Active toggle */}
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setItemForm({ ...itemForm, is_active: !itemForm.is_active })}
                    className={`w-12 h-6 rounded-full transition-colors ${itemForm.is_active ? 'bg-[#22c55e]' : 'bg-[#2a2a35]'}`}
                  >
                    <div className={`w-5 h-5 rounded-full bg-white transform transition-transform ${itemForm.is_active ? 'translate-x-6' : 'translate-x-0.5'}`} />
                  </button>
                  <span className="text-sm text-[#9a9aa8]">Active</span>
                </div>
              </div>

              <div className="flex justify-end gap-3 p-6 border-t border-[#2a2a35]">
                <button
                  onClick={() => setShowItemModal(false)}
                  className="px-4 py-2.5 text-[#9a9aa8] hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveItem}
                  disabled={saving || !itemForm.name.trim()}
                  className="flex items-center gap-2 px-4 py-2.5 bg-[#ea2127] hover:bg-[#d91e24] text-white rounded-xl font-medium transition-colors disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <FiSave className="w-4 h-4" />
                      {editingItem ? 'Update' : 'Create'}
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Category Modal */}
      <AnimatePresence>
        {showCategoryModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowCategoryModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#141418] border border-[#2a2a35] rounded-2xl w-full max-w-md"
            >
              <div className="flex items-center justify-between p-6 border-b border-[#2a2a35]">
                <h2 className="text-xl font-bold text-white">
                  {editingCategory ? 'Edit Category' : 'Add New Category'}
                </h2>
                <button onClick={() => setShowCategoryModal(false)} className="p-2 text-[#6b6b7a] hover:text-white rounded-lg">
                  <FiX className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#9a9aa8] mb-2">Name *</label>
                  <input
                    type="text"
                    value={categoryForm.name}
                    onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                    className="w-full px-4 py-2.5 bg-[#0f0f12] border border-[#2a2a35] rounded-xl text-white focus:outline-none focus:border-[#ea2127]/50"
                    placeholder="Category name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#9a9aa8] mb-2">Description</label>
                  <textarea
                    value={categoryForm.description}
                    onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                    rows={2}
                    className="w-full px-4 py-2.5 bg-[#0f0f12] border border-[#2a2a35] rounded-xl text-white focus:outline-none focus:border-[#ea2127]/50 resize-none"
                    placeholder="Category description"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#9a9aa8] mb-2">Color</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={categoryForm.color}
                        onChange={(e) => setCategoryForm({ ...categoryForm, color: e.target.value })}
                        className="w-10 h-10 rounded-lg cursor-pointer"
                      />
                      <input
                        type="text"
                        value={categoryForm.color}
                        onChange={(e) => setCategoryForm({ ...categoryForm, color: e.target.value })}
                        className="flex-1 px-3 py-2 bg-[#0f0f12] border border-[#2a2a35] rounded-lg text-white text-sm focus:outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#9a9aa8] mb-2">Display Order</label>
                    <input
                      type="number"
                      min="0"
                      value={categoryForm.display_order}
                      onChange={(e) => setCategoryForm({ ...categoryForm, display_order: parseInt(e.target.value) || 0 })}
                      className="w-full px-4 py-2.5 bg-[#0f0f12] border border-[#2a2a35] rounded-xl text-white focus:outline-none focus:border-[#ea2127]/50"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setCategoryForm({ ...categoryForm, is_active: !categoryForm.is_active })}
                    className={`w-12 h-6 rounded-full transition-colors ${categoryForm.is_active ? 'bg-[#22c55e]' : 'bg-[#2a2a35]'}`}
                  >
                    <div className={`w-5 h-5 rounded-full bg-white transform transition-transform ${categoryForm.is_active ? 'translate-x-6' : 'translate-x-0.5'}`} />
                  </button>
                  <span className="text-sm text-[#9a9aa8]">Active</span>
                </div>
              </div>

              <div className="flex justify-end gap-3 p-6 border-t border-[#2a2a35]">
                <button onClick={() => setShowCategoryModal(false)} className="px-4 py-2.5 text-[#9a9aa8] hover:text-white transition-colors">
                  Cancel
                </button>
                <button
                  onClick={handleSaveCategory}
                  disabled={saving || !categoryForm.name.trim()}
                  className="flex items-center gap-2 px-4 py-2.5 bg-[#ea2127] hover:bg-[#d91e24] text-white rounded-xl font-medium transition-colors disabled:opacity-50"
                >
                  {saving ? 'Saving...' : editingCategory ? 'Update' : 'Create'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Order Detail Modal */}
      <AnimatePresence>
        {showOrderModal && selectedOrder && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowOrderModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#141418] border border-[#2a2a35] rounded-2xl w-full max-w-lg"
            >
              <div className="flex items-center justify-between p-6 border-b border-[#2a2a35]">
                <div>
                  <h2 className="text-xl font-bold text-white">{selectedOrder.order_number}</h2>
                  <p className="text-sm text-[#6b6b7a]">{formatDate(selectedOrder.created_at)}</p>
                </div>
                <button onClick={() => setShowOrderModal(false)} className="p-2 text-[#6b6b7a] hover:text-white rounded-lg">
                  <FiX className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FiUser className="w-5 h-5 text-[#6b6b7a]" />
                    <div>
                      <p className="text-white">{selectedOrder.user_name}</p>
                      <p className="text-xs text-[#6b6b7a]">{selectedOrder.user_email}</p>
                    </div>
                  </div>
                  <span
                    className="px-3 py-1 rounded-lg text-sm font-medium"
                    style={{
                      backgroundColor: STATUS_CONFIG[selectedOrder.status].bgColor,
                      color: STATUS_CONFIG[selectedOrder.status].color,
                    }}
                  >
                    {STATUS_CONFIG[selectedOrder.status].label}
                  </span>
                </div>

                {selectedOrder.notes && (
                  <div className="bg-[#0f0f12] rounded-xl p-4">
                    <p className="text-xs text-[#6b6b7a] mb-1">Notes</p>
                    <p className="text-[#9a9aa8]">{selectedOrder.notes}</p>
                  </div>
                )}

                <div>
                  <p className="text-sm font-medium text-[#6b6b7a] mb-2">Items</p>
                  <div className="space-y-2">
                    {selectedOrder.items?.map((item) => (
                      <div key={item.id} className="flex items-center justify-between p-3 bg-[#0f0f12] rounded-xl">
                        <div>
                          <p className="text-white">{item.item_name}</p>
                          <p className="text-xs text-[#6b6b7a]">{formatPrice(item.item_price)} each</p>
                        </div>
                        <span className="text-white font-medium">x{item.quantity}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {selectedOrder.status === 'pending' && (
                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={() => { handleUpdateOrderStatus(selectedOrder.id, 'approved'); setShowOrderModal(false); }}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-[#22c55e] hover:bg-[#16a34a] text-white rounded-xl font-medium transition-colors"
                    >
                      <FiCheck className="w-4 h-4" />
                      Approve
                    </button>
                    <button
                      onClick={() => { handleUpdateOrderStatus(selectedOrder.id, 'rejected'); setShowOrderModal(false); }}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-[#ef4444] hover:bg-[#dc2626] text-white rounded-xl font-medium transition-colors"
                    >
                      <FiX className="w-4 h-4" />
                      Reject
                    </button>
                  </div>
                )}

                {selectedOrder.status === 'approved' && (
                  <button
                    onClick={() => { handleUpdateOrderStatus(selectedOrder.id, 'completed'); setShowOrderModal(false); }}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#22c55e] hover:bg-[#16a34a] text-white rounded-xl font-medium transition-colors"
                  >
                    <FiCheck className="w-4 h-4" />
                    Mark as Completed
                  </button>
                )}

                {/* Delete Order Button */}
                <button
                  onClick={() => handleDeleteOrder(selectedOrder)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#1f1f28] hover:bg-[#ef4444]/20 text-[#6b6b7a] hover:text-[#ef4444] rounded-xl font-medium transition-colors mt-2"
                >
                  <FiTrash2 className="w-4 h-4" />
                  Delete Order
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteModal && itemToDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowDeleteModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#141418] border border-[#2a2a35] rounded-2xl w-full max-w-sm p-6"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-full bg-[#ef4444]/15 flex items-center justify-center">
                  <FiTrash2 className="w-6 h-6 text-[#ef4444]" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Delete {itemToDelete.type}?</h3>
                  <p className="text-sm text-[#6b6b7a]">"{itemToDelete.name}"</p>
                </div>
              </div>
              <p className="text-[#9a9aa8] mb-6">
                This action cannot be undone. Are you sure you want to delete this {itemToDelete.type}?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="flex-1 px-4 py-2.5 bg-[#2a2a35] hover:bg-[#3a3a48] text-white rounded-xl font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex-1 px-4 py-2.5 bg-[#ef4444] hover:bg-[#dc2626] text-white rounded-xl font-medium transition-colors disabled:opacity-50"
                >
                  {deleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Order Confirmation Modal */}
      <AnimatePresence>
        {showDeleteOrderModal && orderToDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => !deletingOrder && setShowDeleteOrderModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#141418] border border-[#2a2a35] rounded-2xl max-w-md w-full overflow-hidden shadow-2xl"
            >
              {/* Header */}
              <div className="p-6 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#ef4444]/10 flex items-center justify-center">
                  <FiAlertTriangle className="w-8 h-8 text-[#ef4444]" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Delete Order?</h3>
                <p className="text-[#8b8b9a]">
                  You're about to delete order <span className="text-white font-mono">{orderToDelete.order_number}</span>
                </p>
              </div>

              {/* Order Summary */}
              <div className="mx-6 p-4 bg-[#1a1a23] rounded-xl mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[#6b6b7a] text-sm">Customer</span>
                  <span className="text-white text-sm">{orderToDelete.user_name || 'Unknown'}</span>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[#6b6b7a] text-sm">Status</span>
                  <span
                    className="text-sm px-2 py-0.5 rounded-md"
                    style={{
                      backgroundColor: STATUS_CONFIG[orderToDelete.status]?.bgColor,
                      color: STATUS_CONFIG[orderToDelete.status]?.color,
                    }}
                  >
                    {STATUS_CONFIG[orderToDelete.status]?.label}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#6b6b7a] text-sm">Date</span>
                  <span className="text-white text-sm">{formatDate(orderToDelete.created_at)}</span>
                </div>
              </div>

              {/* Warning */}
              <div className="mx-6 mb-6 p-3 bg-[#ef4444]/10 border border-[#ef4444]/20 rounded-xl">
                <p className="text-[#ef4444] text-sm text-center">
                  This action cannot be undone. The order and all its items will be permanently deleted.
                </p>
              </div>

              {/* Actions */}
              <div className="p-6 pt-0 flex gap-3">
                <button
                  onClick={() => setShowDeleteOrderModal(false)}
                  disabled={deletingOrder}
                  className="flex-1 px-4 py-3 bg-[#2a2a35] hover:bg-[#3a3a48] text-white rounded-xl font-medium transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteOrder}
                  disabled={deletingOrder}
                  className="flex-1 px-4 py-3 bg-[#ef4444] hover:bg-[#dc2626] text-white rounded-xl font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {deletingOrder ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <FiTrash2 className="w-4 h-4" />
                      Delete Order
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
