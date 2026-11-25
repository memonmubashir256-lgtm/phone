import React, {useEffect, useState} from 'react';
import {Bell, BellOff, LogOut, MapPin, Package, Plus, Trash2, User} from 'lucide-react';
import {useStore} from '../context/StoreContext';
import type {Address, Order} from '../types';
import {formatCurrency, formatShortDate} from '../utils/format';
import {useNotifications} from '../hooks/useNotifications';

export const ProfilePage: React.FC = () => {
  const {user, loading, navigate, apiFetch, logout, setSession, showToast, settings, wishlistIds} = useStore();
  const {supported, subscribed, subscribe, unsubscribe} = useNotifications();
  const [orders, setOrders] = useState<Order[]>([]);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [showAddrForm, setShowAddrForm] = useState(false);
  const [newAddr, setNewAddr] = useState({
    label: 'Home',
    fullName: user?.fullName || '',
    phone: user?.phone || '',
    country: 'Pakistan',
    city: 'Karachi',
    area: '',
    streetAddress: '',
    postalCode: '',
  });

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate('/login');
      return;
    }
    setFullName(user.fullName);
    setPhone(user.phone);
    (async () => {
      const res = await apiFetch('/api/account/overview');
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders || []);
        setAddresses(data.addresses || []);
      }
    })();
  }, [user, loading, navigate, apiFetch]);

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="h-40 rounded-3xl bg-white border border-[#E5EAF2] animate-pulse" />
      </div>
    );
  }

  if (!user) return null;

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await apiFetch('/api/account/profile', {
      method: 'PATCH',
      body: JSON.stringify({fullName, phone}),
    });
    if (res.ok) {
      const data = await res.json();
      setSession(data.user);
      showToast('Profile updated.');
    }
  };

  const handleAddAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await apiFetch('/api/account/addresses', {
      method: 'POST',
      body: JSON.stringify(newAddr),
    });
    const data = await res.json();
    if (!res.ok) {
      showToast(data.error || 'Could not save address.', 'error');
      return;
    }
    setAddresses((prev) => [...prev, data.address]);
    setShowAddrForm(false);
    showToast('Address saved.');
  };

  const handleDeleteAddress = async (id: string) => {
    const res = await apiFetch(`/api/account/addresses/${id}`, {method: 'DELETE'});
    if (res.ok) {
      setAddresses((prev) => prev.filter((a) => a.id !== id));
      showToast('Address removed.', 'info');
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-6 sm:py-10 pb-24 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0860E8] text-white">
            <User className="h-6 w-6" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-[#101828]">{user.fullName}</h1>
            <p className="text-xs text-[#667085]">{user.email}</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {user.role === 'admin' && (
            <button
              type="button"
              onClick={() => navigate('/admin')}
              className="rounded-xl bg-[#061B3D] px-4 py-2 text-xs font-semibold text-white hover:bg-[#092759] cursor-pointer"
            >
              Open Admin Console
            </button>
          )}
          <button
            type="button"
            onClick={() => void logout()}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#E5EAF2] bg-white px-4 py-2 text-xs font-semibold text-[#101828] hover:bg-rose-50 hover:text-rose-600 cursor-pointer"
          >
            <LogOut className="h-3.5 w-3.5" /> Logout
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Profile & Push Preferences */}
        <div className="lg:col-span-5 space-y-5">
          <form onSubmit={handleSaveProfile} className="rounded-3xl border border-[#E5EAF2] bg-white p-5 sm:p-6 space-y-4">
            <h2 className="font-display text-lg font-bold text-[#101828]">Account Details</h2>
            <div>
              <label htmlFor="prof-name" className="block text-xs font-semibold text-[#475467] mb-1">
                Full Name
              </label>
              <input
                id="prof-name"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full rounded-xl border border-[#E5EAF2] bg-[#F4F8FF] px-3.5 py-2 text-sm text-[#101828] focus:border-[#0860E8] focus:bg-white focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="prof-phone" className="block text-xs font-semibold text-[#475467] mb-1">
                Phone
              </label>
              <input
                id="prof-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-xl border border-[#E5EAF2] bg-[#F4F8FF] px-3.5 py-2 text-sm text-[#101828] focus:border-[#0860E8] focus:bg-white focus:outline-none"
              />
            </div>
            <button
              type="submit"
              className="rounded-xl bg-[#0860E8] px-5 py-2.5 text-xs font-semibold text-white hover:bg-[#0650C7] cursor-pointer"
            >
              Save Changes
            </button>
          </form>

          {/* Push Notifications */}
          <div className="rounded-3xl border border-[#E5EAF2] bg-white p-5 sm:p-6 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {subscribed ? (
                  <Bell className="h-4 w-4 text-[#0860E8]" />
                ) : (
                  <BellOff className="h-4 w-4 text-[#667085]" />
                )}
                <h2 className="font-display text-base font-bold text-[#101828]">Push Notifications</h2>
              </div>
              <span className="text-xs font-semibold text-[#667085]">
                {subscribed ? 'Active' : 'Off'}
              </span>
            </div>
            <p className="text-xs text-[#667085]">
              Get real-time alerts for order confirmations, dispatch updates, flash offers, and new launches.
            </p>
            {supported ? (
              subscribed ? (
                <button
                  type="button"
                  onClick={() => {
                    unsubscribe();
                    showToast('Push notifications unsubscribed.', 'info');
                  }}
                  className="rounded-xl border border-[#E5EAF2] bg-[#F4F8FF] px-4 py-2 text-xs font-semibold text-[#101828] hover:bg-rose-50 hover:text-rose-600 cursor-pointer"
                >
                  Unsubscribe Alerts
                </button>
              ) : (
                <button
                  type="button"
                  onClick={async () => {
                    const ok = await subscribe();
                    if (ok) showToast('Push alerts enabled!');
                    else showToast('Notification permission was blocked by browser.', 'info');
                  }}
                  className="rounded-xl bg-[#0860E8] px-4 py-2 text-xs font-semibold text-white hover:bg-[#0650C7] cursor-pointer"
                >
                  Enable Order & Deal Alerts
                </button>
              )
            ) : (
              <p className="text-xs text-[#667085]">Notifications are not supported in this browser.</p>
            )}
          </div>

          <button
            type="button"
            onClick={() => navigate('/wishlist')}
            className="w-full rounded-2xl border border-[#E5EAF2] bg-white p-4 text-left font-display text-sm font-bold text-[#101828] hover:border-[#0860E8] cursor-pointer"
          >
            View Saved Wishlist ({wishlistIds.length} items) →
          </button>
        </div>

        {/* Orders & Saved Addresses */}
        <div className="lg:col-span-7 space-y-6">
          <section className="rounded-3xl border border-[#E5EAF2] bg-white p-5 sm:p-6">
            <div className="flex items-center gap-2 mb-4">
              <Package className="h-5 w-5 text-[#0860E8]" />
              <h2 className="font-display text-lg font-bold text-[#101828]">Order History</h2>
            </div>

            {orders.length === 0 ? (
              <p className="text-sm text-[#667085]">You haven't placed any orders yet.</p>
            ) : (
              <div className="space-y-3">
                {orders.map((ord) => (
                  <div
                    key={ord.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#E5EAF2] bg-[#F4F8FF] p-4"
                  >
                    <div>
                      <p className="font-mono text-xs font-bold text-[#0860E8]">{ord.orderNumber}</p>
                      <p className="font-display text-sm font-bold text-[#101828] mt-0.5">
                        {ord.items[0]?.productName}
                        {ord.items.length > 1 ? ` + ${ord.items.length - 1} more` : ''}
                      </p>
                      <p className="text-xs text-[#667085]">
                        {formatShortDate(ord.createdAt)} · {ord.status}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-display text-sm font-bold text-[#101828] tabular-nums">
                        {formatCurrency(ord.total, settings.currency)}
                      </p>
                      <button
                        type="button"
                        onClick={() =>
                          navigate(
                            `/tracking?order=${encodeURIComponent(ord.orderNumber)}&phone=${encodeURIComponent(ord.customerPhone)}`
                          )
                        }
                        className="mt-1 text-xs font-semibold text-[#0860E8] hover:underline cursor-pointer"
                      >
                        Track Order →
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-3xl border border-[#E5EAF2] bg-white p-5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-[#0860E8]" />
                <h2 className="font-display text-lg font-bold text-[#101828]">Saved Addresses</h2>
              </div>
              <button
                type="button"
                onClick={() => setShowAddrForm((p) => !p)}
                className="inline-flex items-center gap-1 rounded-xl bg-[#EEF4FF] px-3 py-1.5 text-xs font-semibold text-[#0860E8] cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" /> Add Address
              </button>
            </div>

            {showAddrForm && (
              <form onSubmit={handleAddAddress} className="mb-4 rounded-2xl bg-[#F4F8FF] p-4 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="text"
                    required
                    placeholder="Label (Home / Office)"
                    value={newAddr.label}
                    onChange={(e) => setNewAddr({...newAddr, label: e.target.value})}
                    className="rounded-xl border border-[#E5EAF2] bg-white px-3 py-2 text-xs"
                  />
                  <input
                    type="text"
                    required
                    placeholder="City"
                    value={newAddr.city}
                    onChange={(e) => setNewAddr({...newAddr, city: e.target.value})}
                    className="rounded-xl border border-[#E5EAF2] bg-white px-3 py-2 text-xs"
                  />
                  <input
                    type="text"
                    required
                    placeholder="Area"
                    value={newAddr.area}
                    onChange={(e) => setNewAddr({...newAddr, area: e.target.value})}
                    className="rounded-xl border border-[#E5EAF2] bg-white px-3 py-2 text-xs"
                  />
                  <input
                    type="text"
                    required
                    placeholder="Postal Code"
                    value={newAddr.postalCode}
                    onChange={(e) => setNewAddr({...newAddr, postalCode: e.target.value})}
                    className="rounded-xl border border-[#E5EAF2] bg-white px-3 py-2 text-xs"
                  />
                </div>
                <input
                  type="text"
                  required
                  placeholder="Street Address"
                  value={newAddr.streetAddress}
                  onChange={(e) => setNewAddr({...newAddr, streetAddress: e.target.value})}
                  className="w-full rounded-xl border border-[#E5EAF2] bg-white px-3 py-2 text-xs"
                />
                <button
                  type="submit"
                  className="rounded-xl bg-[#0860E8] px-4 py-2 text-xs font-semibold text-white cursor-pointer"
                >
                  Save Address
                </button>
              </form>
            )}

            <div className="space-y-3">
              {addresses.length === 0 ? (
                <p className="text-sm text-[#667085]">No saved addresses yet.</p>
              ) : (
                addresses.map((addr) => (
                  <div
                    key={addr.id}
                    className="flex items-start justify-between gap-3 rounded-2xl border border-[#E5EAF2] p-4"
                  >
                    <div className="text-xs">
                      <p className="font-display text-sm font-bold text-[#101828]">
                        {addr.label} — {addr.fullName}
                      </p>
                      <p className="mt-1 text-[#475467]">
                        {addr.streetAddress}, {addr.area}, {addr.city} {addr.postalCode}
                      </p>
                      <p className="text-[#667085]">{addr.phone}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleDeleteAddress(addr.id)}
                      aria-label={`Delete ${addr.label} address`}
                      className="rounded-lg p-1.5 text-[#98A2B3] hover:text-rose-600 cursor-pointer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
