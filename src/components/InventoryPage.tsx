import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import supabase from '../lib/supabase';
import { useViewAsStore } from '../store/viewAsStore';
import { useAuthStore } from '../store/authStore';

interface Category {
  id: string;
  name: string;
  name_en: string;
  color: string;
  icon: string;
}

// Map category names to icon file names
const getCategoryIconPath = (category?: Category): string | null => {
  if (!category) return null;

  // Try to match category name_en to icon file
  const nameEn = category.name_en?.toUpperCase().replace(/\s+/g, '_');
  const name = category.name?.toUpperCase().replace(/\s+/g, '_');

  const iconMap: Record<string, string> = {
    'CABLES': '/electronic_inventory_icons/CABLES.svg',
    'CABLE': '/electronic_inventory_icons/CABLES.svg',
    'GENERAL_MATERIALS': '/electronic_inventory_icons/GENERAL_MATERIALS.svg',
    'GENERAL MATERIALS': '/electronic_inventory_icons/GENERAL_MATERIALS.svg',
    'MATERIALS': '/electronic_inventory_icons/MATERIALS.svg',
    'MATERIAL': '/electronic_inventory_icons/MATERIALS.svg',
    'MONITORS': '/electronic_inventory_icons/MONITORS.svg',
    'MONITOR': '/electronic_inventory_icons/MONITORS.svg',
    'PANELS': '/electronic_inventory_icons/PANELS.svg',
    'PANEL': '/electronic_inventory_icons/PANELS.svg',
    'PCBS': '/electronic_inventory_icons/PCBS.svg',
    'PCB': '/electronic_inventory_icons/PCBS.svg',
    'TOOLS': '/electronic_inventory_icons/TOOLS.svg',
    'TOOL': '/electronic_inventory_icons/TOOLS.svg',
    'UGREEN': '/electronic_inventory_icons/UGREEN.svg',
  };

  return iconMap[nameEn] || iconMap[name] || null;
};

// Category icon component
const CategoryIcon = ({ category, className = "w-10 h-10" }: { category?: Category; className?: string }) => {
  const iconPath = getCategoryIconPath(category);

  if (iconPath) {
    return (
      <img
        src={iconPath}
        alt={category?.name_en || category?.name || 'Category'}
        className={`${className} object-contain`}
      />
    );
  }

  // Fallback to emoji if no SVG icon
  return (
    <span className={`${className} flex items-center justify-center text-2xl`}>
      {category?.icon || '📦'}
    </span>
  );
};

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

export default function InventoryPage() {
  const navigate = useNavigate();
  const { getEffectiveRoles } = useViewAsStore();
  const { user, hasRole, roles: actualRoles } = useAuthStore();
  const effectiveRoles = getEffectiveRoles();

  // Database edit permission
  const [hasDbEditPermission, setHasDbEditPermission] = useState<boolean>(false);

  // Check database edit permission for inventory section
  useEffect(() => {
    const checkEditPermission = async () => {
      // Super Admin always has edit access
      if (hasRole('Super Admin')) {
        setHasDbEditPermission(true);
        return;
      }

      if (!user) {
        setHasDbEditPermission(false);
        return;
      }

      try {
        // Get user's role IDs
        const { data: userRoles, error: rolesError } = await supabase
          .from('user_roles')
          .select('role_id')
          .eq('user_id', user.id);

        if (rolesError) throw rolesError;

        if (!userRoles || userRoles.length === 0) {
          setHasDbEditPermission(false);
          return;
        }

        const roleIds = userRoles.map((ur: { role_id: string }) => ur.role_id);

        // Check if any of the user's roles have edit permission for inventory
        const { data: permissions, error: permError } = await supabase
          .from('role_section_permissions')
          .select('can_edit')
          .eq('section_key', 'inventory')
          .in('role_id', roleIds)
          .eq('can_edit', true);

        if (permError) throw permError;

        setHasDbEditPermission(permissions && permissions.length > 0);
      } catch (error) {
        console.error('Error checking edit permission:', error);
        setHasDbEditPermission(false);
      }
    };

    checkEditPermission();
  }, [user, hasRole, actualRoles]);

  // Permission checks - Super Admin always has edit, otherwise check database
  const canEdit = hasRole('Super Admin') || hasDbEditPermission;
  const isElectronicsOnly = effectiveRoles.includes('Electronics') && !canEdit;
  const canMarkNeedsOrder = !isElectronicsOnly;

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [distributors, setDistributors] = useState<Distributor[]>([]);
  const [loading, setLoading] = useState(true);

  // View state
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  const [showNeedsOrderOnly, setShowNeedsOrderOnly] = useState(false);
  const [showReportedOnly, setShowReportedOnly] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(() =>
    window.innerWidth < 1024 ? 'grid' : 'list'
  );

  // Order quantities
  const [orderQuantities] = useState<Record<string, number>>(() => {
    const saved = localStorage.getItem('inventoryOrderQuantities');
    return saved ? JSON.parse(saved) : {};
  });

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

  // Notifications state
  const [notifications, setNotifications] = useState<{id: string; item_id: string; reporter_name: string; created_at: string}[]>([]);
  const [reportedItems, setReportedItems] = useState<Set<string>>(new Set());
  const [reportingItems, setReportingItems] = useState<Set<string>>(new Set());

  // Confirmation dialogs
  const [showReportConfirmation, setShowReportConfirmation] = useState(false);
  const [confirmedItemName, setConfirmedItemName] = useState('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [itemToReport, setItemToReport] = useState<InventoryItem | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [itemsRes, categoriesRes, distributorsRes] = await Promise.all([
        supabase
          .from('inventory_items')
          .select(`*, category:inventory_categories(*), distributor:inventory_distributors(*)`)
          .eq('is_active', true)
          .order('category_id')
          .order('item_number'),
        supabase.from('inventory_categories').select('*').eq('is_active', true).order('name'),
        supabase.from('inventory_distributors').select('*').eq('is_active', true).order('name')
      ]);

      if (itemsRes.data) setItems(itemsRes.data);
      if (categoriesRes.data) setCategories(categoriesRes.data);
      if (distributorsRes.data) setDistributors(distributorsRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch notifications
  useEffect(() => {
    if (canEdit) fetchNotifications();
  }, [canEdit]);

  const fetchNotifications = async () => {
    try {
      const { data } = await supabase
        .from('inventory_notifications')
        .select('id, item_id, reporter_name, created_at')
        .eq('is_read', false)
        .order('created_at', { ascending: false });
      if (data) setNotifications(data);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const openReportConfirmDialog = (item: InventoryItem) => {
    setItemToReport(item);
    setShowConfirmDialog(true);
  };

  const reportLowStock = async (item: InventoryItem) => {
    setShowConfirmDialog(false);
    setItemToReport(null);
    try {
      setReportingItems(prev => new Set([...prev, item.id]));
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setReportingItems(prev => { const n = new Set(prev); n.delete(item.id); return n; });
        return;
      }

      // Get reporter name from user metadata (no separate users table needed)
      const metadata = user.user_metadata || {};
      const reporterName = metadata.display_name ||
                          metadata.full_name ||
                          metadata.name ||
                          (user.email ? user.email.split('@')[0] : null) ||
                          'Unknown User';

      await supabase.from('inventory_notifications').insert({
        item_id: item.id,
        reported_by: user.id,
        reporter_name: reporterName,
        message: `Low stock reported for: ${item.description}`
      });

      await new Promise(resolve => setTimeout(resolve, 300));
      setReportingItems(prev => { const n = new Set(prev); n.delete(item.id); return n; });
      setReportedItems(prev => new Set([...prev, item.id]));
      setConfirmedItemName(item.description);
      setShowReportConfirmation(true);
      setTimeout(() => setShowReportConfirmation(false), 3000);
    } catch (error) {
      console.error('Error reporting:', error);
      setReportingItems(prev => { const n = new Set(prev); n.delete(item.id); return n; });
    }
  };

  const dismissNotification = async (notificationId: string) => {
    try {
      await supabase.from('inventory_notifications').update({ is_read: true }).eq('id', notificationId);
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
    } catch (error) {
      console.error('Error dismissing:', error);
    }
  };

  const getItemNotifications = (itemId: string) => notifications.filter(n => n.item_id === itemId);

  // Stats calculations
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
        totalStock: categoryItems.reduce((sum, i) => sum + i.stock_quantity, 0),
        lowStockCount: categoryItems.filter(i => i.min_stock_threshold > 0 && i.stock_quantity <= i.min_stock_threshold).length,
        needsOrderCount: categoryItems.filter(i => i.needs_order).length
      };
    });
  }, [categories, items]);

  const globalStats = useMemo((): GlobalStats => ({
    totalItems: items.length,
    totalStock: items.reduce((sum, i) => sum + i.stock_quantity, 0),
    lowStockItems: items.filter(i => i.min_stock_threshold > 0 && i.stock_quantity <= i.min_stock_threshold).length,
    needsOrderItems: items.filter(i => i.needs_order).length,
    categories: categories.length
  }), [items, categories]);

  // Global search across ALL items
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase();
    return items.filter(item =>
      item.description.toLowerCase().includes(query) ||
      item.description_en?.toLowerCase().includes(query) ||
      item.brand?.toLowerCase().includes(query) ||
      item.location?.toLowerCase().includes(query) ||
      item.category?.name.toLowerCase().includes(query) ||
      item.category?.name_en.toLowerCase().includes(query)
    ).slice(0, 15);
  }, [searchQuery, items]);

  // Get reported item IDs for filtering
  const reportedItemIds = useMemo(() => new Set(notifications.map(n => n.item_id)), [notifications]);

  const filteredItems = useMemo(() => {
    let result = items;
    if (selectedCategory && selectedCategory !== '_filter') result = result.filter(i => i.category_id === selectedCategory);
    if (showLowStockOnly) result = result.filter(i => i.min_stock_threshold > 0 && i.stock_quantity <= i.min_stock_threshold);
    if (showNeedsOrderOnly) result = result.filter(i => i.needs_order);
    if (showReportedOnly) result = result.filter(i => reportedItemIds.has(i.id));
    return result;
  }, [items, selectedCategory, showLowStockOnly, showNeedsOrderOnly, showReportedOnly, reportedItemIds]);

  const orderListCount = useMemo(() => items.filter(i => i.needs_order).length, [items]);

  const getStockStatus = (item: InventoryItem) => {
    if (item.stock_quantity === 0) return { color: '#ef4444', label: 'Out of Stock', bg: 'bg-red-500/15', border: 'border-red-500/30' };
    if (item.min_stock_threshold > 0 && item.stock_quantity <= item.min_stock_threshold) return { color: '#f59e0b', label: 'Low Stock', bg: 'bg-amber-500/15', border: 'border-amber-500/30' };
    return { color: '#22c55e', label: 'In Stock', bg: 'bg-emerald-500/15', border: 'border-emerald-500/30' };
  };

  const toggleNeedsOrder = async (item: InventoryItem) => {
    const newValue = !item.needs_order;
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, needs_order: newValue } : i));
    try {
      const { error } = await supabase.from('inventory_items').update({ needs_order: newValue }).eq('id', item.id);
      if (error) setItems(prev => prev.map(i => i.id === item.id ? { ...i, needs_order: !newValue } : i));
    } catch {
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, needs_order: !newValue } : i));
    }
  };

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
    try {
      const { error } = await supabase.from('inventory_items').update({
        stock_quantity: editStock,
        location: editLocation || null,
        distributor_id: editDistributorId || null,
        link: editLink || null,
        last_inventory_date: new Date().toISOString()
      }).eq('id', editingItem.id);

      if (!error) {
        setItems(prev => prev.map(i => i.id === editingItem.id ? {
          ...i,
          stock_quantity: editStock,
          location: editLocation || null,
          distributor_id: editDistributorId || null,
          link: editLink || null,
          distributor: distributors.find(d => d.id === editDistributorId) || undefined
        } : i));
        setEditingItem(null);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleSelectItem = (item: InventoryItem) => {
    setSearchQuery('');
    setShowSearchResults(false);
    if (item.category_id) setSelectedCategory(item.category_id);
  };

  if (loading) {
    return (
      <div className="min-h-full bg-[#0f0f12] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-[#2a2a35] border-t-[#ea2127] rounded-full animate-spin" />
          <span className="text-[#6b6b7a] text-sm font-medium">Loading inventory...</span>
        </div>
      </div>
    );
  }

  const selectedCategoryData = categoryStats.find(c => c.id === selectedCategory);

  return (
    <div className="min-h-full bg-[#0f0f12]">
      {/* Mobile Header - Simple with search */}
      <div className="sm:hidden sticky top-0 z-40 bg-[#0f0f12] border-b border-[#1f1f28] px-4 py-3">
        <div className="flex items-center gap-3">
          {(selectedCategory || showLowStockOnly || showNeedsOrderOnly || showReportedOnly) && (
            <button
              onClick={() => { setSelectedCategory(null); setShowLowStockOnly(false); setShowNeedsOrderOnly(false); setShowReportedOnly(false); }}
              className="shrink-0 w-9 h-9 flex items-center justify-center bg-[#1a1a23] text-[#8b8b9a] rounded-lg border border-[#2a2a35]"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          {/* Mobile Search */}
          <div className="relative flex-1">
            <input
              type="text"
              placeholder={
                showNeedsOrderOnly ? 'Order List' :
                showLowStockOnly ? 'Low Stock Items' :
                showReportedOnly ? 'Reported Items' :
                selectedCategory ? (selectedCategoryData?.name_en || 'Search...') :
                'Search inventory...'
              }
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setShowSearchResults(true); }}
              onFocus={() => setShowSearchResults(true)}
              className="w-full h-10 pl-10 pr-4 bg-[#1a1a23] border border-[#2a2a35] rounded-lg text-white text-sm placeholder:text-[#6b6b7a] focus:outline-none focus:border-[#ea2127]"
            />
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6b6b7a]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        {/* Mobile Search Results */}
        {showSearchResults && searchQuery && searchResults.length > 0 && (
          <div className="absolute left-4 right-4 top-full mt-1 bg-[#1a1a23] border border-[#2a2a35] rounded-xl shadow-2xl overflow-hidden max-h-80 overflow-y-auto z-50">
            {searchResults.map((item) => {
              const status = getStockStatus(item);
              return (
                <button
                  key={item.id}
                  onClick={() => handleSelectItem(item)}
                  className="w-full px-4 py-3 flex items-center gap-3 hover:bg-[#252530] text-left border-b border-[#2a2a35]/50 last:border-0"
                >
                  <CategoryIcon category={item.category} className="w-6 h-6 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{item.description}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-mono text-sm text-white">{item.stock_quantity}</span>
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: status.color }} />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Desktop Header Section */}
      <div className="hidden sm:block sticky top-0 z-40 bg-[#0f0f12]/95 backdrop-blur-md border-b border-[#1f1f28]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Title & Search Row */}
          <div className="py-5 flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              {(selectedCategory || showLowStockOnly || showNeedsOrderOnly || showReportedOnly) && (
                <button
                  onClick={() => { setSelectedCategory(null); setShowLowStockOnly(false); setShowNeedsOrderOnly(false); setShowReportedOnly(false); }}
                  className="shrink-0 w-9 h-9 flex items-center justify-center bg-[#1a1a23] hover:bg-[#252530] text-[#8b8b9a] hover:text-white rounded-lg transition-all border border-[#2a2a35]"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
              )}
              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight truncate font-display">
                  {showNeedsOrderOnly ? 'Order List' :
                   showLowStockOnly ? 'Low Stock Items' :
                   showReportedOnly ? 'Reported Items' :
                   selectedCategory ? (selectedCategoryData?.name_en || selectedCategoryData?.name) :
                   'Inventory'}
                </h1>
              </div>
            </div>

            {/* Global Search */}
            <div className="relative w-full sm:w-80">
              <input
                type="text"
                placeholder="Search items..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setShowSearchResults(true); }}
                onFocus={() => setShowSearchResults(true)}
                className="w-full h-11 pl-11 pr-10 bg-[#1a1a23] border border-[#2a2a35] hover:border-[#3a3a48] focus:border-[#ea2127] rounded-xl text-white text-sm placeholder:text-[#6b6b7a] focus:outline-none focus:ring-2 focus:ring-[#ea2127]/20 transition-all font-mono"
              />
              <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-[#6b6b7a]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              {searchQuery && (
                <button
                  onClick={() => { setSearchQuery(''); setShowSearchResults(false); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[#6b6b7a] hover:text-white transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}

              {/* Search Results Dropdown */}
              {showSearchResults && searchQuery && searchResults.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-2 bg-[#1a1a23] border border-[#2a2a35] rounded-xl shadow-2xl shadow-black/50 overflow-hidden max-h-[400px] overflow-y-auto z-50">
                  <div className="px-4 py-2 border-b border-[#2a2a35]">
                    <span className="text-xs text-[#6b6b7a] font-medium">{searchResults.length} results</span>
                  </div>
                  {searchResults.map((item) => {
                    const status = getStockStatus(item);
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleSelectItem(item)}
                        className="w-full px-4 py-3 flex items-center gap-4 hover:bg-[#252530] transition-colors text-left border-b border-[#2a2a35]/50 last:border-0"
                      >
                        <div className="w-8 h-8 rounded-lg bg-[#252530] flex items-center justify-center shrink-0 p-1">
                          <CategoryIcon category={item.category} className="w-6 h-6" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm font-medium truncate">{item.description}</p>
                          <p className="text-[#6b6b7a] text-xs mt-0.5 truncate">
                            {item.category?.name_en || item.category?.name} · {item.location || 'No location'}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-mono text-sm text-white font-semibold">{item.stock_quantity}</span>
                          <div className={`w-2 h-2 rounded-full`} style={{ backgroundColor: status.color }} />
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Stats Bar - Hidden on mobile */}
          <div className="hidden sm:flex pb-4 flex-wrap items-center gap-2">
            <button
              onClick={() => { setShowLowStockOnly(!showLowStockOnly); setShowNeedsOrderOnly(false); setShowReportedOnly(false); if (!selectedCategory && !showLowStockOnly) setSelectedCategory('_filter'); }}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all border ${
                showLowStockOnly
                  ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                  : 'bg-[#1a1a23] text-[#8b8b9a] border-[#2a2a35] hover:border-[#3a3a48] hover:text-white'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>{globalStats.lowStockItems} Low Stock</span>
            </button>

            <button
              onClick={() => { setShowNeedsOrderOnly(!showNeedsOrderOnly); setShowLowStockOnly(false); setShowReportedOnly(false); if (!selectedCategory && !showNeedsOrderOnly) setSelectedCategory('_filter'); }}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all border ${
                showNeedsOrderOnly
                  ? 'bg-red-500/15 text-red-400 border-red-500/30'
                  : 'bg-[#1a1a23] text-[#8b8b9a] border-[#2a2a35] hover:border-[#3a3a48] hover:text-white'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span>{globalStats.needsOrderItems} Need Order</span>
            </button>

            {/* Reported Items Filter - Only for Head of Electronics */}
            {canEdit && notifications.length > 0 && (
              <button
                onClick={() => { setShowReportedOnly(!showReportedOnly); setShowLowStockOnly(false); setShowNeedsOrderOnly(false); if (!selectedCategory && !showReportedOnly) setSelectedCategory('_filter'); }}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all border ${
                  showReportedOnly
                    ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                    : 'bg-[#1a1a23] text-[#8b8b9a] border-[#2a2a35] hover:border-[#3a3a48] hover:text-white'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                <span>{notifications.length} Reported</span>
              </button>
            )}

            {canEdit && orderListCount > 0 && (
              <button
                onClick={() => navigate('/order-list')}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all border bg-[#ea2127]/10 text-[#ea2127] border-[#ea2127]/30 hover:bg-[#ea2127]/20"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <span>View Order List ({orderListCount})</span>
              </button>
            )}

            <div className="ml-auto text-sm text-[#6b6b7a]">
              <span className="font-mono font-semibold text-white">{globalStats.totalItems}</span> items total
            </div>
          </div>
        </div>
      </div>

      {/* Click outside to close search */}
      {showSearchResults && searchQuery && (
        <div className="fixed inset-0 z-30" onClick={() => setShowSearchResults(false)} />
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Category View or Items View */}
        {(!selectedCategory || selectedCategory === '_filter') && !showLowStockOnly && !showNeedsOrderOnly && !showReportedOnly ? (
          /* Category Cards */
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {categoryStats.map((cat, idx) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className="group relative text-center p-6 bg-gradient-to-br from-[#1a1a23] to-[#15151c] border border-[#2a2a35] rounded-2xl hover:border-[#3a3a48] hover:shadow-lg hover:shadow-black/20 transition-all duration-200"
                style={{ animationDelay: `${idx * 40}ms` }}
              >
                {/* Low Stock Badge - Top Right Corner */}
                {cat.lowStockCount > 0 && (
                  <div className="absolute -top-2 -right-2 flex items-center gap-1 px-2 py-1 rounded-full bg-amber-500 shadow-lg shadow-amber-500/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                    <span className="text-xs font-bold text-black">{cat.lowStockCount}</span>
                  </div>
                )}

                {/* Category Icon - Centered */}
                <div className="flex justify-center mb-4">
                  <CategoryIcon
                    category={{ id: cat.id, name: cat.name, name_en: cat.name_en, color: cat.color, icon: cat.icon }}
                    className="w-16 h-16 sm:w-20 sm:h-20"
                  />
                </div>

                {/* Category Name - Centered */}
                <h3 className="text-white font-semibold text-base mb-1 group-hover:text-[#ea2127] transition-colors">
                  {cat.name_en || cat.name}
                </h3>
                <p className="text-[#6b6b7a] text-sm">
                  {cat.itemCount} items
                </p>

                {/* Hover Arrow */}
                <div className="absolute bottom-5 right-5 opacity-0 group-hover:opacity-100 transform translate-x-2 group-hover:translate-x-0 transition-all">
                  <svg className="w-5 h-5 text-[#ea2127]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>
            ))}
          </div>
        ) : (
          /* Items List */
          <>
            {/* View Controls */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-1 bg-[#1a1a23] p-1 rounded-lg border border-[#2a2a35]">
                <button
                  onClick={() => setViewMode('list')}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    viewMode === 'list' ? 'bg-[#252530] text-white' : 'text-[#6b6b7a] hover:text-white'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                  <span className="hidden sm:inline">List</span>
                </button>
                <button
                  onClick={() => setViewMode('grid')}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    viewMode === 'grid' ? 'bg-[#252530] text-white' : 'text-[#6b6b7a] hover:text-white'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                  <span className="hidden sm:inline">Grid</span>
                </button>
              </div>
              <span className="text-sm text-[#6b6b7a]">
                <span className="font-mono font-semibold text-white">{filteredItems.length}</span> items
              </span>
            </div>

            {viewMode === 'list' ? (
              /* List View */
              <div className="bg-[#1a1a23] border border-[#2a2a35] rounded-2xl overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#2a2a35] bg-[#15151c]">
                      <th className="px-5 py-4 text-xs font-semibold text-[#6b6b7a] uppercase tracking-wider text-left">Item</th>
                      <th className="px-5 py-4 text-xs font-semibold text-[#6b6b7a] uppercase tracking-wider text-left hidden lg:table-cell">Location</th>
                      <th className="px-5 py-4 text-xs font-semibold text-[#6b6b7a] uppercase tracking-wider text-right">Stock</th>
                      <th className="px-5 py-4 text-xs font-semibold text-[#6b6b7a] uppercase tracking-wider text-center hidden sm:table-cell">Status</th>
                      <th className="px-5 py-4 text-xs font-semibold text-[#6b6b7a] uppercase tracking-wider text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#2a2a35]/50">
                    {filteredItems.map((item) => {
                      const status = getStockStatus(item);
                      const itemNotifications = getItemNotifications(item.id);
                      const hasNotifications = canEdit && itemNotifications.length > 0;
                      return (
                        <tr
                          key={item.id}
                          className={`group transition-colors ${hasNotifications ? 'bg-amber-500/5' : 'hover:bg-[#252530]/50'}`}
                        >
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-4">
                              {hasNotifications && (
                                <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
                              )}
                              <div className="min-w-0">
                                <p className="text-white font-medium truncate">{item.description}</p>
                                <div className="flex items-center gap-2 mt-1">
                                  {item.brand && <span className="text-[#6b6b7a] text-xs">{item.brand}</span>}
                                  {hasNotifications && (
                                    <span className="text-amber-400 text-xs font-medium">
                                      · Reported by {itemNotifications[0].reporter_name}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4 hidden lg:table-cell">
                            <span className="text-[#8b8b9a] text-sm">{item.location || '—'}</span>
                          </td>
                          <td className="px-5 py-4 text-right">
                            <span className="font-mono text-lg font-semibold text-white">{item.stock_quantity}</span>
                            <span className="text-[#6b6b7a] text-xs ml-1">{item.stock_unit}</span>
                          </td>
                          <td className="px-5 py-4 hidden sm:table-cell">
                            <div className="flex justify-center">
                              <span
                                className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${status.bg} ${status.border} border`}
                                style={{ color: status.color }}
                              >
                                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: status.color }} />
                                {status.label}
                              </span>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex items-center justify-end gap-1">
                              {isElectronicsOnly ? (
                                <button
                                  onClick={() => openReportConfirmDialog(item)}
                                  disabled={reportedItems.has(item.id) || reportingItems.has(item.id)}
                                  className={`p-2 rounded-lg transition-all ${
                                    reportedItems.has(item.id)
                                      ? 'text-emerald-400 bg-emerald-500/10'
                                      : reportingItems.has(item.id)
                                      ? 'text-amber-400 bg-amber-500/10 animate-pulse'
                                      : 'text-[#6b6b7a] hover:text-amber-400 hover:bg-amber-500/10'
                                  }`}
                                  title="Report low stock"
                                >
                                  {reportedItems.has(item.id) ? (
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                  ) : (
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                                    </svg>
                                  )}
                                </button>
                              ) : (
                                <>
                                  {hasNotifications && (
                                    <button
                                      onClick={() => dismissNotification(itemNotifications[0].id)}
                                      className="p-2 text-[#6b6b7a] hover:text-white hover:bg-[#252530] rounded-lg transition-all"
                                      title="Dismiss report"
                                    >
                                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                      </svg>
                                    </button>
                                  )}
                                  {canMarkNeedsOrder && (
                                    <button
                                      onClick={() => toggleNeedsOrder(item)}
                                      className={`p-2 rounded-lg transition-all ${
                                        item.needs_order
                                          ? 'text-[#ea2127] bg-[#ea2127]/10'
                                          : 'text-[#6b6b7a] hover:text-white hover:bg-[#252530]'
                                      }`}
                                      title={item.needs_order ? 'Remove from order list' : 'Add to order list'}
                                    >
                                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                                      </svg>
                                    </button>
                                  )}
                                  {canEdit && (
                                    <button
                                      onClick={() => openEditModal(item)}
                                      className="p-2 text-[#6b6b7a] hover:text-white hover:bg-[#252530] rounded-lg transition-all"
                                      title="Edit item"
                                    >
                                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                      </svg>
                                    </button>
                                  )}
                                  {!isElectronicsOnly && item.link && (
                                    <a
                                      href={item.link}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="p-2 text-[#6b6b7a] hover:text-[#3b82f6] hover:bg-[#3b82f6]/10 rounded-lg transition-all"
                                      title="Open product link"
                                    >
                                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                      </svg>
                                    </a>
                                  )}
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              /* Grid View */
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredItems.map((item) => {
                  const status = getStockStatus(item);
                  const itemNotifications = getItemNotifications(item.id);
                  const hasNotifications = canEdit && itemNotifications.length > 0;
                  return (
                    <div
                      key={item.id}
                      className={`group p-5 rounded-2xl border transition-all ${
                        hasNotifications
                          ? 'bg-amber-500/5 border-amber-500/30 hover:border-amber-500/50'
                          : 'bg-[#1a1a23] border-[#2a2a35] hover:border-[#3a3a48]'
                      }`}
                    >
                      {/* Report Banner */}
                      {hasNotifications && (
                        <div className="flex items-center justify-between mb-4 pb-3 border-b border-amber-500/20">
                          <span className="text-amber-400 text-xs font-semibold flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                            Reported by {itemNotifications[0].reporter_name}
                          </span>
                          <button
                            onClick={() => dismissNotification(itemNotifications[0].id)}
                            className="text-amber-500/50 hover:text-amber-400 transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      )}

                      {/* Item Info */}
                      <div className="flex items-start justify-between gap-3 mb-4">
                        <div className="min-w-0 flex-1">
                          <h3 className="text-white font-semibold leading-snug line-clamp-2">{item.description}</h3>
                          {item.brand && <p className="text-[#6b6b7a] text-xs mt-1">{item.brand}</p>}
                        </div>
                        <span
                          className={`shrink-0 inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${status.bg} ${status.border} border`}
                          style={{ color: status.color }}
                        >
                          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: status.color }} />
                          {status.label.split(' ')[0]}
                        </span>
                      </div>

                      {/* Location */}
                      {item.location && (
                        <p className="text-[#6b6b7a] text-sm mb-4 flex items-center gap-2">
                          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          <span className="truncate">{item.location}</span>
                        </p>
                      )}

                      {/* Stock & Actions */}
                      <div className="flex items-center justify-between pt-4 border-t border-[#2a2a35]/50">
                        <div>
                          <span className="font-mono text-2xl font-bold text-white">{item.stock_quantity}</span>
                          <span className="text-[#6b6b7a] text-sm ml-1">{item.stock_unit}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          {isElectronicsOnly ? (
                            <button
                              onClick={() => openReportConfirmDialog(item)}
                              disabled={reportedItems.has(item.id) || reportingItems.has(item.id)}
                              className={`p-2 rounded-lg transition-all ${
                                reportedItems.has(item.id)
                                  ? 'text-emerald-400 bg-emerald-500/10'
                                  : reportingItems.has(item.id)
                                  ? 'text-amber-400 bg-amber-500/10 animate-pulse'
                                  : 'text-[#6b6b7a] hover:text-amber-400 hover:bg-amber-500/10'
                              }`}
                            >
                              {reportedItems.has(item.id) ? (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              ) : (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                                </svg>
                              )}
                            </button>
                          ) : (
                            <>
                              {canMarkNeedsOrder && (
                                <button
                                  onClick={() => toggleNeedsOrder(item)}
                                  className={`p-2 rounded-lg transition-all ${
                                    item.needs_order
                                      ? 'text-[#ea2127] bg-[#ea2127]/10'
                                      : 'text-[#6b6b7a] hover:text-white hover:bg-[#252530]'
                                  }`}
                                >
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                                  </svg>
                                </button>
                              )}
                              {canEdit && (
                                <button
                                  onClick={() => openEditModal(item)}
                                  className="p-2 text-[#6b6b7a] hover:text-white hover:bg-[#252530] rounded-lg transition-all"
                                >
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {filteredItems.length === 0 && (
              <div className="text-center py-20">
                <div className="w-16 h-16 rounded-2xl bg-[#1a1a23] flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-[#3a3a48]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                </div>
                <p className="text-[#6b6b7a] font-medium">No items found</p>
                <p className="text-[#4a4a58] text-sm mt-1">Try adjusting your filters</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Edit Modal */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#1a1a23] border border-[#2a2a35] rounded-2xl w-full max-w-md shadow-2xl shadow-black/50">
            <div className="px-6 py-5 border-b border-[#2a2a35]">
              <h2 className="text-lg font-bold text-white">Edit Item</h2>
              <p className="text-[#6b6b7a] text-sm mt-1 truncate">{editingItem.description}</p>
            </div>
            <div className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-[#8b8b9a] mb-2">Stock Quantity</label>
                <input
                  type="number"
                  value={editStock}
                  onChange={(e) => setEditStock(parseInt(e.target.value) || 0)}
                  className="w-full px-4 py-3 bg-[#15151c] border border-[#2a2a35] rounded-xl text-white focus:outline-none focus:border-[#ea2127] focus:ring-2 focus:ring-[#ea2127]/20 font-mono text-lg transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#8b8b9a] mb-2">Location</label>
                <input
                  type="text"
                  value={editLocation}
                  onChange={(e) => setEditLocation(e.target.value)}
                  className="w-full px-4 py-3 bg-[#15151c] border border-[#2a2a35] rounded-xl text-white focus:outline-none focus:border-[#ea2127] focus:ring-2 focus:ring-[#ea2127]/20 transition-all"
                  placeholder="e.g., Shelf A-1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#8b8b9a] mb-2">Distributor</label>
                <select
                  value={editDistributorId}
                  onChange={(e) => setEditDistributorId(e.target.value)}
                  className="w-full px-4 py-3 bg-[#15151c] border border-[#2a2a35] rounded-xl text-white focus:outline-none focus:border-[#ea2127] focus:ring-2 focus:ring-[#ea2127]/20 transition-all"
                >
                  <option value="">No distributor</option>
                  {distributors.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#8b8b9a] mb-2">Product Link</label>
                <input
                  type="url"
                  value={editLink}
                  onChange={(e) => setEditLink(e.target.value)}
                  className="w-full px-4 py-3 bg-[#15151c] border border-[#2a2a35] rounded-xl text-white focus:outline-none focus:border-[#ea2127] focus:ring-2 focus:ring-[#ea2127]/20 transition-all"
                  placeholder="https://..."
                />
              </div>
            </div>
            <div className="px-6 py-5 border-t border-[#2a2a35] flex gap-3">
              <button
                onClick={() => setEditingItem(null)}
                className="flex-1 px-4 py-3 bg-[#252530] hover:bg-[#2a2a38] text-white rounded-xl transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={updateItem}
                disabled={saving}
                className="flex-1 px-4 py-3 bg-[#ea2127] hover:bg-[#d91e24] text-white rounded-xl transition-colors disabled:opacity-50 font-semibold"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Report Dialog */}
      {showConfirmDialog && itemToReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#1a1a23] border border-[#2a2a35] rounded-2xl w-full max-w-sm text-center shadow-2xl shadow-black/50">
            <div className="p-8">
              <div className="w-16 h-16 rounded-2xl bg-amber-500/15 flex items-center justify-center mx-auto mb-5">
                <svg className="w-8 h-8 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Report Low Stock?</h3>
              <p className="text-white font-medium mb-2">{itemToReport.description}</p>
              <p className="text-[#6b6b7a] text-sm">Head of Electronics will be notified about this item.</p>
            </div>
            <div className="px-6 pb-6 flex gap-3">
              <button
                onClick={() => { setShowConfirmDialog(false); setItemToReport(null); }}
                className="flex-1 px-4 py-3 bg-[#252530] hover:bg-[#2a2a38] text-white rounded-xl transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => reportLowStock(itemToReport)}
                className="flex-1 px-4 py-3 bg-amber-500 hover:bg-amber-400 text-black rounded-xl transition-colors font-bold"
              >
                Report
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Toast */}
      {showReportConfirmation && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-[fadeSlideIn_0.3s_ease-out]">
          <div className="flex items-center gap-3 px-5 py-4 bg-emerald-500/15 border border-emerald-500/30 rounded-xl backdrop-blur-sm shadow-lg shadow-black/30">
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <p className="text-emerald-400 font-semibold">Report Sent</p>
              <p className="text-emerald-400/70 text-sm">{confirmedItemName}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
