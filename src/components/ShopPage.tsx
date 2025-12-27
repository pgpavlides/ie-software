import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiShoppingCart,
  FiSearch,
  FiPackage,
  FiPlus,
  FiMinus,
  FiX,
  FiTrash2,
  FiClock,
  FiCheck,
  FiChevronRight,
  FiShoppingBag,
  FiArrowLeft,
  FiHash,
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
  shop_categories?: ShopCategory;
}

interface CartItem {
  item: ShopItem;
  quantity: number;
}

interface ShopOrder {
  id: string;
  order_number: string;
  user_id: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  notes: string | null;
  admin_notes: string | null;
  processed_by: string | null;
  processed_at: string | null;
  created_at: string;
  shop_order_items?: ShopOrderItem[];
}

interface ShopOrderItem {
  id: string;
  order_id: string;
  item_id: string | null;
  quantity: number;
  item_name: string;
  item_price: number;
}

// Status config
const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string; icon: React.ReactNode }> = {
  pending: { label: 'Pending', color: '#3b82f6', bgColor: 'rgba(59, 130, 246, 0.15)', icon: <FiClock className="w-3.5 h-3.5" /> },
  approved: { label: 'Approved', color: '#f59e0b', bgColor: 'rgba(245, 158, 11, 0.15)', icon: <FiCheck className="w-3.5 h-3.5" /> },
  rejected: { label: 'Rejected', color: '#ef4444', bgColor: 'rgba(239, 68, 68, 0.15)', icon: <FiX className="w-3.5 h-3.5" /> },
  completed: { label: 'Completed', color: '#22c55e', bgColor: 'rgba(34, 197, 94, 0.15)', icon: <FiCheck className="w-3.5 h-3.5" /> },
};

// Category icons mapping
const CATEGORY_ICONS: Record<string, string> = {
  cpu: '🔲',
  box: '📦',
  tool: '🔧',
  link: '🔗',
  activity: '📡',
  package: '📦',
};

const ShopPage: React.FC = () => {
  const { user, hasRole } = useAuthStore();

  // Check if user can order (not Prospect)
  const canOrder = !hasRole('Prospect');

  // View state
  const [viewMode, setViewMode] = useState<'shop' | 'orders'>('shop');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ShopItem | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<ShopOrder | null>(null);
  const [addQuantity, setAddQuantity] = useState(1);
  const [cardQuantities, setCardQuantities] = useState<Record<string, number>>({});

  // Data state
  const [categories, setCategories] = useState<ShopCategory[]>([]);
  const [items, setItems] = useState<ShopItem[]>([]);
  const [orders, setOrders] = useState<ShopOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Cart state
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orderNotes, setOrderNotes] = useState('');

  // Fetch data
  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch categories
      const { data: categoriesData } = await supabase
        .from('shop_categories')
        .select('*')
        .eq('is_active', true)
        .order('display_order');

      if (categoriesData) setCategories(categoriesData);

      // Fetch items
      const { data: itemsData } = await supabase
        .from('shop_items')
        .select('*, shop_categories(*)')
        .eq('is_active', true)
        .order('name');

      if (itemsData) setItems(itemsData);

      // Fetch user's orders
      if (user?.id) {
        const { data: ordersData } = await supabase
          .from('shop_orders')
          .select('*, shop_order_items(*)')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (ordersData) setOrders(ordersData);
      }
    } catch (error) {
      console.error('Error fetching shop data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filtered items
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesCategory = !selectedCategory || item.category_id === selectedCategory;
      const matchesSearch = !searchQuery ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.sku?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [items, selectedCategory, searchQuery]);

  // Handle item selection (resets quantity to 1)
  const handleSelectItem = (item: ShopItem) => {
    setSelectedItem(item);
    setAddQuantity(1);
  };

  // Card quantity helpers
  const getCardQuantity = (itemId: string) => cardQuantities[itemId] || 1;

  const updateCardQuantity = (itemId: string, delta: number, maxQty: number) => {
    setCardQuantities(prev => ({
      ...prev,
      [itemId]: Math.max(1, Math.min((prev[itemId] || 1) + delta, maxQty))
    }));
  };

  const resetCardQuantity = (itemId: string) => {
    setCardQuantities(prev => {
      const newState = { ...prev };
      delete newState[itemId];
      return newState;
    });
  };

  // Cart operations
  const addToCart = (item: ShopItem, qty: number = 1) => {
    setCart(prev => {
      const existing = prev.find(c => c.item.id === item.id);
      if (existing) {
        // Don't exceed available stock
        const newQty = Math.min(existing.quantity + qty, item.quantity);
        if (newQty === existing.quantity) return prev;
        return prev.map(c =>
          c.item.id === item.id ? { ...c, quantity: newQty } : c
        );
      }
      return [...prev, { item, quantity: Math.min(qty, item.quantity) }];
    });
  };

  const removeFromCart = (itemId: string) => {
    setCart(prev => prev.filter(c => c.item.id !== itemId));
  };

  const updateCartQuantity = (itemId: string, delta: number) => {
    setCart(prev => {
      return prev.map(c => {
        if (c.item.id !== itemId) return c;
        const newQty = Math.max(1, Math.min(c.quantity + delta, c.item.quantity));
        return { ...c, quantity: newQty };
      });
    });
  };

  const cartTotal = useMemo(() => {
    return cart.reduce((sum, c) => sum + (c.item.price * c.quantity), 0);
  }, [cart]);

  const cartItemCount = useMemo(() => {
    return cart.reduce((sum, c) => sum + c.quantity, 0);
  }, [cart]);

  // Submit order
  const submitOrder = async () => {
    if (!user?.id || cart.length === 0) return;

    setSubmitting(true);
    try {
      // Generate order number
      const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;

      // Create order
      const { data: orderData, error: orderError } = await supabase
        .from('shop_orders')
        .insert({
          order_number: orderNumber,
          user_id: user.id,
          status: 'pending',
          notes: orderNotes || null,
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items
      const orderItems = cart.map(c => ({
        order_id: orderData.id,
        item_id: c.item.id,
        quantity: c.quantity,
        item_name: c.item.name,
        item_price: c.item.price,
      }));

      const { error: itemsError } = await supabase
        .from('shop_order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      // Clear cart and refresh orders
      setCart([]);
      setOrderNotes('');
      setIsCartOpen(false);
      fetchData();

      // Show success and switch to orders
      setViewMode('orders');
    } catch (error) {
      console.error('Error submitting order:', error);
      alert('Failed to submit order. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Format date
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Get category icon
  const getCategoryIcon = (icon: string | null) => {
    if (!icon) return '📦';
    return CATEGORY_ICONS[icon] || '📦';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f0f12] p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-12 bg-[#1a1a23] rounded-xl w-1/3" />
            <div className="flex gap-3">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="h-10 w-24 bg-[#1a1a23] rounded-lg" />
              ))}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                <div key={i} className="h-64 bg-[#1a1a23] rounded-xl" />
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
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#ea2127] to-[#ff6b6b] flex items-center justify-center">
              <FiShoppingBag className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Shop</h1>
              <p className="text-sm text-[#8b8b9a]">Browse and order components</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* View Toggle - only show if user can order */}
            {canOrder && (
              <div className="flex items-center bg-[#1a1a23] rounded-lg p-1">
                <button
                  onClick={() => setViewMode('shop')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    viewMode === 'shop'
                      ? 'bg-[#ea2127] text-white'
                      : 'text-[#8b8b9a] hover:text-white'
                  }`}
                >
                  Browse
                </button>
                <button
                  onClick={() => setViewMode('orders')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    viewMode === 'orders'
                      ? 'bg-[#ea2127] text-white'
                      : 'text-[#8b8b9a] hover:text-white'
                  }`}
                >
                  My Orders
                </button>
              </div>
            )}

            {/* Cart Button - only show if user can order */}
            {viewMode === 'shop' && canOrder && (
              <button
                onClick={() => setIsCartOpen(true)}
                className="relative flex items-center gap-2 px-4 py-2.5 bg-[#1a1a23] hover:bg-[#2a2a35] rounded-xl text-white transition-colors"
              >
                <FiShoppingCart className="w-5 h-5" />
                <span className="hidden sm:inline">Cart</span>
                {cartItemCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#ea2127] text-white text-xs flex items-center justify-center">
                    {cartItemCount}
                  </span>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Shop View */}
        {viewMode === 'shop' && (
          <>
            {/* Search & Categories */}
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Search */}
              <div className="relative flex-1 max-w-md">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#5a5a68]" />
                <input
                  type="text"
                  placeholder="Search items..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-[#1a1a23] border border-[#2a2a35] rounded-xl text-white placeholder-[#5a5a68] focus:outline-none focus:border-[#ea2127]/50"
                />
              </div>

              {/* Category Chips */}
              <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0 scrollbar-hide">
                <button
                  onClick={() => setSelectedCategory(null)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                    !selectedCategory
                      ? 'bg-[#ea2127] text-white'
                      : 'bg-[#1a1a23] text-[#8b8b9a] hover:text-white hover:bg-[#2a2a35]'
                  }`}
                >
                  All Items
                </button>
                {categories.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all flex items-center gap-2 ${
                      selectedCategory === cat.id
                        ? 'text-white'
                        : 'bg-[#1a1a23] text-[#8b8b9a] hover:text-white hover:bg-[#2a2a35]'
                    }`}
                    style={{
                      backgroundColor: selectedCategory === cat.id ? cat.color : undefined,
                    }}
                  >
                    <span>{getCategoryIcon(cat.icon)}</span>
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Items Grid */}
            {filteredItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <FiPackage className="w-16 h-16 text-[#2a2a35] mb-4" />
                <h3 className="text-lg font-medium text-white mb-2">No items found</h3>
                <p className="text-[#8b8b9a]">
                  {searchQuery || selectedCategory
                    ? 'Try adjusting your search or filter'
                    : 'No items available in the shop'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                <AnimatePresence mode="popLayout">
                  {filteredItems.map((item, index) => (
                    <motion.div
                      key={item.id}
                      layout
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.2, delay: index * 0.02 }}
                      className="bg-[#141418] border border-[#2a2a35] rounded-xl overflow-hidden hover:border-[#3a3a45] transition-colors group"
                    >
                      {/* Image */}
                      <div
                        className="relative aspect-square bg-[#1a1a23] cursor-pointer"
                        onClick={() => handleSelectItem(item)}
                      >
                        {item.image_url ? (
                          <img
                            src={item.image_url}
                            alt={item.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <FiPackage className="w-12 h-12 text-[#3a3a45]" />
                          </div>
                        )}

                        {/* Stock Badge */}
                        {item.quantity === 0 ? (
                          <div className="absolute top-2 right-2 px-2 py-1 rounded-md bg-red-500/90 text-white text-xs font-medium">
                            Out of Stock
                          </div>
                        ) : item.quantity <= item.min_quantity ? (
                          <div className="absolute top-2 right-2 px-2 py-1 rounded-md bg-amber-500/90 text-white text-xs font-medium">
                            Low Stock
                          </div>
                        ) : null}

                        {/* Category */}
                        {item.shop_categories && (
                          <div
                            className="absolute bottom-2 left-2 px-2 py-1 rounded-md text-white text-xs font-medium"
                            style={{ backgroundColor: item.shop_categories.color }}
                          >
                            {item.shop_categories.name}
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="p-4">
                        <h3
                          className="font-medium text-white mb-1 truncate cursor-pointer hover:text-[#ea2127] transition-colors"
                          onClick={() => handleSelectItem(item)}
                        >
                          {item.name}
                        </h3>
                        {item.sku && (
                          <p className="text-xs text-[#5a5a68] mb-2 flex items-center gap-1">
                            <FiHash className="w-3 h-3" />
                            {item.sku}
                          </p>
                        )}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="text-lg font-bold text-[#ea2127]">
                                {item.price > 0 ? `€${item.price.toFixed(2)}` : 'Free'}
                              </span>
                              <span className="text-xs text-[#5a5a68] ml-2">
                                {item.quantity} in stock
                              </span>
                            </div>
                          </div>
                          {/* Quantity selector + Add button - only show if user can order */}
                          {canOrder && (
                            <div className="flex items-center gap-2">
                              <div className="flex items-center gap-1 bg-[#1a1a23] rounded-lg p-0.5 flex-1">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    updateCardQuantity(item.id, -1, item.quantity);
                                  }}
                                  disabled={getCardQuantity(item.id) <= 1}
                                  className={`p-1.5 rounded-md transition-colors ${
                                    getCardQuantity(item.id) <= 1
                                      ? 'text-[#5a5a68] cursor-not-allowed'
                                      : 'text-white hover:bg-[#2a2a35]'
                                  }`}
                                >
                                  <FiMinus className="w-4 h-4" />
                                </button>
                                <span className="flex-1 text-center text-white font-medium text-sm">
                                  {getCardQuantity(item.id)}
                                </span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    updateCardQuantity(item.id, 1, item.quantity);
                                  }}
                                  disabled={getCardQuantity(item.id) >= item.quantity}
                                  className={`p-1.5 rounded-md transition-colors ${
                                    getCardQuantity(item.id) >= item.quantity
                                      ? 'text-[#5a5a68] cursor-not-allowed'
                                      : 'text-white hover:bg-[#2a2a35]'
                                  }`}
                                >
                                  <FiPlus className="w-4 h-4" />
                                </button>
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  addToCart(item, getCardQuantity(item.id));
                                  resetCardQuantity(item.id);
                                }}
                                disabled={item.quantity === 0}
                                className={`p-2 rounded-lg transition-colors ${
                                  item.quantity === 0
                                    ? 'bg-[#2a2a35] text-[#5a5a68] cursor-not-allowed'
                                    : 'bg-[#ea2127] hover:bg-[#c91b20] text-white'
                                }`}
                              >
                                <FiShoppingCart className="w-5 h-5" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </>
        )}

        {/* Orders View */}
        {viewMode === 'orders' && (
          <>
            {selectedOrder ? (
              /* Order Detail */
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-[#141418] border border-[#2a2a35] rounded-xl overflow-hidden"
              >
                <div className="p-6 border-b border-[#2a2a35]">
                  <button
                    onClick={() => setSelectedOrder(null)}
                    className="flex items-center gap-2 text-[#8b8b9a] hover:text-white mb-4 transition-colors"
                  >
                    <FiArrowLeft className="w-4 h-4" />
                    Back to Orders
                  </button>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h2 className="text-xl font-bold text-white">{selectedOrder.order_number}</h2>
                      <p className="text-sm text-[#8b8b9a]">{formatDate(selectedOrder.created_at)}</p>
                    </div>
                    <div
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium"
                      style={{
                        backgroundColor: STATUS_CONFIG[selectedOrder.status]?.bgColor,
                        color: STATUS_CONFIG[selectedOrder.status]?.color,
                      }}
                    >
                      {STATUS_CONFIG[selectedOrder.status]?.icon}
                      {STATUS_CONFIG[selectedOrder.status]?.label}
                    </div>
                  </div>
                </div>

                <div className="p-6 space-y-6">
                  {/* Order Items */}
                  <div>
                    <h3 className="text-sm font-medium text-[#8b8b9a] mb-3">Items</h3>
                    <div className="space-y-3">
                      {selectedOrder.shop_order_items?.map(item => (
                        <div key={item.id} className="flex items-center justify-between p-3 bg-[#1a1a23] rounded-lg">
                          <div>
                            <p className="text-white font-medium">{item.item_name}</p>
                            <p className="text-sm text-[#5a5a68]">Qty: {item.quantity}</p>
                          </div>
                          <p className="text-white">
                            {item.item_price > 0 ? `€${(item.item_price * item.quantity).toFixed(2)}` : 'Free'}
                          </p>
                        </div>
                      ))}
                    </div>

                    <div className="flex justify-between items-center mt-4 pt-4 border-t border-[#2a2a35]">
                      <span className="text-[#8b8b9a]">Total</span>
                      <span className="text-xl font-bold text-white">
                        €{selectedOrder.shop_order_items?.reduce((sum, i) => sum + (i.item_price * i.quantity), 0).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Notes */}
                  {selectedOrder.notes && (
                    <div>
                      <h3 className="text-sm font-medium text-[#8b8b9a] mb-2">Your Notes</h3>
                      <p className="text-white bg-[#1a1a23] rounded-lg p-3">{selectedOrder.notes}</p>
                    </div>
                  )}

                  {selectedOrder.admin_notes && (
                    <div>
                      <h3 className="text-sm font-medium text-[#8b8b9a] mb-2">Admin Response</h3>
                      <p className="text-white bg-[#1a1a23] rounded-lg p-3">{selectedOrder.admin_notes}</p>
                    </div>
                  )}
                </div>
              </motion.div>
            ) : (
              /* Orders List */
              <>
                {orders.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <FiShoppingBag className="w-16 h-16 text-[#2a2a35] mb-4" />
                    <h3 className="text-lg font-medium text-white mb-2">No orders yet</h3>
                    <p className="text-[#8b8b9a] mb-4">Start browsing and add items to your cart</p>
                    <button
                      onClick={() => setViewMode('shop')}
                      className="px-4 py-2 bg-[#ea2127] hover:bg-[#c91b20] text-white rounded-lg transition-colors"
                    >
                      Browse Shop
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {orders.map(order => (
                      <motion.div
                        key={order.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-[#141418] border border-[#2a2a35] rounded-xl p-4 hover:border-[#3a3a45] transition-colors cursor-pointer"
                        onClick={() => setSelectedOrder(order)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-lg bg-[#1a1a23] flex items-center justify-center">
                              <FiShoppingBag className="w-5 h-5 text-[#8b8b9a]" />
                            </div>
                            <div>
                              <p className="font-medium text-white">{order.order_number}</p>
                              <p className="text-sm text-[#5a5a68]">
                                {order.shop_order_items?.length || 0} items
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-4">
                            <div className="text-right hidden sm:block">
                              <p className="text-white font-medium">
                                €{order.shop_order_items?.reduce((sum, i) => sum + (i.item_price * i.quantity), 0).toFixed(2)}
                              </p>
                              <p className="text-xs text-[#5a5a68]">{formatDate(order.created_at)}</p>
                            </div>

                            <div
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium"
                              style={{
                                backgroundColor: STATUS_CONFIG[order.status]?.bgColor,
                                color: STATUS_CONFIG[order.status]?.color,
                              }}
                            >
                              {STATUS_CONFIG[order.status]?.icon}
                              <span className="hidden sm:inline">{STATUS_CONFIG[order.status]?.label}</span>
                            </div>

                            <FiChevronRight className="w-5 h-5 text-[#5a5a68]" />
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>

      {/* Item Detail Modal */}
      <AnimatePresence>
        {selectedItem && viewMode === 'shop' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedItem(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#141418] border border-[#2a2a35] rounded-xl max-w-lg w-full overflow-hidden"
            >
              {/* Image */}
              <div className="relative aspect-video bg-[#1a1a23]">
                {selectedItem.image_url ? (
                  <img
                    src={selectedItem.image_url}
                    alt={selectedItem.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <FiPackage className="w-16 h-16 text-[#3a3a45]" />
                  </div>
                )}
                <button
                  onClick={() => setSelectedItem(null)}
                  className="absolute top-3 right-3 p-2 bg-black/50 hover:bg-black/70 rounded-lg text-white transition-colors"
                >
                  <FiX className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-white">{selectedItem.name}</h2>
                    {selectedItem.sku && (
                      <p className="text-sm text-[#5a5a68] flex items-center gap-1 mt-1">
                        <FiHash className="w-3 h-3" />
                        {selectedItem.sku}
                      </p>
                    )}
                  </div>
                  {selectedItem.shop_categories && (
                    <span
                      className="px-3 py-1 rounded-lg text-sm font-medium text-white"
                      style={{ backgroundColor: selectedItem.shop_categories.color }}
                    >
                      {selectedItem.shop_categories.name}
                    </span>
                  )}
                </div>

                {selectedItem.description && (
                  <p className="text-[#8b8b9a]">{selectedItem.description}</p>
                )}

                <div className="flex items-center justify-between pt-4 border-t border-[#2a2a35]">
                  <div>
                    <span className="text-2xl font-bold text-[#ea2127]">
                      {selectedItem.price > 0 ? `€${selectedItem.price.toFixed(2)}` : 'Free'}
                    </span>
                    <span className="text-sm text-[#5a5a68] ml-2">
                      {selectedItem.quantity} in stock
                    </span>
                  </div>

                  {/* Quantity Selector and Add to Cart - only show if user can order */}
                  {canOrder && (
                    <div className="flex items-center gap-3">
                      {/* Quantity Selector */}
                      <div className="flex items-center gap-1 bg-[#1a1a23] rounded-lg p-1">
                        <button
                          onClick={() => setAddQuantity(q => Math.max(1, q - 1))}
                          disabled={addQuantity <= 1}
                          className={`p-2 rounded-md transition-colors ${
                            addQuantity <= 1
                              ? 'text-[#5a5a68] cursor-not-allowed'
                              : 'text-white hover:bg-[#2a2a35]'
                          }`}
                        >
                          <FiMinus className="w-4 h-4" />
                        </button>
                        <span className="w-10 text-center text-white font-medium">
                          {addQuantity}
                        </span>
                        <button
                          onClick={() => setAddQuantity(q => Math.min(selectedItem.quantity, q + 1))}
                          disabled={addQuantity >= selectedItem.quantity}
                          className={`p-2 rounded-md transition-colors ${
                            addQuantity >= selectedItem.quantity
                              ? 'text-[#5a5a68] cursor-not-allowed'
                              : 'text-white hover:bg-[#2a2a35]'
                          }`}
                        >
                          <FiPlus className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Add to Cart Button */}
                      <button
                        onClick={() => {
                          addToCart(selectedItem, addQuantity);
                          setSelectedItem(null);
                        }}
                        disabled={selectedItem.quantity === 0}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-colors ${
                          selectedItem.quantity === 0
                            ? 'bg-[#2a2a35] text-[#5a5a68] cursor-not-allowed'
                            : 'bg-[#ea2127] hover:bg-[#c91b20] text-white'
                        }`}
                      >
                        <FiShoppingCart className="w-4 h-4" />
                        Add to Cart
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cart Drawer */}
      <AnimatePresence>
        {isCartOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
              onClick={() => setIsCartOpen(false)}
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'tween', duration: 0.3 }}
              className="fixed top-0 right-0 bottom-0 w-full max-w-md bg-[#141418] border-l border-[#2a2a35] z-50 flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-[#2a2a35]">
                <div className="flex items-center gap-3">
                  <FiShoppingCart className="w-5 h-5 text-[#ea2127]" />
                  <h2 className="text-lg font-bold text-white">Cart ({cartItemCount})</h2>
                </div>
                <button
                  onClick={() => setIsCartOpen(false)}
                  className="p-2 hover:bg-[#2a2a35] rounded-lg text-[#8b8b9a] hover:text-white transition-colors"
                >
                  <FiX className="w-5 h-5" />
                </button>
              </div>

              {/* Cart Items */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {cart.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <FiShoppingCart className="w-12 h-12 text-[#2a2a35] mb-3" />
                    <p className="text-[#8b8b9a]">Your cart is empty</p>
                  </div>
                ) : (
                  cart.map(cartItem => (
                    <div
                      key={cartItem.item.id}
                      className="flex items-center gap-3 bg-[#1a1a23] rounded-xl p-3"
                    >
                      {/* Thumbnail */}
                      <div className="w-16 h-16 rounded-lg bg-[#2a2a35] flex-shrink-0 overflow-hidden">
                        {cartItem.item.image_url ? (
                          <img
                            src={cartItem.item.image_url}
                            alt={cartItem.item.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <FiPackage className="w-6 h-6 text-[#5a5a68]" />
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium truncate">{cartItem.item.name}</p>
                        <p className="text-sm text-[#ea2127]">
                          {cartItem.item.price > 0 ? `€${cartItem.item.price.toFixed(2)}` : 'Free'}
                        </p>
                      </div>

                      {/* Quantity */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateCartQuantity(cartItem.item.id, -1)}
                          className="p-1.5 bg-[#2a2a35] hover:bg-[#3a3a45] rounded-lg text-white transition-colors"
                        >
                          <FiMinus className="w-4 h-4" />
                        </button>
                        <span className="w-8 text-center text-white font-medium">
                          {cartItem.quantity}
                        </span>
                        <button
                          onClick={() => updateCartQuantity(cartItem.item.id, 1)}
                          disabled={cartItem.quantity >= cartItem.item.quantity}
                          className={`p-1.5 rounded-lg transition-colors ${
                            cartItem.quantity >= cartItem.item.quantity
                              ? 'bg-[#2a2a35] text-[#5a5a68] cursor-not-allowed'
                              : 'bg-[#2a2a35] hover:bg-[#3a3a45] text-white'
                          }`}
                        >
                          <FiPlus className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Remove */}
                      <button
                        onClick={() => removeFromCart(cartItem.item.id)}
                        className="p-1.5 hover:bg-[#2a2a35] rounded-lg text-[#5a5a68] hover:text-red-500 transition-colors"
                      >
                        <FiTrash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Footer */}
              {cart.length > 0 && (
                <div className="p-4 border-t border-[#2a2a35] space-y-4">
                  {/* Notes */}
                  <textarea
                    placeholder="Add notes for your order (optional)..."
                    value={orderNotes}
                    onChange={(e) => setOrderNotes(e.target.value)}
                    className="w-full p-3 bg-[#1a1a23] border border-[#2a2a35] rounded-xl text-white placeholder-[#5a5a68] focus:outline-none focus:border-[#ea2127]/50 resize-none"
                    rows={2}
                  />

                  {/* Total */}
                  <div className="flex items-center justify-between">
                    <span className="text-[#8b8b9a]">Total</span>
                    <span className="text-2xl font-bold text-white">€{cartTotal.toFixed(2)}</span>
                  </div>

                  {/* Submit */}
                  <button
                    onClick={submitOrder}
                    disabled={submitting}
                    className="w-full py-3 bg-[#ea2127] hover:bg-[#c91b20] disabled:bg-[#2a2a35] disabled:text-[#5a5a68] text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    {submitting ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <FiCheck className="w-5 h-5" />
                        Submit Order
                      </>
                    )}
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ShopPage;
