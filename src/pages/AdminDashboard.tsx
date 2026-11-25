import React, {useCallback, useEffect, useState} from 'react';
import {
  BarChart3,
  Bell,
  Box,
  LayoutDashboard,
  Lock,
  LogOut,
  Mail,
  Plus,
  Settings,
  ShoppingBag,
  Tag,
  Trash2,
  Users,
} from 'lucide-react';
import {useStore} from '../context/StoreContext';
import type {
  Coupon,
  Order,
  OrderStatus,
  PaymentMethod,
  Product,
  PublicUser,
  WebsiteSettings,
} from '../types';
import {formatCurrency, formatShortDate} from '../utils/format';
import {TechNovaLogo} from '../components/BrandLogo';

type AdminTab = 'overview' | 'products' | 'orders' | 'customers' | 'coupons' | 'settings';

interface AdminOverviewData {
  kpis: {
    totalRevenue: number;
    totalOrders: number;
    totalProducts: number;
    totalCustomers: number;
    pendingOrders: number;
  };
  monthlyRevenue: {month: string; revenue: number}[];
  topProducts: {productId: string; name: string; units: number; revenue: number}[];
  orders: Order[];
  products: Product[];
  customers: PublicUser[];
  coupons: Coupon[];
  newsletterSubscribers: {id: string; email: string; subscribedAt: string}[];
  settings: WebsiteSettings;
}

const ORDER_STATUSES: OrderStatus[] = [
  'Order Placed',
  'Processing',
  'Shipped',
  'Out for Delivery',
  'Delivered',
  'Cancelled',
  'Returned',
];

export const AdminDashboard: React.FC = () => {
  const {apiFetch, setSession, logout, showToast, navigate, refreshBootstrap} = useStore();
  const [statusLoading, setStatusLoading] = useState(true);
  const [adminStatus, setAdminStatus] = useState<{
    envManaged: boolean;
    claimed: boolean;
    needsFirstRunClaim: boolean;
    isAdmin: boolean;
    adminEmail?: string;
  } | null>(null);

  // Claim / Login form state
  const [authEmail, setAuthEmail] = useState('admin@technova.pk');
  const [authPassword, setAuthPassword] = useState('');
  const [authFullName, setAuthFullName] = useState('TechNova Admin');
  const [authError, setAuthError] = useState('');
  const [authSubmitting, setAuthSubmitting] = useState(false);

  const [tab, setTab] = useState<AdminTab>('overview');
  const [data, setData] = useState<AdminOverviewData | null>(null);

  // New Product form
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [newProd, setNewProd] = useState({
    name: '',
    brandName: 'Apple',
    categoryName: 'Smartphones',
    price: '',
    originalPrice: '',
    stock: '15',
    storage: '256GB',
    colorName: 'Midnight',
    image: '/src/assets/images/phone_iphone16_pro_1795612214518.jpg',
  });

  // New Coupon form
  const [newCoupon, setNewCoupon] = useState({
    code: '',
    type: 'percent' as 'percent' | 'fixed',
    value: '10',
    minOrderAmount: '20000',
    maxDiscount: '25000',
  });

  // Notification broadcast
  const [notifForm, setNotifForm] = useState({
    title: '',
    body: '',
    category: 'offer' as 'offer' | 'arrival' | 'order',
  });

  const loadStatusAndData = useCallback(async () => {
    setStatusLoading(true);
    try {
      const res = await apiFetch('/api/admin/status');
      const st = await res.json();
      setAdminStatus(st);
      if (st.isAdmin) {
        const ovRes = await apiFetch('/api/admin/overview');
        if (ovRes.ok) {
          const ov = await ovRes.json();
          setData(ov);
        }
      }
    } finally {
      setStatusLoading(false);
    }
  }, [apiFetch]);

  useEffect(() => {
    void loadStatusAndData();
  }, [loadStatusAndData]);

  const handleClaimOrLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthSubmitting(true);
    try {
      const endpoint = adminStatus?.needsFirstRunClaim ? '/api/admin/claim' : '/api/admin/login';
      const res = await apiFetch(endpoint, {
        method: 'POST',
        body: JSON.stringify({
          email: authEmail,
          password: authPassword,
          fullName: authFullName,
        }),
      });
      const result = await res.json();
      if (!res.ok) {
        setAuthError(result.error || 'Authentication failed.');
        return;
      }
      setSession(result.user, result.token);
      showToast(
        adminStatus?.needsFirstRunClaim
          ? 'Administrator account claimed and activated.'
          : 'Signed in to Admin Console.'
      );
      await loadStatusAndData();
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await apiFetch('/api/admin/products', {
      method: 'POST',
      body: JSON.stringify({
        ...newProd,
        price: Number(newProd.price),
        originalPrice: Number(newProd.originalPrice) || Number(newProd.price),
        stock: Number(newProd.stock),
      }),
    });
    const out = await res.json();
    if (!res.ok) {
      showToast(out.error || 'Failed to add product.', 'error');
      return;
    }
    showToast(`Added ${out.product.name} to catalog.`);
    setShowAddProduct(false);
    setNewProd({...newProd, name: '', price: '', originalPrice: ''});
    await Promise.all([loadStatusAndData(), refreshBootstrap()]);
  };

  const handleDeleteProduct = async (id: string) => {
    const res = await apiFetch(`/api/admin/products/${id}`, {method: 'DELETE'});
    if (res.ok) {
      showToast('Product deleted.', 'info');
      await Promise.all([loadStatusAndData(), refreshBootstrap()]);
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, nextStatus: OrderStatus) => {
    const res = await apiFetch(`/api/admin/orders/${orderId}`, {
      method: 'PATCH',
      body: JSON.stringify({status: nextStatus}),
    });
    if (res.ok) {
      showToast(`Order updated to ${nextStatus}.`);
      await loadStatusAndData();
    }
  };

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await apiFetch('/api/admin/coupons', {
      method: 'POST',
      body: JSON.stringify({
        code: newCoupon.code,
        type: newCoupon.type,
        value: Number(newCoupon.value),
        minOrderAmount: Number(newCoupon.minOrderAmount),
        maxDiscount: Number(newCoupon.maxDiscount),
      }),
    });
    const out = await res.json();
    if (!res.ok) {
      showToast(out.error || 'Failed to add coupon.', 'error');
      return;
    }
    showToast(`Coupon ${out.coupon.code} created.`);
    setNewCoupon({...newCoupon, code: ''});
    await loadStatusAndData();
  };

  const handleToggleCoupon = async (coupon: Coupon) => {
    const res = await apiFetch(`/api/admin/coupons/${coupon.id}`, {
      method: 'PATCH',
      body: JSON.stringify({active: !coupon.active}),
    });
    if (res.ok) await loadStatusAndData();
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data) return;
    const res = await apiFetch('/api/admin/settings', {
      method: 'PATCH',
      body: JSON.stringify(data.settings),
    });
    if (res.ok) {
      showToast('Store settings saved.');
      await refreshBootstrap();
    }
  };

  const handleBroadcastNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await apiFetch('/api/admin/notifications', {
      method: 'POST',
      body: JSON.stringify(notifForm),
    });
    if (res.ok) {
      showToast('Notification published to storefront.');
      setNotifForm({title: '', body: '', category: 'offer'});
      await refreshBootstrap();
    }
  };

  if (statusLoading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center text-sm text-[#667085]">
        Loading TechNova Admin Console...
      </div>
    );
  }

  // First-Run Admin Claim or Admin Sign-In Gate
  if (!adminStatus?.isAdmin) {
    const isClaim = Boolean(adminStatus?.needsFirstRunClaim);
    return (
      <div className="mx-auto max-w-md px-4 py-12 pb-24">
        <div className="rounded-3xl border border-[#E5EAF2] bg-white p-7 shadow-sm">
          <div className="flex items-center gap-3 mb-5">
            <TechNovaLogo className="h-10 w-10" />
            <div>
              <h1 className="font-display text-xl font-bold text-[#101828]">
                {isClaim ? 'Setup TechNova Admin' : 'Admin Console Sign In'}
              </h1>
              <p className="text-xs text-[#667085]">
                {isClaim
                  ? 'First-run setup: claim the administrator account for this store.'
                  : adminStatus?.envManaged
                    ? 'Enter your configured administrator passcode.'
                    : 'Sign in with your administrator credentials.'}
              </p>
            </div>
          </div>

          {authError && (
            <div role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs text-rose-700">
              {authError}
            </div>
          )}

          <form onSubmit={handleClaimOrLogin} className="space-y-4">
            {isClaim && (
              <div>
                <label htmlFor="admin-name" className="block text-xs font-semibold text-[#475467] mb-1">
                  Administrator Name
                </label>
                <input
                  id="admin-name"
                  type="text"
                  required
                  value={authFullName}
                  onChange={(e) => setAuthFullName(e.target.value)}
                  className="w-full rounded-xl border border-[#E5EAF2] bg-[#F4F8FF] px-3.5 py-2.5 text-sm text-[#101828] focus:border-[#0860E8] focus:bg-white focus:outline-none"
                />
              </div>
            )}

            <div>
              <label htmlFor="admin-email" className="block text-xs font-semibold text-[#475467] mb-1">
                Administrator Email
              </label>
              <input
                id="admin-email"
                type="email"
                required
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                className="w-full rounded-xl border border-[#E5EAF2] bg-[#F4F8FF] px-3.5 py-2.5 text-sm text-[#101828] focus:border-[#0860E8] focus:bg-white focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="admin-pass" className="block text-xs font-semibold text-[#475467] mb-1">
                {adminStatus?.envManaged ? 'Admin Passcode' : 'Password (min 8 chars)'}
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#98A2B3]" />
                <input
                  id="admin-pass"
                  type="password"
                  required
                  minLength={isClaim ? 8 : 4}
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-[#E5EAF2] bg-[#F4F8FF] py-2.5 pl-9 pr-3 text-sm text-[#101828] focus:border-[#0860E8] focus:bg-white focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={authSubmitting}
              className="w-full rounded-xl bg-[#0860E8] py-3 text-sm font-semibold text-white hover:bg-[#0650C7] disabled:opacity-60 cursor-pointer"
            >
              {authSubmitting
                ? 'Authenticating...'
                : isClaim
                  ? 'Claim Admin Access'
                  : 'Sign In to Admin'}
            </button>

            <button
              type="button"
              onClick={() => navigate('/')}
              className="block w-full text-center text-xs font-semibold text-[#667085] hover:text-[#101828] cursor-pointer"
            >
              ← Return to Storefront
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const maxRev = Math.max(...data.monthlyRevenue.map((m) => m.revenue), 1);

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 pb-24">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Sidebar / Mobile Horizontal Tabs */}
        <aside className="lg:col-span-3">
          <div className="rounded-3xl border border-[#E5EAF2] bg-white p-3 sm:p-4 lg:sticky lg:top-20">
            <div className="flex items-center justify-between gap-2 px-2 pb-3 mb-2 border-b border-[#F2F4F7]">
              <div className="min-w-0">
                <p className="font-display text-sm font-bold text-[#061B3D]">TechNova Admin</p>
                <p className="text-xs text-[#667085] truncate">{adminStatus.adminEmail}</p>
              </div>
              <button
                type="button"
                onClick={() => void logout()}
                aria-label="Sign Out"
                className="lg:hidden inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 shrink-0 cursor-pointer"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Sign Out</span>
              </button>
            </div>

            <div className="flex lg:flex-col gap-1.5 overflow-x-auto pb-1 lg:pb-0">
              {[
                {id: 'overview', label: 'Overview', icon: LayoutDashboard},
                {id: 'products', label: 'Products', icon: Box},
                {id: 'orders', label: 'Orders', icon: ShoppingBag},
                {id: 'customers', label: 'Customers', icon: Users},
                {id: 'coupons', label: 'Coupons & Subscribers', icon: Tag},
                {id: 'settings', label: 'Settings & Alerts', icon: Settings},
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setTab(item.id as AdminTab)}
                    className={`flex lg:w-full items-center gap-2 rounded-xl px-3 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold whitespace-nowrap shrink-0 transition cursor-pointer ${
                      tab === item.id
                        ? 'bg-[#0860E8] text-white'
                        : 'text-[#475467] hover:bg-[#F4F8FF] hover:text-[#101828]'
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="hidden lg:block pt-3 mt-3 border-t border-[#F2F4F7]">
              <button
                type="button"
                onClick={() => void logout()}
                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold text-rose-600 hover:bg-rose-50 cursor-pointer"
              >
                <LogOut className="h-4 w-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </aside>

        {/* Main Workspace */}
        <div className="lg:col-span-9 space-y-6">
          {tab === 'overview' && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {[
                  {
                    label: 'Total Revenue',
                    value: formatCurrency(data.kpis.totalRevenue, data.settings.currency),
                  },
                  {label: 'Total Orders', value: String(data.kpis.totalOrders)},
                  {label: 'Pending Orders', value: String(data.kpis.pendingOrders)},
                  {label: 'Products', value: String(data.kpis.totalProducts)},
                  {label: 'Customers', value: String(data.kpis.totalCustomers)},
                ].map((kpi) => (
                  <div key={kpi.label} className="rounded-2xl border border-[#E5EAF2] bg-white p-4">
                    <p className="text-xs text-[#667085]">{kpi.label}</p>
                    <p className="mt-1.5 font-display text-lg font-extrabold text-[#101828] tabular-nums">
                      {kpi.value}
                    </p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Monthly Revenue Chart */}
                <div className="lg:col-span-7 rounded-3xl border border-[#E5EAF2] bg-white p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5 text-[#0860E8]" />
                      <h2 className="font-display text-base font-bold text-[#101828]">
                        Monthly Revenue
                      </h2>
                    </div>
                    <span className="text-xs text-[#667085]">{data.settings.currency}</span>
                  </div>
                  <div className="flex items-end gap-3 h-48 pt-4">
                    {data.monthlyRevenue.map((item) => {
                      const pct = Math.max(12, Math.round((item.revenue / maxRev) * 100));
                      return (
                        <div key={item.month} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                          <span className="font-mono text-[10px] text-[#667085] tabular-nums">
                            {Math.round(item.revenue / 1000)}k
                          </span>
                          <div
                            className="w-full max-w-[42px] rounded-t-xl bg-gradient-to-t from-[#0860E8] to-[#1D75F0] transition-all"
                            style={{height: `${pct}%`}}
                          />
                          <span className="text-xs font-semibold text-[#475467]">{item.month}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Top Selling Products */}
                <div className="lg:col-span-5 rounded-3xl border border-[#E5EAF2] bg-white p-6">
                  <h2 className="font-display text-base font-bold text-[#101828] mb-4">
                    Top Selling Products
                  </h2>
                  <div className="divide-y divide-[#F2F4F7]">
                    {data.topProducts.map((tp) => (
                      <div key={tp.productId} className="flex items-center justify-between py-2.5 text-xs">
                        <div>
                          <p className="font-semibold text-[#101828]">{tp.name}</p>
                          <p className="text-[#667085]">{tp.units} units sold</p>
                        </div>
                        <span className="font-mono font-bold text-[#0860E8] tabular-nums">
                          {formatCurrency(tp.revenue, data.settings.currency)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Recent Transactions */}
              <div className="rounded-3xl border border-[#E5EAF2] bg-white p-6">
                <h2 className="font-display text-base font-bold text-[#101828] mb-4">
                  Recent Orders & Transactions
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-[#E5EAF2] text-[#667085]">
                        <th className="pb-2 font-semibold">Order</th>
                        <th className="pb-2 font-semibold">Customer</th>
                        <th className="pb-2 font-semibold">Payment</th>
                        <th className="pb-2 font-semibold">Status</th>
                        <th className="pb-2 font-semibold text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F2F4F7]">
                      {data.orders.slice(0, 6).map((ord) => (
                        <tr key={ord.id} className="hover:bg-[#F9FBFF]">
                          <td className="py-3 font-mono font-bold text-[#0860E8]">{ord.orderNumber}</td>
                          <td className="py-3 text-[#101828]">{ord.customerName}</td>
                          <td className="py-3 text-[#667085]">{ord.paymentMethod}</td>
                          <td className="py-3 font-semibold text-[#101828]">{ord.status}</td>
                          <td className="py-3 text-right font-mono font-bold tabular-nums">
                            {formatCurrency(ord.total, data.settings.currency)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {tab === 'products' && (
            <div className="rounded-3xl border border-[#E5EAF2] bg-white p-6 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-display text-lg font-bold text-[#101828]">
                  Product Catalog ({data.products.length})
                </h2>
                <button
                  type="button"
                  onClick={() => setShowAddProduct((p) => !p)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#0860E8] px-4 py-2 text-xs font-semibold text-white hover:bg-[#0650C7] cursor-pointer"
                >
                  <Plus className="h-4 w-4" /> Add Product
                </button>
              </div>

              {showAddProduct && (
                <form onSubmit={handleCreateProduct} className="rounded-2xl bg-[#F4F8FF] p-4 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <input
                      type="text"
                      required
                      placeholder="Product Name"
                      value={newProd.name}
                      onChange={(e) => setNewProd({...newProd, name: e.target.value})}
                      className="rounded-xl border border-[#E5EAF2] bg-white px-3 py-2 text-xs"
                    />
                    <select
                      value={newProd.brandName}
                      onChange={(e) => setNewProd({...newProd, brandName: e.target.value})}
                      className="rounded-xl border border-[#E5EAF2] bg-white px-3 py-2 text-xs"
                    >
                      {['Apple', 'Samsung', 'Google', 'OnePlus', 'Xiaomi', 'Realme'].map((b) => (
                        <option key={b} value={b}>
                          {b}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      required
                      placeholder="Sale Price (PKR)"
                      value={newProd.price}
                      onChange={(e) => setNewProd({...newProd, price: e.target.value})}
                      className="rounded-xl border border-[#E5EAF2] bg-white px-3 py-2 text-xs"
                    />
                    <input
                      type="number"
                      placeholder="Original Price"
                      value={newProd.originalPrice}
                      onChange={(e) => setNewProd({...newProd, originalPrice: e.target.value})}
                      className="rounded-xl border border-[#E5EAF2] bg-white px-3 py-2 text-xs"
                    />
                    <input
                      type="number"
                      required
                      placeholder="Stock"
                      value={newProd.stock}
                      onChange={(e) => setNewProd({...newProd, stock: e.target.value})}
                      className="rounded-xl border border-[#E5EAF2] bg-white px-3 py-2 text-xs"
                    />
                    <input
                      type="text"
                      placeholder="Storage (e.g. 256GB)"
                      value={newProd.storage}
                      onChange={(e) => setNewProd({...newProd, storage: e.target.value})}
                      className="rounded-xl border border-[#E5EAF2] bg-white px-3 py-2 text-xs"
                    />
                  </div>
                  <button
                    type="submit"
                    className="rounded-xl bg-[#0860E8] px-4 py-2 text-xs font-semibold text-white cursor-pointer"
                  >
                    Create Product
                  </button>
                </form>
              )}

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#E5EAF2] text-[#667085]">
                      <th className="pb-2 font-semibold">Product</th>
                      <th className="pb-2 font-semibold">Brand</th>
                      <th className="pb-2 font-semibold">Price</th>
                      <th className="pb-2 font-semibold">Stock</th>
                      <th className="pb-2 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F2F4F7]">
                    {data.products.map((prod) => (
                      <tr key={prod.id}>
                        <td className="py-3 font-semibold text-[#101828]">{prod.name}</td>
                        <td className="py-3 text-[#667085]">{prod.brandName}</td>
                        <td className="py-3 font-mono font-semibold tabular-nums">
                          {formatCurrency(prod.price, data.settings.currency)}
                        </td>
                        <td className="py-3 font-mono tabular-nums">
                          {prod.variants.reduce((s, v) => s + v.stock, 0)}
                        </td>
                        <td className="py-3 text-right">
                          <button
                            type="button"
                            onClick={() => void handleDeleteProduct(prod.id)}
                            aria-label={`Delete ${prod.name}`}
                            className="rounded-lg p-1.5 text-[#98A2B3] hover:bg-rose-50 hover:text-rose-600 cursor-pointer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === 'orders' && (
            <div className="rounded-3xl border border-[#E5EAF2] bg-white p-6 space-y-4">
              <h2 className="font-display text-lg font-bold text-[#101828]">
                Order Management ({data.orders.length})
              </h2>
              <div className="space-y-3">
                {data.orders.map((ord) => (
                  <div
                    key={ord.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-[#E5EAF2] bg-[#F4F8FF] p-4"
                  >
                    <div>
                      <p className="font-mono text-xs font-bold text-[#0860E8]">
                        {ord.orderNumber} · {formatShortDate(ord.createdAt)}
                      </p>
                      <p className="font-display text-sm font-bold text-[#101828] mt-0.5">
                        {ord.customerName} ({ord.customerPhone})
                      </p>
                      <p className="text-xs text-[#667085]">
                        {ord.items.map((i) => `${i.quantity}× ${i.productName}`).join(', ')} —{' '}
                        <strong className="text-[#101828]">
                          {formatCurrency(ord.total, data.settings.currency)}
                        </strong>{' '}
                        ({ord.paymentMethod} · {ord.paymentStatus})
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <label htmlFor={`status-${ord.id}`} className="sr-only">
                        Order Status
                      </label>
                      <select
                        id={`status-${ord.id}`}
                        value={ord.status}
                        onChange={(e) => void handleUpdateOrderStatus(ord.id, e.target.value as OrderStatus)}
                        className="rounded-xl border border-[#E5EAF2] bg-white px-3 py-2 text-xs font-semibold text-[#101828] focus:border-[#0860E8] focus:outline-none"
                      >
                        {ORDER_STATUSES.map((st) => (
                          <option key={st} value={st}>
                            {st}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'customers' && (
            <div className="rounded-3xl border border-[#E5EAF2] bg-white p-6 space-y-4">
              <h2 className="font-display text-lg font-bold text-[#101828]">
                Registered Customers ({data.customers.length})
              </h2>
              <div className="divide-y divide-[#F2F4F7]">
                {data.customers.map((cust) => (
                  <div key={cust.id} className="flex items-center justify-between py-3 text-xs">
                    <div>
                      <p className="font-display text-sm font-bold text-[#101828]">{cust.fullName}</p>
                      <p className="text-[#667085]">
                        {cust.email} · {cust.phone || 'No phone'}
                      </p>
                    </div>
                    <span className="text-[#667085]">Joined {formatShortDate(cust.createdAt)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'coupons' && (
            <div className="space-y-6">
              <div className="rounded-3xl border border-[#E5EAF2] bg-white p-6 space-y-4">
                <h2 className="font-display text-lg font-bold text-[#101828]">Coupon Management</h2>
                <form onSubmit={handleCreateCoupon} className="grid grid-cols-1 sm:grid-cols-5 gap-3 rounded-2xl bg-[#F4F8FF] p-4">
                  <input
                    type="text"
                    required
                    placeholder="CODE (e.g. EID15)"
                    value={newCoupon.code}
                    onChange={(e) => setNewCoupon({...newCoupon, code: e.target.value.toUpperCase()})}
                    className="rounded-xl border border-[#E5EAF2] bg-white px-3 py-2 text-xs uppercase"
                  />
                  <select
                    value={newCoupon.type}
                    onChange={(e) => setNewCoupon({...newCoupon, type: e.target.value as 'percent' | 'fixed'})}
                    className="rounded-xl border border-[#E5EAF2] bg-white px-3 py-2 text-xs"
                  >
                    <option value="percent">Percent %</option>
                    <option value="fixed">Fixed PKR</option>
                  </select>
                  <input
                    type="number"
                    required
                    placeholder="Value"
                    value={newCoupon.value}
                    onChange={(e) => setNewCoupon({...newCoupon, value: e.target.value})}
                    className="rounded-xl border border-[#E5EAF2] bg-white px-3 py-2 text-xs"
                  />
                  <input
                    type="number"
                    placeholder="Min Order"
                    value={newCoupon.minOrderAmount}
                    onChange={(e) => setNewCoupon({...newCoupon, minOrderAmount: e.target.value})}
                    className="rounded-xl border border-[#E5EAF2] bg-white px-3 py-2 text-xs"
                  />
                  <button
                    type="submit"
                    className="rounded-xl bg-[#0860E8] px-4 py-2 text-xs font-semibold text-white cursor-pointer"
                  >
                    Add Coupon
                  </button>
                </form>

                <div className="divide-y divide-[#F2F4F7]">
                  {data.coupons.map((cpn) => (
                    <div key={cpn.id} className="flex items-center justify-between py-3 text-xs">
                      <div>
                        <span className="font-mono font-bold text-[#0860E8]">{cpn.code}</span>
                        <span className="ml-2 text-[#475467]">
                          {cpn.type === 'percent' ? `${cpn.value}% off` : `${cpn.value} off`} · Min{' '}
                          {formatCurrency(cpn.minOrderAmount, data.settings.currency)}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => void handleToggleCoupon(cpn)}
                        className={`rounded-lg px-3 py-1 font-semibold cursor-pointer ${
                          cpn.active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {cpn.active ? 'Active' : 'Paused'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-3xl border border-[#E5EAF2] bg-white p-6 space-y-3">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-[#0860E8]" />
                  <h3 className="font-display text-base font-bold text-[#101828]">
                    Newsletter Subscribers ({data.newsletterSubscribers.length})
                  </h3>
                </div>
                <div className="divide-y divide-[#F2F4F7] text-xs">
                  {data.newsletterSubscribers.map((sub) => (
                    <div key={sub.id} className="flex justify-between py-2">
                      <span className="font-medium text-[#101828]">{sub.email}</span>
                      <span className="text-[#667085]">{formatShortDate(sub.subscribedAt)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {tab === 'settings' && (
            <div className="space-y-6">
              <form onSubmit={handleSaveSettings} className="rounded-3xl border border-[#E5EAF2] bg-white p-6 space-y-4">
                <h2 className="font-display text-lg font-bold text-[#101828]">
                  Website, Shipping & Payment Settings
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#475467] mb-1">Currency</label>
                    <select
                      value={data.settings.currency}
                      onChange={(e) =>
                        setData({
                          ...data,
                          settings: {...data.settings, currency: e.target.value},
                        })
                      }
                      className="w-full rounded-xl border border-[#E5EAF2] bg-[#F4F8FF] px-3 py-2 text-sm"
                    >
                      <option value="PKR">PKR</option>
                      <option value="USD">USD</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#475467] mb-1">
                      Free Shipping Over
                    </label>
                    <input
                      type="number"
                      value={data.settings.freeShippingThreshold}
                      onChange={(e) =>
                        setData({
                          ...data,
                          settings: {
                            ...data.settings,
                            freeShippingThreshold: Number(e.target.value),
                          },
                        })
                      }
                      className="w-full rounded-xl border border-[#E5EAF2] bg-[#F4F8FF] px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#475467] mb-1">
                      Standard Shipping Fee
                    </label>
                    <input
                      type="number"
                      value={data.settings.standardShippingFee}
                      onChange={(e) =>
                        setData({
                          ...data,
                          settings: {
                            ...data.settings,
                            standardShippingFee: Number(e.target.value),
                          },
                        })
                      }
                      className="w-full rounded-xl border border-[#E5EAF2] bg-[#F4F8FF] px-3 py-2 text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="block text-xs font-semibold text-[#475467]">
                    Enabled Payment Gateways
                  </span>
                  <div className="flex flex-wrap gap-3">
                    {(Object.keys(data.settings.paymentMethodsEnabled) as PaymentMethod[]).map((method) => (
                      <label
                        key={method}
                        className="inline-flex items-center gap-2 rounded-xl border border-[#E5EAF2] px-3 py-2 text-xs font-medium cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={data.settings.paymentMethodsEnabled[method]}
                          onChange={(e) =>
                            setData({
                              ...data,
                              settings: {
                                ...data.settings,
                                paymentMethodsEnabled: {
                                  ...data.settings.paymentMethodsEnabled,
                                  [method]: e.target.checked,
                                },
                              },
                            })
                          }
                          className="accent-[#0860E8]"
                        />
                        {method}
                      </label>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  className="rounded-xl bg-[#0860E8] px-5 py-2.5 text-xs font-semibold text-white hover:bg-[#0650C7] cursor-pointer"
                >
                  Save Store Settings
                </button>
              </form>

              <form onSubmit={handleBroadcastNotification} className="rounded-3xl border border-[#E5EAF2] bg-white p-6 space-y-3">
                <div className="flex items-center gap-2">
                  <Bell className="h-4 w-4 text-[#0860E8]" />
                  <h3 className="font-display text-base font-bold text-[#101828]">
                    Broadcast Offer / Arrival Alert
                  </h3>
                </div>
                <input
                  type="text"
                  required
                  placeholder="Alert Title (e.g. Flash Sale Live!)"
                  value={notifForm.title}
                  onChange={(e) => setNotifForm({...notifForm, title: e.target.value})}
                  className="w-full rounded-xl border border-[#E5EAF2] bg-[#F4F8FF] px-3.5 py-2 text-sm"
                />
                <textarea
                  required
                  rows={2}
                  placeholder="Message body..."
                  value={notifForm.body}
                  onChange={(e) => setNotifForm({...notifForm, body: e.target.value})}
                  className="w-full rounded-xl border border-[#E5EAF2] bg-[#F4F8FF] px-3.5 py-2 text-sm"
                />
                <button
                  type="submit"
                  className="rounded-xl bg-[#061B3D] px-4 py-2 text-xs font-semibold text-white hover:bg-[#092759] cursor-pointer"
                >
                  Publish Notification
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
