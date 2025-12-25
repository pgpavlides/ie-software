import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import supabase from '../lib/supabase';

interface Category {
  id: string;
  name: string;
  name_en: string;
  color: string;
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
  location: string | null;
  stock_quantity: number;
  stock_unit: string;
  min_stock_threshold: number;
  needs_order: boolean;
  brand: string | null;
  notes: string | null;
  category_id: string | null;
  distributor_id: string | null;
  category?: Category;
  distributor?: Distributor;
}

export default function OrderListPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDistributor, setSelectedDistributor] = useState<string>('');

  // Order quantities - synced with localStorage (shared with InventoryPage)
  const [orderQuantities, setOrderQuantities] = useState<Record<string, number>>(() => {
    const saved = localStorage.getItem('inventoryOrderQuantities');
    return saved ? JSON.parse(saved) : {};
  });

  // Persist order quantities to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('inventoryOrderQuantities', JSON.stringify(orderQuantities));
  }, [orderQuantities]);

  useEffect(() => {
    fetchOrderItems();
  }, []);

  const fetchOrderItems = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('inventory_items')
        .select(`
          *,
          category:inventory_categories(*),
          distributor:inventory_distributors(*)
        `)
        .eq('is_active', true)
        .eq('needs_order', true)
        .order('category_id')
        .order('item_number');

      if (error) throw error;

      if (data) {
        setItems(data);
        // Only set default quantities for items that don't have one yet
        // (orderQuantities is already loaded from localStorage)
        setOrderQuantities(prev => {
          const updated = { ...prev };
          data.forEach(item => {
            if (!updated[item.id]) {
              updated[item.id] = 1;
            }
          });
          return updated;
        });
      }
    } catch (error) {
      console.error('Error fetching order items:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateOrderQuantity = (itemId: string, quantity: number) => {
    setOrderQuantities(prev => ({
      ...prev,
      [itemId]: Math.max(1, quantity)
    }));
  };

  const removeFromOrderList = async (item: InventoryItem) => {
    // Optimistic update
    setItems(prev => prev.filter(i => i.id !== item.id));
    setOrderQuantities(prev => {
      const updated = { ...prev };
      delete updated[item.id];
      return updated;
    });

    try {
      const { error } = await supabase
        .from('inventory_items')
        .update({ needs_order: false })
        .eq('id', item.id);

      if (error) {
        // Revert on error
        setItems(prev => [...prev, item]);
        setOrderQuantities(prev => ({ ...prev, [item.id]: 1 }));
        console.error('Error removing item from order list:', error);
      }
    } catch (error) {
      // Revert on error
      setItems(prev => [...prev, item]);
      setOrderQuantities(prev => ({ ...prev, [item.id]: 1 }));
      console.error('Error removing item from order list:', error);
    }
  };

  // Get unique distributors for filter
  const distributors = useMemo(() => {
    const unique = new Map<string, Distributor>();
    items.forEach(item => {
      if (item.distributor) {
        unique.set(item.distributor.id, item.distributor);
      }
    });
    return Array.from(unique.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [items]);

  // Filter items
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesSearch = searchQuery === '' ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.brand?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesDistributor = !selectedDistributor || item.distributor_id === selectedDistributor;

      return matchesSearch && matchesDistributor;
    });
  }, [items, searchQuery, selectedDistributor]);

  // Group items by distributor
  const groupedByDistributor = useMemo(() => {
    const groups: Record<string, { distributor: Distributor | null; items: InventoryItem[] }> = {};

    filteredItems.forEach(item => {
      const key = item.distributor_id || 'no-distributor';
      if (!groups[key]) {
        groups[key] = {
          distributor: item.distributor || null,
          items: []
        };
      }
      groups[key].items.push(item);
    });

    return Object.values(groups).sort((a, b) => {
      if (!a.distributor) return 1;
      if (!b.distributor) return -1;
      return a.distributor.name.localeCompare(b.distributor.name);
    });
  }, [filteredItems]);

  // Calculate totals
  const totalItemCount = items.length;
  const totalQuantity = Object.entries(orderQuantities)
    .filter(([id]) => items.some(item => item.id === id))
    .reduce((sum, [, qty]) => sum + qty, 0);

  if (loading) {
    return (
      <div className="min-h-full bg-[#0f0f12] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-[#ef4444] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[#6b6b7a]">Loading order list...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-[#0f0f12] relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-grid-pattern opacity-50" />
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#ef4444] rounded-full blur-[200px] opacity-[0.03]" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-[#f59e0b] rounded-full blur-[200px] opacity-[0.02]" />

      <div className="relative z-10 p-6 lg:p-10 max-w-[1600px] mx-auto">
        {/* Header */}
        <header className="mb-8 opacity-0 animate-[fadeSlideIn_0.5s_ease-out_forwards]">
          <div className="flex items-center gap-3 mb-2">
            {/* Back Button */}
            <button
              onClick={() => navigate('/inventory')}
              className="shrink-0 w-10 h-10 flex items-center justify-center bg-[#1a1a23] hover:bg-[#252530] text-[#8b8b9a] hover:text-white rounded-xl transition-all border border-[#2a2a35]"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#ef4444] to-[#dc2626] flex items-center justify-center shadow-lg shadow-[#ef4444]/20">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-white">Order List</h1>
              <p className="text-[#6b6b7a]">
                {totalItemCount} items to order ({totalQuantity} total units)
              </p>
            </div>
          </div>
        </header>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8 opacity-0 animate-[fadeSlideIn_0.5s_ease-out_forwards]" style={{ animationDelay: '100ms' }}>
          <div className="bg-[#141418] border border-[#1f1f28] rounded-xl p-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#ef4444] to-[#dc2626] flex items-center justify-center shadow-lg shadow-[#ef4444]/20">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <div>
                <p className="text-3xl font-bold text-white">{totalItemCount}</p>
                <p className="text-sm text-[#6b6b7a]">Items to Order</p>
              </div>
            </div>
          </div>

          <div className="bg-[#141418] border border-[#1f1f28] rounded-xl p-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#f59e0b] to-[#d97706] flex items-center justify-center shadow-lg shadow-[#f59e0b]/20">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
              </div>
              <div>
                <p className="text-3xl font-bold text-white">{totalQuantity}</p>
                <p className="text-sm text-[#6b6b7a]">Total Units</p>
              </div>
            </div>
          </div>

          <div className="bg-[#141418] border border-[#1f1f28] rounded-xl p-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#8b5cf6] to-[#7c3aed] flex items-center justify-center shadow-lg shadow-[#8b5cf6]/20">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              </div>
              <div>
                <p className="text-3xl font-bold text-white">{distributors.length}</p>
                <p className="text-sm text-[#6b6b7a]">Distributors</p>
              </div>
            </div>
          </div>

          <div className="bg-[#141418] border border-[#1f1f28] rounded-xl p-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#10b981] to-[#059669] flex items-center justify-center shadow-lg shadow-[#10b981]/20">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-3xl font-bold text-white">{groupedByDistributor.length}</p>
                <p className="text-sm text-[#6b6b7a]">Order Groups</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col lg:flex-row gap-4 mb-6 opacity-0 animate-[fadeSlideIn_0.5s_ease-out_forwards]" style={{ animationDelay: '200ms' }}>
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              placeholder="Search items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-3 pl-12 bg-[#141418] border border-[#2a2a35] rounded-xl text-white placeholder-[#5a5a68] focus:outline-none focus:border-[#ef4444]/50 focus:ring-2 focus:ring-[#ef4444]/20 transition-all"
            />
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#5a5a68]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          {/* Distributor Filter */}
          <select
            value={selectedDistributor}
            onChange={(e) => setSelectedDistributor(e.target.value)}
            className="px-4 py-3 bg-[#141418] border border-[#2a2a35] rounded-xl text-white focus:outline-none focus:border-[#ef4444]/50 appearance-none cursor-pointer min-w-[200px]"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b6b7a' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
              backgroundPosition: 'right 0.75rem center',
              backgroundRepeat: 'no-repeat',
              backgroundSize: '1.5em 1.5em',
              paddingRight: '2.5rem',
            }}
          >
            <option value="">All Distributors</option>
            {distributors.map((dist) => (
              <option key={dist.id} value={dist.id}>
                {dist.name}
              </option>
            ))}
          </select>

          {/* Refresh Button */}
          <button
            onClick={fetchOrderItems}
            className="px-4 py-3 bg-[#1f1f28] hover:bg-[#2a2a38] text-white rounded-xl transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>

        {/* Order List Content */}
        {items.length > 0 ? (
          <div className="space-y-6 opacity-0 animate-[fadeSlideIn_0.5s_ease-out_forwards]" style={{ animationDelay: '300ms' }}>
            {groupedByDistributor.map((group, groupIndex) => (
              <div
                key={group.distributor?.id || 'no-distributor'}
                className="bg-[#141418] border border-[#1f1f28] rounded-2xl overflow-hidden opacity-0 animate-[fadeSlideIn_0.4s_ease-out_forwards]"
                style={{ animationDelay: `${400 + groupIndex * 100}ms` }}
              >
                {/* Group Header */}
                <div className="px-6 py-4 bg-[#1a1a1f] border-b border-[#1f1f28] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[#2a2a38] flex items-center justify-center">
                      <svg className="w-5 h-5 text-[#8b5cf6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">
                        {group.distributor?.name || 'No Distributor'}
                      </h3>
                      <p className="text-sm text-[#6b6b7a]">
                        {group.items.length} items
                      </p>
                    </div>
                  </div>
                  {group.distributor?.website && (
                    <a
                      href={group.distributor.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-[#2a2a38] hover:bg-[#3a3a48] text-[#06b6d4] rounded-lg transition-colors flex items-center gap-2 text-sm"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                      Visit Website
                    </a>
                  )}
                </div>

                {/* Items Table */}
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[#1f1f28]">
                        <th className="px-6 py-3 text-left text-xs font-semibold text-[#6b6b7a] uppercase tracking-wider">Item</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-[#6b6b7a] uppercase tracking-wider">Category</th>
                        <th className="px-6 py-3 text-center text-xs font-semibold text-[#6b6b7a] uppercase tracking-wider">Current Stock</th>
                        <th className="px-6 py-3 text-center text-xs font-semibold text-[#6b6b7a] uppercase tracking-wider">Qty to Order</th>
                        <th className="px-6 py-3 text-center text-xs font-semibold text-[#6b6b7a] uppercase tracking-wider">Link</th>
                        <th className="px-6 py-3 text-center text-xs font-semibold text-[#6b6b7a] uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1f1f28]">
                      {group.items.map((item) => (
                        <tr key={item.id} className="hover:bg-[#1a1a1f] transition-colors">
                          <td className="px-6 py-4">
                            <div className="max-w-sm">
                              <div className="font-medium text-white">{item.description}</div>
                              {item.brand && (
                                <div className="text-xs text-[#6b6b7a] mt-0.5">{item.brand}</div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            {item.category ? (
                              <span
                                className="inline-flex px-2.5 py-1 rounded-lg text-xs font-medium"
                                style={{
                                  backgroundColor: `${item.category.color}20`,
                                  color: item.category.color,
                                }}
                              >
                                {item.category.name_en || item.category.name}
                              </span>
                            ) : (
                              <span className="text-[#4a4a58] text-sm">-</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className="font-mono text-lg font-semibold text-white">
                              {item.stock_quantity}
                            </span>
                            <span className="text-[#6b6b7a] text-xs ml-1">{item.stock_unit}</span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <input
                              type="number"
                              min="1"
                              value={orderQuantities[item.id] || 1}
                              onChange={(e) => updateOrderQuantity(item.id, parseInt(e.target.value) || 1)}
                              className="w-20 px-3 py-2 bg-[#1f1f28] border border-[#ef4444]/30 rounded-lg text-white text-center font-mono focus:outline-none focus:border-[#ef4444] transition-colors"
                            />
                          </td>
                          <td className="px-6 py-4 text-center">
                            {item.link ? (
                              <a
                                href={item.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#06b6d4]/10 hover:bg-[#06b6d4]/20 text-[#06b6d4] rounded-lg transition-colors text-sm"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                                View
                              </a>
                            ) : (
                              <span className="text-[#4a4a58] text-sm">-</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <button
                              onClick={() => removeFromOrderList(item)}
                              className="p-2 text-[#6b6b7a] hover:text-[#ef4444] hover:bg-[#ef4444]/10 rounded-lg transition-colors"
                              title="Remove from order list"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Group Footer */}
                <div className="px-6 py-3 bg-[#1a1a1f] border-t border-[#1f1f28] flex items-center justify-between">
                  <span className="text-sm text-[#6b6b7a]">
                    Subtotal: {group.items.length} items
                  </span>
                  <span className="text-sm font-medium text-white">
                    {group.items.reduce((sum, item) => sum + (orderQuantities[item.id] || 1), 0)} units to order
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-[#141418] border border-[#1f1f28] rounded-2xl opacity-0 animate-[fadeSlideIn_0.5s_ease-out_forwards]" style={{ animationDelay: '300ms' }}>
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-[#1a1a1f] flex items-center justify-center">
              <svg className="w-10 h-10 text-[#3a3a48]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">No items in order list</h3>
            <p className="text-[#6b6b7a] max-w-md mx-auto">
              Go to Inventory and click the cart icon on items you need to order.
              They will appear here automatically.
            </p>
          </div>
        )}

        {/* Summary Footer */}
        {items.length > 0 && (
          <div className="mt-8 bg-[#141418] border border-[#1f1f28] rounded-2xl p-6 opacity-0 animate-[fadeSlideIn_0.5s_ease-out_forwards]" style={{ animationDelay: '500ms' }}>
            <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <p className="text-2xl font-bold text-white">{totalItemCount}</p>
                  <p className="text-xs text-[#6b6b7a]">Items</p>
                </div>
                <div className="w-px h-10 bg-[#2a2a35]" />
                <div className="text-center">
                  <p className="text-2xl font-bold text-[#ef4444]">{totalQuantity}</p>
                  <p className="text-xs text-[#6b6b7a]">Total Units</p>
                </div>
                <div className="w-px h-10 bg-[#2a2a35]" />
                <div className="text-center">
                  <p className="text-2xl font-bold text-[#8b5cf6]">{distributors.length}</p>
                  <p className="text-xs text-[#6b6b7a]">Distributors</p>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    const text = groupedByDistributor.map(group => {
                      const header = `\n=== ${group.distributor?.name || 'No Distributor'} ===\n`;
                      const items = group.items.map(item =>
                        `- ${item.description}: ${orderQuantities[item.id] || 1} ${item.stock_unit}${item.link ? ` (${item.link})` : ''}`
                      ).join('\n');
                      return header + items;
                    }).join('\n');
                    navigator.clipboard.writeText(text);
                  }}
                  className="px-6 py-3 bg-[#2a2a38] hover:bg-[#3a3a48] text-white rounded-xl transition-colors flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Copy List
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
