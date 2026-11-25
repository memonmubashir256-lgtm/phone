import React, {useEffect, useState} from 'react';
import {Calendar, Check, MapPin, Package, Search, Truck} from 'lucide-react';
import {useStore} from '../context/StoreContext';
import type {Order} from '../types';
import {formatCurrency, formatDateTime, formatShortDate} from '../utils/format';

export const TrackingPage: React.FC = () => {
  const {searchParams, apiFetch, settings, user} = useStore();
  const [orderNumber, setOrderNumber] = useState(searchParams.get('order') || '#TN784512');
  const [phone, setPhone] = useState(searchParams.get('phone') || '+92 300 5551234');
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const performLookup = async (num: string, ph: string) => {
    if (!num.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await apiFetch(
        `/api/orders/track?orderNumber=${encodeURIComponent(num.trim())}&phone=${encodeURIComponent(ph.trim())}`
      );
      const data = await res.json();
      if (!res.ok) {
        setOrder(null);
        setError(data.error || 'Could not locate order.');
      } else {
        setOrder(data.order);
      }
    } catch {
      setError('Unable to reach server. Live order tracking requires an internet connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const initialOrder = searchParams.get('order') || '#TN784512';
    const initialPhone = searchParams.get('phone') || '+92 300 5551234';
    setOrderNumber(initialOrder);
    setPhone(initialPhone);
    void performLookup(initialOrder, initialPhone);
  }, [searchParams]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void performLookup(orderNumber, phone);
  };

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-6 sm:py-10 pb-24 space-y-6">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#101828]">
          Track Your Order
        </h1>
        <p className="mt-1 text-sm text-[#667085]">
          Enter your TechNova order number and phone number for live shipment updates.
        </p>
      </div>

      {/* Lookup Form */}
      <form
        onSubmit={handleSubmit}
        className="rounded-3xl border border-[#E5EAF2] bg-white p-5 sm:p-6 grid grid-cols-1 sm:grid-cols-12 gap-3 items-end"
      >
        <div className="sm:col-span-5">
          <label htmlFor="track-order-id" className="block text-xs font-semibold text-[#475467] mb-1">
            Order Number
          </label>
          <input
            id="track-order-id"
            type="text"
            required
            value={orderNumber}
            onChange={(e) => setOrderNumber(e.target.value)}
            placeholder="#TN784512"
            className="w-full rounded-xl border border-[#E5EAF2] bg-[#F4F8FF] px-3.5 py-2.5 font-mono text-sm text-[#101828] focus:border-[#0860E8] focus:bg-white focus:outline-none"
          />
        </div>
        <div className="sm:col-span-5">
          <label htmlFor="track-phone" className="block text-xs font-semibold text-[#475467] mb-1">
            Phone Number {user ? '(Optional when signed in)' : ''}
          </label>
          <input
            id="track-phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+92 300 5551234"
            className="w-full rounded-xl border border-[#E5EAF2] bg-[#F4F8FF] px-3.5 py-2.5 text-sm text-[#101828] focus:border-[#0860E8] focus:bg-white focus:outline-none"
          />
        </div>
        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#0860E8] py-2.5 px-4 text-sm font-semibold text-white hover:bg-[#0650C7] disabled:opacity-60 transition cursor-pointer"
          >
            <Search className="h-4 w-4" />
            <span>{loading ? '...' : 'Track'}</span>
          </button>
        </div>
      </form>

      {error && (
        <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {error}
        </div>
      )}

      {order && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Interactive Timeline (matches mobile Track Your Order reference) */}
          <div className="lg:col-span-7 rounded-3xl border border-[#E5EAF2] bg-white p-6">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#F2F4F7] pb-4">
              <div>
                <p className="font-mono text-xs font-semibold text-[#667085]">
                  Order {order.orderNumber}
                </p>
                <h2 className="font-display text-lg font-bold text-[#101828]">
                  Status: <span className="text-[#0860E8]">{order.status}</span>
                </h2>
              </div>
              <span className="font-mono text-xs text-[#475467] bg-[#F4F8FF] px-3 py-1.5 rounded-lg">
                {order.carrier} · {order.trackingCode}
              </span>
            </div>

            <ol className="mt-6 space-y-6">
              {order.timeline.map((step, idx) => {
                const isLast = idx === order.timeline.length - 1;
                return (
                  <li key={`${step.status}-${idx}`} className="relative flex gap-4">
                    {!isLast && (
                      <span
                        aria-hidden="true"
                        className={`absolute left-4 top-8 h-[calc(100%-8px)] w-0.5 ${
                          step.completed ? 'bg-[#0860E8]' : 'bg-[#E5EAF2]'
                        }`}
                      />
                    )}
                    <div
                      className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 transition ${
                        step.completed
                          ? 'border-[#0860E8] bg-[#0860E8] text-white'
                          : 'border-[#E5EAF2] bg-white text-[#98A2B3]'
                      }`}
                    >
                      {step.completed ? <Check className="h-4 w-4" /> : <span className="h-2 w-2 rounded-full bg-[#CBD5E1]" />}
                    </div>
                    <div className="flex-1 pt-0.5">
                      <p className={`font-display text-sm font-bold ${step.completed ? 'text-[#101828]' : 'text-[#667085]'}`}>
                        {step.label}
                      </p>
                      <p className="text-xs text-[#667085]">
                        {step.timestamp
                          ? formatDateTime(step.timestamp)
                          : step.status === 'Out for Delivery'
                            ? `Expected ${formatShortDate(order.estimatedDelivery)}`
                            : 'Pending'}
                      </p>
                      {step.note && <p className="mt-1 text-xs text-[#475467]">{step.note}</p>}
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>

          {/* Delivery Info, Visual Route Map & Items */}
          <div className="lg:col-span-5 space-y-5">
            <div className="rounded-3xl border border-[#E5EAF2] bg-white p-5 space-y-4">
              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-[#0860E8] mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-[#667085]">Estimated Delivery</p>
                  <p className="font-display text-sm font-bold text-[#101828]">
                    {formatShortDate(order.estimatedDelivery)}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-[#0860E8] mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-[#667085]">Shipping Address</p>
                  <p className="font-display text-sm font-bold text-[#101828]">
                    {order.shippingAddress.fullName}
                  </p>
                  <p className="text-xs text-[#475467]">
                    {order.shippingAddress.streetAddress}, {order.shippingAddress.area},{' '}
                    {order.shippingAddress.city} {order.shippingAddress.postalCode}
                  </p>
                </div>
              </div>

              {/* Clean SVG Courier Route Map */}
              <div className="overflow-hidden rounded-2xl border border-[#E5EAF2] bg-[#EAF2FF] p-3">
                <svg viewBox="0 0 320 120" className="w-full h-28" aria-label="Courier delivery route illustration">
                  <rect width="320" height="120" rx="12" fill="#EEF4FF" />
                  <path d="M0 30H320M0 75H320M65 0V120M175 0V120M260 0V120" stroke="#DCE7FA" strokeWidth="2" />
                  <path
                    d="M42 82 C 95 82, 125 40, 178 44 C 220 47, 238 64, 272 56"
                    fill="none"
                    stroke="#0860E8"
                    strokeWidth="3.5"
                    strokeDasharray="6 4"
                    strokeLinecap="round"
                  />
                  <circle cx="42" cy="82" r="7" fill="#061B3D" />
                  <circle cx="178" cy="44" r="10" fill="#0860E8" />
                  <circle cx="272" cy="56" r="8" fill="#16A34A" />
                </svg>
                <div className="mt-2 flex items-center justify-between text-[11px] font-semibold text-[#475467]">
                  <span className="inline-flex items-center gap-1">
                    <Truck className="h-3.5 w-3.5 text-[#0860E8]" /> Dispatch Hub
                  </span>
                  <span>{order.shippingAddress.city}</span>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-[#E5EAF2] bg-white p-5 space-y-3">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-[#0860E8]" />
                <h3 className="font-display text-sm font-bold text-[#101828]">Items in Shipment</h3>
              </div>
              <div className="divide-y divide-[#F2F4F7]">
                {order.items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between gap-3 py-2.5 text-xs">
                    <div className="min-w-0">
                      <p className="font-semibold text-[#101828] truncate">
                        {item.quantity}× {item.productName}
                      </p>
                      <p className="text-[#667085] truncate">{item.variantLabel}</p>
                    </div>
                    <span className="font-mono font-bold text-[#101828] tabular-nums shrink-0">
                      {formatCurrency(item.lineTotal, settings.currency)}
                    </span>
                  </div>
                ))}
              </div>
              <div className="space-y-1.5 border-t border-[#E5EAF2] pt-3 text-xs">
                <div className="flex justify-between text-[#667085]">
                  <span>Subtotal</span>
                  <span className="font-mono tabular-nums">
                    {formatCurrency(order.subtotal, settings.currency)}
                  </span>
                </div>
                {order.discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-600 font-semibold">
                    <span>Discount ({order.couponCode || 'Promo'})</span>
                    <span className="font-mono tabular-nums">
                      -{formatCurrency(order.discountAmount, settings.currency)}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between pt-1.5 text-sm font-bold text-[#101828]">
                  <span>Total ({order.paymentStatus})</span>
                  <span className="tabular-nums">{formatCurrency(order.total, settings.currency)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
