import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import supabase from '../lib/supabase';

interface Category {
  id: string;
  name: string;
  name_en: string;
  color: string;
  icon: string;
}

interface Distributor {
  id: string;
  name: string;
  website: string | null;
}

interface InventoryItem {
  id: string;
  item_number: number | null;
  description: string;
  description_en: string | null;
  link: string | null;
  link_secondary: string | null;
  location: string | null;
  stock_quantity: number;
  stock_unit: string;
  min_stock_threshold: number;
  needs_order: boolean;
  brand: string | null;
  notes: string | null;
  last_inventory_date: string | null;
  category_id: string | null;
  distributor_id: string | null;
  category?: Category;
  distributor?: Distributor;
}

interface CategoryStats {
  id: string;
  name: string;
  name_en: string;
  color: string;
  icon: string;
  itemCount: number;
  totalStock: number;
  lowStockCount: number;
  needsOrderCount: number;
}

interface GlobalStats {
  totalItems: number;
  totalStock: number;
  lowStockItems: number;
  needsOrderItems: number;
  categories: number;
}

// Category icons mapping
const categoryIcons: Record<string, string> = {
  'Υλικά': '🔧',
  'Materials': '🔧',
  'Πίνακες': '📋',
  'Panels': '📋',
  'Καλώδια': '🔌',
  'Cables': '🔌',
  'UGREEN': '🟢',
  'GM': '🎮',
  'Monitors': '🖥️',
  'Εργαλεία': '🛠️',
  'Tools': '🛠️',
  'Πλακέτες': '💾',
  'PCBs': '💾',
};

export default function InventoryPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [distributors, setDistributors] = useState<Distributor[]>([]);
  const [loading, setLoading] = useState(true);

  // View state
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  const [showNeedsOrderOnly, setShowNeedsOrderOnly] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  // Order quantities (item id -> quantity to order) - persisted to localStorage
  const [orderQuantities, setOrderQuantities] = useState<Record<string, number>>(() => {
    // Load from localStorage on initial render
    const saved = localStorage.getItem('inventoryOrderQuantities');
    return saved ? JSON.parse(saved) : {};
  });

  // Persist order quantities to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('inventoryOrderQuantities', JSON.stringify(orderQuantities));
  }, [orderQuantities]);

  // Edit modal
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [editStock, setEditStock] = useState<number>(0);
  const [editLocation, setEditLocation] = useState<string>('');
  const [editDistributorId, setEditDistributorId] = useState<string>('');
  const [editLink, setEditLink] = useState<string>('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [itemsRes, categoriesRes, distributorsRes] = await Promise.all([
        supabase
          .from('inventory_items')
          .select(`
            *,
            category:inventory_categories(*),
            distributor:inventory_distributors(*)
          `)
          .eq('is_active', true)
          .order('category_id')
          .order('item_number'),
        supabase
          .from('inventory_categories')
          .select('*')
          .eq('is_active', true)
          .order('display_order'),
        supabase
          .from('inventory_distributors')
          .select('*')
          .eq('is_active', true)
          .order('name'),
      ]);

      if (itemsRes.data) setItems(itemsRes.data);
      if (categoriesRes.data) setCategories(categoriesRes.data);
      if (distributorsRes.data) setDistributors(distributorsRes.data);
    } catch (error) {
      console.error('Error fetching inventory data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate stats per category
  const categoryStats = useMemo((): CategoryStats[] => {
    return categories.map(cat => {
      const categoryItems = items.filter(i => i.category_id === cat.id);
      return {
        id: cat.id,
        name: cat.name,
        name_en: cat.name_en,
        color: cat.color,
        icon: cat.icon,
        itemCount: categoryItems.length,
        totalStock: categoryItems.reduce((sum, i) => sum + (i.stock_quantity || 0), 0),
        lowStockCount: categoryItems.filter(i => i.min_stock_threshold > 0 && i.stock_quantity <= i.min_stock_threshold).length,
        needsOrderCount: categoryItems.filter(i => i.needs_order).length,
      };
    });
  }, [categories, items]);

  // Global stats
  const globalStats = useMemo((): GlobalStats => {
    return {
      totalItems: items.length,
      totalStock: items.reduce((sum, i) => sum + (i.stock_quantity || 0), 0),
      lowStockItems: items.filter(i => i.min_stock_threshold > 0 && i.stock_quantity <= i.min_stock_threshold).length,
      needsOrderItems: items.filter(i => i.needs_order).length,
      categories: categories.length,
    };
  }, [items, categories]);

  // Filter items for detailed view
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesSearch = searchQuery === '' ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.brand?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.location?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory = !selectedCategory || item.category_id === selectedCategory;
      const matchesLowStock = !showLowStockOnly || (item.min_stock_threshold > 0 && item.stock_quantity <= item.min_stock_threshold);
      const matchesNeedsOrder = !showNeedsOrderOnly || item.needs_order;

      return matchesSearch && matchesCategory && matchesLowStock && matchesNeedsOrder;
    });
  }, [items, searchQuery, selectedCategory, showLowStockOnly, showNeedsOrderOnly]);

  const openEditModal = (item: InventoryItem) => {
    setEditingItem(item);
    setEditStock(item.stock_quantity);
    setEditLocation(item.location || '');
    setEditDistributorId(item.distributor_id || '');
    setEditLink(item.link || '');
  };

  const updateItem = async () => {
    if (!editingItem) return;

    setSaving(true);
    const previousItem = { ...editingItem };

    // Find the new distributor object for optimistic update
    const newDistributor = editDistributorId
      ? distributors.find(d => d.id === editDistributorId)
      : undefined;

    // Optimistic update
    setItems(prevItems =>
      prevItems.map(i =>
        i.id === editingItem.id
          ? {
              ...i,
              stock_quantity: editStock,
              location: editLocation || null,
              distributor_id: editDistributorId || null,
              distributor: newDistributor,
              link: editLink || null,
              last_inventory_date: new Date().toISOString().split('T')[0],
            }
          : i
      )
    );

    setEditingItem(null);

    try {
      const updates: Record<string, unknown> = {
        stock_quantity: editStock,
        location: editLocation || null,
        distributor_id: editDistributorId || null,
        link: editLink || null,
        last_inventory_date: new Date().toISOString().split('T')[0],
      };

      const { error } = await supabase
        .from('inventory_items')
        .update(updates)
        .eq('id', editingItem.id);

      if (error) {
        // Revert on error
        setItems(prevItems =>
          prevItems.map(i =>
            i.id === previousItem.id ? previousItem : i
          )
        );
        console.error('Error updating item:', error);
        return;
      }

      // Log stock change if it changed
      if (editStock !== previousItem.stock_quantity) {
        await supabase.from('inventory_history').insert({
          item_id: editingItem.id,
          action: 'stock_update',
          previous_quantity: previousItem.stock_quantity,
          new_quantity: editStock,
        });
      }
    } catch (error) {
      // Revert on error
      setItems(prevItems =>
        prevItems.map(i =>
          i.id === previousItem.id ? previousItem : i
        )
      );
      console.error('Error updating item:', error);
    } finally {
      setSaving(false);
    }
  };

  const toggleNeedsOrder = async (item: InventoryItem) => {
    const newValue = !item.needs_order;

    // Optimistic update - update local state immediately
    setItems(prevItems =>
      prevItems.map(i =>
        i.id === item.id ? { ...i, needs_order: newValue } : i
      )
    );

    // Set default order quantity to 1 when adding to order list
    if (newValue && !orderQuantities[item.id]) {
      setOrderQuantities(prev => ({ ...prev, [item.id]: 1 }));
    }

    try {
      const { error } = await supabase
        .from('inventory_items')
        .update({ needs_order: newValue })
        .eq('id', item.id);

      if (error) {
        // Revert on error
        setItems(prevItems =>
          prevItems.map(i =>
            i.id === item.id ? { ...i, needs_order: !newValue } : i
          )
        );
        console.error('Error updating order status:', error);
      }
    } catch (error) {
      // Revert on error
      setItems(prevItems =>
        prevItems.map(i =>
          i.id === item.id ? { ...i, needs_order: !newValue } : i
        )
      );
      console.error('Error updating order status:', error);
    }
  };

  const updateOrderQuantity = (itemId: string, quantity: number) => {
    setOrderQuantities(prev => ({
      ...prev,
      [itemId]: Math.max(1, quantity)
    }));
  };

  // Get count of items in order list
  const orderListCount = useMemo(() => {
    return items.filter(item => item.needs_order).length;
  }, [items]);

  const getStockStatus = (item: InventoryItem) => {
    if (item.stock_quantity === 0) return { color: '#ef4444', label: 'Out of Stock' };
    if (item.min_stock_threshold > 0 && item.stock_quantity <= item.min_stock_threshold) return { color: '#f59e0b', label: 'Low Stock' };
    return { color: '#10b981', label: 'In Stock' };
  };

  const getCategoryIcon = (cat: CategoryStats) => {
    return categoryIcons[cat.name] || categoryIcons[cat.name_en] || '📦';
  };

  const handleCategoryClick = (categoryId: string) => {
    setSelectedCategory(categoryId);
    setSearchQuery('');
    setShowLowStockOnly(false);
    setShowNeedsOrderOnly(false);
  };

  const handleBackToDashboard = () => {
    setSelectedCategory(null);
    setSearchQuery('');
    setShowLowStockOnly(false);
    setShowNeedsOrderOnly(false);
  };

  const selectedCategoryData = selectedCategory
    ? categoryStats.find(c => c.id === selectedCategory)
    : null;

  if (loading) {
    return (
      <div className="min-h-full bg-[#0f0f12] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-[#06b6d4] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[#6b6b7a]">Loading inventory...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-[#0f0f12] relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-grid-pattern opacity-50" />
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#06b6d4] rounded-full blur-[200px] opacity-[0.03]" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-[#8b5cf6] rounded-full blur-[200px] opacity-[0.02]" />

      <div className="relative z-10 p-6 lg:p-10 max-w-[1600px] mx-auto">
        {/* Header */}
        <header className="mb-8 opacity-0 animate-[fadeSlideIn_0.5s_ease-out_forwards]">
          <div className="flex items-center gap-3 mb-2">
            {selectedCategory && (
              <button
                onClick={handleBackToDashboard}
                className="w-10 h-10 rounded-xl bg-[#1f1f28] hover:bg-[#2a2a38] flex items-center justify-center transition-colors"
              >
                <svg className="w-5 h-5 text-[#6b6b7a]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}
            <div className="w-1 h-8 bg-[#06b6d4] rounded-full" />
            <h1 className="text-2xl lg:text-3xl font-bold text-white">
              {selectedCategory ? (selectedCategoryData?.name_en || selectedCategoryData?.name) : 'Inventory'}
            </h1>
          </div>
          <p className="text-[#6b6b7a] ml-4">
            {selectedCategory
              ? `${selectedCategoryData?.itemCount} items in this category`
              : 'Track components, stock levels, and orders'
            }
          </p>
        </header>

        {!selectedCategory ? (
          /* Dashboard View */
          <>
            {/* Global Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8 opacity-0 animate-[fadeSlideIn_0.5s_ease-out_forwards]" style={{ animationDelay: '100ms' }}>
              <div className="bg-[#141418] border border-[#1f1f28] rounded-xl p-5">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#3b82f6] to-[#1d4ed8] flex items-center justify-center shadow-lg shadow-[#3b82f6]/20">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-white">{globalStats.totalItems}</p>
                    <p className="text-sm text-[#6b6b7a]">Total Items</p>
                  </div>
                </div>
              </div>

              <div className="bg-[#141418] border border-[#1f1f28] rounded-xl p-5">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#10b981] to-[#059669] flex items-center justify-center shadow-lg shadow-[#10b981]/20">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-white">{globalStats.totalStock.toLocaleString()}</p>
                    <p className="text-sm text-[#6b6b7a]">In Stock</p>
                  </div>
                </div>
              </div>

              <div
                className="bg-[#141418] border border-[#1f1f28] rounded-xl p-5 cursor-pointer hover:border-[#f59e0b]/50 transition-all group"
                onClick={() => {
                  setShowLowStockOnly(true);
                  setSelectedCategory('');
                }}
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#f59e0b] to-[#d97706] flex items-center justify-center shadow-lg shadow-[#f59e0b]/20 group-hover:scale-110 transition-transform">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-[#f59e0b]">{globalStats.lowStockItems}</p>
                    <p className="text-sm text-[#6b6b7a]">Low Stock</p>
                  </div>
                </div>
              </div>

              <div
                className="bg-[#141418] border border-[#1f1f28] rounded-xl p-5 cursor-pointer hover:border-[#ef4444]/50 transition-all group"
                onClick={() => {
                  setShowNeedsOrderOnly(true);
                  setSelectedCategory('');
                }}
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#ef4444] to-[#dc2626] flex items-center justify-center shadow-lg shadow-[#ef4444]/20 group-hover:scale-110 transition-transform">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-[#ef4444]">{globalStats.needsOrderItems}</p>
                    <p className="text-sm text-[#6b6b7a]">Needs Order</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Category Grid */}
            <div className="mb-6 opacity-0 animate-[fadeSlideIn_0.5s_ease-out_forwards]" style={{ animationDelay: '200ms' }}>
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-[#6b6b7a]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
                Categories
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {categoryStats.map((cat, index) => (
                  <div
                    key={cat.id}
                    onClick={() => handleCategoryClick(cat.id)}
                    className="group bg-[#141418] border border-[#1f1f28] rounded-2xl p-5 cursor-pointer hover:border-opacity-50 transition-all hover:scale-[1.02] hover:shadow-xl opacity-0 animate-[fadeSlideIn_0.4s_ease-out_forwards]"
                    style={{
                      animationDelay: `${300 + index * 50}ms`,
                      borderColor: `${cat.color}30`,
                    }}
                  >
                    {/* Category Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div
                        className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl shadow-lg transition-transform group-hover:scale-110"
                        style={{
                          background: `linear-gradient(135deg, ${cat.color}40, ${cat.color}20)`,
                          boxShadow: `0 8px 24px ${cat.color}20`,
                        }}
                      >
                        {getCategoryIcon(cat)}
                      </div>
                      {cat.lowStockCount > 0 && (
                        <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-[#f59e0b]/20 text-[#f59e0b] text-xs font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#f59e0b] animate-pulse" />
                          {cat.lowStockCount} low
                        </div>
                      )}
                    </div>

                    {/* Category Name */}
                    <h3 className="text-lg font-semibold text-white mb-4 group-hover:text-[#06b6d4] transition-colors">
                      {cat.name}
                    </h3>

                    {/* Stats Row */}
                    <div className="flex items-center justify-between pt-4 border-t border-[#1f1f28]">
                      <div className="text-center">
                        <p className="text-xl font-bold text-white">{cat.itemCount}</p>
                        <p className="text-xs text-[#6b6b7a]">Items</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xl font-bold" style={{ color: cat.color }}>{cat.totalStock.toLocaleString()}</p>
                        <p className="text-xs text-[#6b6b7a]">In Stock</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xl font-bold text-[#ef4444]">{cat.needsOrderCount}</p>
                        <p className="text-xs text-[#6b6b7a]">To Order</p>
                      </div>
                    </div>

                    {/* Hover Arrow */}
                    <div className="flex justify-end mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
                      <svg className="w-5 h-5 text-[#6b6b7a]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          /* Items List View */
          <>
            {/* Filters */}
            <div className="flex flex-col lg:flex-row gap-4 mb-6 opacity-0 animate-[fadeSlideIn_0.5s_ease-out_forwards]" style={{ animationDelay: '100ms' }}>
              {/* Search */}
              <div className="relative flex-1 max-w-md">
                <input
                  type="text"
                  placeholder="Search items, brands, locations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-3 pl-12 bg-[#141418] border border-[#2a2a35] rounded-xl text-white placeholder-[#5a5a68] focus:outline-none focus:border-[#06b6d4]/50 focus:ring-2 focus:ring-[#06b6d4]/20 transition-all"
                />
                <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#5a5a68]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>

              {/* Quick Filters */}
              <div className="flex gap-2">
                <button
                  onClick={() => setShowLowStockOnly(!showLowStockOnly)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                    showLowStockOnly
                      ? 'bg-[#f59e0b]/20 text-[#f59e0b] border border-[#f59e0b]/50'
                      : 'bg-[#1f1f28] text-[#6b6b7a] hover:text-white border border-transparent'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  Low Stock
                </button>
                <button
                  onClick={() => setShowNeedsOrderOnly(!showNeedsOrderOnly)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                    showNeedsOrderOnly
                      ? 'bg-[#ef4444]/20 text-[#ef4444] border border-[#ef4444]/50'
                      : 'bg-[#1f1f28] text-[#6b6b7a] hover:text-white border border-transparent'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  Needs Order
                </button>
              </div>

              {/* View Toggle & Order List */}
              <div className="flex items-center gap-2 ml-auto">
                <div className="flex gap-1 bg-[#1f1f28] p-1 rounded-lg">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded-md transition-colors ${
                      viewMode === 'grid'
                        ? 'bg-[#06b6d4] text-white'
                        : 'text-[#6b6b7a] hover:text-white'
                    }`}
                    title="Grid view"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setViewMode('table')}
                    className={`p-2 rounded-md transition-colors ${
                      viewMode === 'table'
                        ? 'bg-[#06b6d4] text-white'
                        : 'text-[#6b6b7a] hover:text-white'
                    }`}
                    title="Table view"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                    </svg>
                  </button>
                </div>

                {/* Order List Button */}
                <button
                  onClick={() => navigate('/order-list')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    orderListCount > 0
                      ? 'bg-[#ef4444] text-white hover:bg-[#dc2626]'
                      : 'bg-[#1f1f28] text-[#6b6b7a] hover:text-white'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                  </svg>
                  Order List
                  {orderListCount > 0 && (
                    <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">
                      {orderListCount}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Grid View */}
            {viewMode === 'grid' && (
              <div className="opacity-0 animate-[fadeSlideIn_0.5s_ease-out_forwards]" style={{ animationDelay: '200ms' }}>
                {filteredItems.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filteredItems.map((item, index) => {
                      const status = getStockStatus(item);
                      return (
                        <div
                          key={item.id}
                          className="group bg-[#141418] border border-[#1f1f28] rounded-xl p-4 hover:border-[#2a2a38] transition-all hover:shadow-lg opacity-0 animate-[fadeSlideIn_0.3s_ease-out_forwards]"
                          style={{ animationDelay: `${200 + index * 30}ms` }}
                        >
                          {/* Status Badge & Order Button */}
                          <div className="flex items-start justify-between mb-3">
                            <span
                              className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium"
                              style={{
                                backgroundColor: `${status.color}20`,
                                color: status.color,
                              }}
                            >
                              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: status.color }} />
                              {status.label}
                            </span>
                            {/* Fixed width container to prevent layout shift */}
                            <div className="flex items-center gap-1 w-[88px] justify-end">
                              <input
                                type="number"
                                min="1"
                                value={orderQuantities[item.id] || 1}
                                onChange={(e) => updateOrderQuantity(item.id, parseInt(e.target.value) || 1)}
                                onClick={(e) => e.stopPropagation()}
                                className={`w-12 px-1 py-1 bg-[#1f1f28] border border-[#ef4444]/30 rounded-lg text-white text-center text-sm font-mono focus:outline-none focus:border-[#ef4444] transition-all ${
                                  item.needs_order ? 'opacity-100' : 'opacity-0 pointer-events-none'
                                }`}
                              />
                              <button
                                onClick={() => toggleNeedsOrder(item)}
                                className={`p-1.5 rounded-lg transition-colors flex-shrink-0 ${
                                  item.needs_order
                                    ? 'bg-[#ef4444]/20 text-[#ef4444] hover:bg-[#ef4444]/30'
                                    : 'bg-[#1f1f28] text-[#6b6b7a] hover:text-white hover:bg-[#2a2a38]'
                                }`}
                                title={item.needs_order ? 'Remove from order list' : 'Add to order list'}
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                              </button>
                            </div>
                          </div>

                          {/* Item Description */}
                          <h3 className="font-medium text-white text-sm leading-tight mb-2 line-clamp-2 min-h-[2.5rem]">
                            {item.description}
                          </h3>

                          {/* Brand & Location */}
                          <div className="flex items-center gap-2 text-xs text-[#6b6b7a] mb-3">
                            {item.brand && (
                              <span className="bg-[#1f1f28] px-2 py-0.5 rounded">{item.brand}</span>
                            )}
                            {item.location && (
                              <span className="flex items-center gap-1">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                {item.location}
                              </span>
                            )}
                          </div>

                          {/* Stock Quantity */}
                          <div className="flex items-center justify-between py-3 border-t border-[#1f1f28]">
                            <div>
                              <span className="font-mono text-2xl font-bold text-white">
                                {item.stock_quantity}
                              </span>
                              <span className="text-[#6b6b7a] text-sm ml-1">{item.stock_unit}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => openEditModal(item)}
                                className="p-2 bg-[#1f1f28] text-[#6b6b7a] hover:text-white hover:bg-[#2a2a38] rounded-lg transition-colors"
                                title="Edit item"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                              {item.link && (
                                <a
                                  href={item.link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-2 bg-[#1f1f28] text-[#6b6b7a] hover:text-[#06b6d4] hover:bg-[#2a2a38] rounded-lg transition-colors"
                                  title="View product"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                  </svg>
                                </a>
                              )}
                            </div>
                          </div>

                          {/* Distributor */}
                          {item.distributor && (
                            <div className="pt-2 border-t border-[#1f1f28]">
                              {item.distributor.website ? (
                                <a
                                  href={item.distributor.website}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[#06b6d4] hover:underline text-xs flex items-center gap-1"
                                >
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                                  </svg>
                                  {item.distributor.name}
                                </a>
                              ) : (
                                <span className="text-[#6b6b7a] text-xs flex items-center gap-1">
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                                  </svg>
                                  {item.distributor.name}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-16 bg-[#141418] border border-[#1f1f28] rounded-2xl">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#1a1a1f] flex items-center justify-center">
                      <svg className="w-8 h-8 text-[#3a3a48]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                    </div>
                    <p className="text-[#6b6b7a] mb-2">No items found</p>
                    <p className="text-[#4a4a58] text-sm">Try adjusting your filters</p>
                  </div>
                )}
              </div>
            )}

            {/* Table View */}
            {viewMode === 'table' && (
              <div className="bg-[#141418] border border-[#1f1f28] rounded-2xl overflow-hidden opacity-0 animate-[fadeSlideIn_0.5s_ease-out_forwards]" style={{ animationDelay: '200ms' }}>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[#1f1f28]">
                        <th className="px-4 py-4 text-left text-xs font-semibold text-[#6b6b7a] uppercase tracking-wider">Item</th>
                        <th className="px-4 py-4 text-left text-xs font-semibold text-[#6b6b7a] uppercase tracking-wider">Location</th>
                        <th className="px-4 py-4 text-left text-xs font-semibold text-[#6b6b7a] uppercase tracking-wider">Distributor</th>
                        <th className="px-4 py-4 text-center text-xs font-semibold text-[#6b6b7a] uppercase tracking-wider">Stock</th>
                        <th className="px-4 py-4 text-center text-xs font-semibold text-[#6b6b7a] uppercase tracking-wider">Status</th>
                        <th className="px-4 py-4 text-center text-xs font-semibold text-[#6b6b7a] uppercase tracking-wider">Order</th>
                        <th className="px-4 py-4 text-center text-xs font-semibold text-[#6b6b7a] uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1f1f28]">
                      {filteredItems.map((item) => {
                        const status = getStockStatus(item);
                        return (
                          <tr key={item.id} className="hover:bg-[#1a1a1f] transition-colors">
                            <td className="px-4 py-4">
                              <div className="max-w-xs">
                                <div className="font-medium text-white truncate">{item.description}</div>
                                {item.brand && (
                                  <div className="text-xs text-[#6b6b7a]">{item.brand}</div>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-4 text-[#8b8b9a] text-sm">
                              {item.location || '-'}
                            </td>
                            <td className="px-4 py-4">
                              {item.distributor ? (
                                item.distributor.website ? (
                                  <a
                                    href={item.distributor.website}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[#06b6d4] hover:underline text-sm"
                                  >
                                    {item.distributor.name}
                                  </a>
                                ) : (
                                  <span className="text-[#8b8b9a] text-sm">{item.distributor.name}</span>
                                )
                              ) : (
                                <span className="text-[#4a4a58] text-sm">-</span>
                              )}
                            </td>
                            <td className="px-4 py-4 text-center">
                              <span className="font-mono text-lg font-semibold text-white">
                                {item.stock_quantity}
                              </span>
                              <span className="text-[#6b6b7a] text-xs ml-1">{item.stock_unit}</span>
                            </td>
                            <td className="px-4 py-4 text-center">
                              <span
                                className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium"
                                style={{
                                  backgroundColor: `${status.color}20`,
                                  color: status.color,
                                }}
                              >
                                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: status.color }} />
                                {status.label}
                              </span>
                            </td>
                            <td className="px-4 py-4 text-center">
                              {/* Fixed width container to prevent layout shift */}
                              <div className="flex items-center justify-center gap-2 w-[100px] mx-auto">
                                <input
                                  type="number"
                                  min="1"
                                  value={orderQuantities[item.id] || 1}
                                  onChange={(e) => updateOrderQuantity(item.id, parseInt(e.target.value) || 1)}
                                  className={`w-14 px-2 py-1.5 bg-[#1f1f28] border border-[#ef4444]/30 rounded-lg text-white text-center text-sm font-mono focus:outline-none focus:border-[#ef4444] transition-all ${
                                    item.needs_order ? 'opacity-100' : 'opacity-0 pointer-events-none'
                                  }`}
                                />
                                <button
                                  onClick={() => toggleNeedsOrder(item)}
                                  className={`p-2 rounded-lg transition-colors flex-shrink-0 ${
                                    item.needs_order
                                      ? 'bg-[#ef4444]/20 text-[#ef4444] hover:bg-[#ef4444]/30'
                                      : 'bg-[#1f1f28] text-[#6b6b7a] hover:text-white hover:bg-[#2a2a38]'
                                  }`}
                                  title={item.needs_order ? 'Remove from order list' : 'Add to order list'}
                                >
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                                  </svg>
                                </button>
                              </div>
                            </td>
                            <td className="px-4 py-4 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  onClick={() => openEditModal(item)}
                                  className="p-2 bg-[#1f1f28] text-[#6b6b7a] hover:text-white hover:bg-[#2a2a38] rounded-lg transition-colors"
                                  title="Edit item"
                                >
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                </button>
                                {item.link && (
                                  <a
                                    href={item.link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-2 bg-[#1f1f28] text-[#6b6b7a] hover:text-[#06b6d4] hover:bg-[#2a2a38] rounded-lg transition-colors"
                                    title="View product"
                                  >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                    </svg>
                                  </a>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {filteredItems.length === 0 && (
                  <div className="text-center py-16">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#1a1a1f] flex items-center justify-center">
                      <svg className="w-8 h-8 text-[#3a3a48]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                    </div>
                    <p className="text-[#6b6b7a] mb-2">No items found</p>
                    <p className="text-[#4a4a58] text-sm">Try adjusting your filters</p>
                  </div>
                )}
              </div>
            )}

            {/* Results count */}
            <div className="mt-4 text-[#6b6b7a] text-sm">
              Showing {filteredItems.length} of {items.filter(i => !selectedCategory || i.category_id === selectedCategory).length} items
            </div>
          </>
        )}
      </div>

      {/* Edit Item Modal */}
      {editingItem && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#141418] border border-[#2a2a35] rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-[#2a2a35] sticky top-0 bg-[#141418]">
              <h2 className="text-xl font-bold text-white">Edit Item</h2>
              <p className="text-[#6b6b7a] text-sm mt-1 truncate">{editingItem.description}</p>
            </div>

            <div className="p-6 space-y-5">
              {/* Stock Quantity */}
              <div>
                <label className="block text-sm font-medium text-[#8b8b9a] mb-2">
                  Stock Quantity
                </label>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setEditStock(Math.max(0, editStock - 1))}
                    className="w-11 h-11 rounded-xl bg-[#1f1f28] hover:bg-[#2a2a38] text-white text-xl font-bold transition-colors flex items-center justify-center"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    value={editStock}
                    onChange={(e) => setEditStock(Math.max(0, parseInt(e.target.value) || 0))}
                    className="flex-1 px-4 py-3 bg-[#1a1a1f] border border-[#2a2a35] rounded-xl text-white text-center text-xl font-mono focus:outline-none focus:border-[#06b6d4]/50"
                  />
                  <button
                    onClick={() => setEditStock(editStock + 1)}
                    className="w-11 h-11 rounded-xl bg-[#1f1f28] hover:bg-[#2a2a38] text-white text-xl font-bold transition-colors flex items-center justify-center"
                  >
                    +
                  </button>
                </div>
                {editStock !== editingItem.stock_quantity && (
                  <p className="text-xs text-[#6b6b7a] mt-1">
                    Previous: {editingItem.stock_quantity} → New: {editStock}
                  </p>
                )}
              </div>

              {/* Location */}
              <div>
                <label className="block text-sm font-medium text-[#8b8b9a] mb-2">
                  Location
                </label>
                <input
                  type="text"
                  value={editLocation}
                  onChange={(e) => setEditLocation(e.target.value)}
                  placeholder="e.g., Shelf A1, Warehouse B"
                  className="w-full px-4 py-3 bg-[#1a1a1f] border border-[#2a2a35] rounded-xl text-white placeholder-[#4a4a58] focus:outline-none focus:border-[#06b6d4]/50"
                />
              </div>

              {/* Distributor */}
              <div>
                <label className="block text-sm font-medium text-[#8b8b9a] mb-2">
                  Distributor
                </label>
                <select
                  value={editDistributorId}
                  onChange={(e) => setEditDistributorId(e.target.value)}
                  className="w-full px-4 py-3 bg-[#1a1a1f] border border-[#2a2a35] rounded-xl text-white focus:outline-none focus:border-[#06b6d4]/50 appearance-none cursor-pointer"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b6b7a' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                    backgroundPosition: 'right 0.75rem center',
                    backgroundRepeat: 'no-repeat',
                    backgroundSize: '1.5em 1.5em',
                    paddingRight: '2.5rem',
                  }}
                >
                  <option value="">No distributor</option>
                  {distributors.map((dist) => (
                    <option key={dist.id} value={dist.id}>
                      {dist.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Link */}
              <div>
                <label className="block text-sm font-medium text-[#8b8b9a] mb-2">
                  Product Link
                </label>
                <input
                  type="url"
                  value={editLink}
                  onChange={(e) => setEditLink(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-4 py-3 bg-[#1a1a1f] border border-[#2a2a35] rounded-xl text-white placeholder-[#4a4a58] focus:outline-none focus:border-[#06b6d4]/50"
                />
                {editLink && (
                  <a
                    href={editLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-[#06b6d4] hover:underline mt-2"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    Open link
                  </a>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t border-[#2a2a35]">
                <button
                  onClick={() => setEditingItem(null)}
                  className="flex-1 px-4 py-3 bg-[#1f1f28] hover:bg-[#2a2a38] text-white rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={updateItem}
                  disabled={saving}
                  className="flex-1 px-4 py-3 bg-[#06b6d4] hover:bg-[#0891b2] text-white rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
