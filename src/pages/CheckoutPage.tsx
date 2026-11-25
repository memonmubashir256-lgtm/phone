import React, {useEffect, useMemo, useState} from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Banknote,
  Building2,
  CreditCard,
  Lock,
  Smartphone,
  Truck,
} from 'lucide-react';
import {useStore} from '../context/StoreContext';
import type {PaymentMethod, ShippingAddress} from '../types';
import {formatCurrency, formatShortDate} from '../utils/format';
import {useNotifications} from '../hooks/useNotifications';

export const CheckoutPage: React.FC = () => {
  const {
    cart,
    products,
    settings,
    user,
    appliedCouponCode,
    clearCart,
    setLastConfirmedOrder,
    lastConfirmedOrder,
    navigate,
    showToast,
    apiFetch,
  } = useStore();
  const {notify} = useNotifications();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [address, setAddress] = useState<ShippingAddress>({
    fullName: user?.fullName || '',
    email: user?.email || '',
    phone: user?.phone || '',
    country: 'Pakistan',
    city: 'Karachi',
    area: '',
    streetAddress: '',
    postalCode: '',
  });
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Credit / Debit Card');
  const [cardInput, setCardInput] = useState({number: '', expiry: '', cvv: ''});
  const [mobileAccount, setMobileAccount] = useState('');
  const [bankRef, setBankRef] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [quote, setQuote] = useState<{
    subtotal: number;
    shippingCost: number;
    discountAmount: number;
    total: number;
  }>({subtotal: 0, shippingCost: 0, discountAmount: 0, total: 0});

  const resolvedCart = useMemo(() => {
    return cart
      .map((line) => {
        const product = products.find((p) => p.id === line.productId);
        const variant = product?.variants.find((v) => v.id === line.variantId) || product?.variants[0];
        if (!product || !variant) return null;
        return {line, product, variant};
      })
      .filter((x): x is NonNullable<typeof x> => Boolean(x));
  }, [cart, products]);

  useEffect(() => {
    if (user) {
      setAddress((prev) => ({
        ...prev,
        fullName: prev.fullName || user.fullName,
        email: prev.email || user.email,
        phone: prev.phone || user.phone,
      }));
    }
  }, [user]);

  useEffect(() => {
    if (resolvedCart.length === 0) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await apiFetch('/api/cart/quote', {
          method: 'POST',
          body: JSON.stringify({
            items: resolvedCart.map((r) => ({
              productId: r.product.id,
              variantId: r.variant.id,
              quantity: r.line.quantity,
            })),
            couponCode: appliedCouponCode,
          }),
        });
        const data = await res.json();
        if (!cancelled && data.summary) setQuote(data.summary);
      } catch {
        // ignore offline fallback
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [resolvedCart, appliedCouponCode, apiFetch]);

  const handleStep1Submit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (
      !address.fullName.trim() ||
      !address.email.trim() ||
      !address.phone.trim() ||
      !address.city.trim() ||
      !address.area.trim() ||
      !address.streetAddress.trim() ||
      !address.postalCode.trim()
    ) {
      setErrorMsg('Please complete all required shipping address fields.');
      return;
    }
    setStep(2);
    window.scrollTo({top: 0, behavior: 'smooth'});
  };

  const handleConfirmOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    let paymentReference = '';
    if (paymentMethod === 'Credit / Debit Card') {
      const digits = cardInput.number.replace(/\D/g, '');
      if (digits.length < 12 || !cardInput.expiry.trim() || cardInput.cvv.trim().length < 3) {
        setErrorMsg('Please enter valid demo card details (card number, expiry, and CVV).');
        return;
      }
      paymentReference = digits.slice(-4);
    } else if (paymentMethod === 'JazzCash' || paymentMethod === 'Easypaisa') {
      const digits = mobileAccount.replace(/\D/g, '');
      if (digits.length < 10) {
        setErrorMsg(`Please enter your ${paymentMethod} mobile wallet number.`);
        return;
      }
      paymentReference = digits.slice(-4);
    } else if (paymentMethod === 'Bank Transfer') {
      paymentReference = bankRef.trim() || 'PENDING';
    }

    setSubmitting(true);
    try {
      const res = await apiFetch('/api/orders', {
        method: 'POST',
        body: JSON.stringify({
          items: resolvedCart.map((r) => ({
            productId: r.product.id,
            variantId: r.variant.id,
            quantity: r.line.quantity,
          })),
          shippingAddress: address,
          paymentMethod,
          paymentReference,
          couponCode: appliedCouponCode,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Unable to place order.');
        showToast(data.error || 'Unable to place order.', 'error');
        return;
      }

      setLastConfirmedOrder(data.order);
      clearCart();
      // Clear temporary card state from memory immediately
      setCardInput({number: '', expiry: '', cvv: ''});
      setStep(3);
      notify(
        `Order ${data.order.orderNumber} Confirmed`,
        `Estimated delivery by ${formatShortDate(data.order.estimatedDelivery)}.`
      );
      window.scrollTo({top: 0, behavior: 'smooth'});
    } finally {
      setSubmitting(false);
    }
  };

  if (step !== 3 && resolvedCart.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="font-display text-2xl font-bold text-[#101828]">Your cart is empty</h1>
        <p className="mt-2 text-sm text-[#667085]">Add a smartphone to your bag before checking out.</p>
        <button
          type="button"
          onClick={() => navigate('/shop')}
          className="mt-5 rounded-xl bg-[#0860E8] px-6 py-3 text-sm font-semibold text-white cursor-pointer"
        >
          Shop Smartphones
        </button>
      </div>
    );
  }

  // Step 3: Order Confirmation Screen
  if (step === 3 && lastConfirmedOrder) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8 sm:py-12 pb-24">
        <div className="rounded-3xl border border-[#E5EAF2] bg-white p-6 sm:p-10 text-center shadow-sm animate-tn-pop">
          <div className="relative mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#0860E8] text-white shadow-lg shadow-[#0860E8]/30">
            <span className="absolute inset-0 rounded-full bg-[#0860E8]/30 animate-tn-ring" />
            <svg className="h-10 w-10 relative" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>

          <h1 className="mt-6 font-display text-2xl sm:text-3xl font-extrabold text-[#101828]">
            Order Placed Successfully!
          </h1>
          <p className="mt-2 text-sm text-[#667085]">
            Thank you for your order, <strong className="text-[#101828]">{lastConfirmedOrder.customerName}</strong>.
          </p>
          <p className="mt-1 text-sm text-[#667085]">
            Your order number is{' '}
            <span data-testid="confirmed-order-number" className="font-mono font-bold text-[#0860E8]">
              {lastConfirmedOrder.orderNumber}
            </span>
          </p>

          <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
            <button
              type="button"
              onClick={() =>
                navigate(
                  `/tracking?order=${encodeURIComponent(lastConfirmedOrder.orderNumber)}&phone=${encodeURIComponent(lastConfirmedOrder.customerPhone)}`
                )
              }
              className="rounded-xl bg-[#0860E8] px-6 py-3 text-sm font-semibold text-white hover:bg-[#0650C7] transition cursor-pointer"
            >
              View Order Details
            </button>
            <button
              type="button"
              onClick={() => navigate('/shop')}
              className="rounded-xl border border-[#E5EAF2] bg-[#F4F8FF] px-6 py-3 text-sm font-semibold text-[#101828] hover:bg-[#E8F0FF] transition cursor-pointer"
            >
              Continue Shopping
            </button>
          </div>

          {/* Receipt Breakdown */}
          <div className="mt-8 rounded-2xl border border-[#E5EAF2] bg-[#F4F8FF] p-5 text-left space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <p className="text-[#667085]">Shipping Address</p>
                <p className="mt-0.5 font-semibold text-[#101828]">
                  {lastConfirmedOrder.shippingAddress.streetAddress},{' '}
                  {lastConfirmedOrder.shippingAddress.area}, {lastConfirmedOrder.shippingAddress.city}
                </p>
              </div>
              <div>
                <p className="text-[#667085]">Payment & Estimate</p>
                <p className="mt-0.5 font-semibold text-[#101828]">
                  {lastConfirmedOrder.paymentMethod} ({lastConfirmedOrder.paymentStatus})
                </p>
                <p className="text-[#0860E8] font-medium">
                  Estimated Delivery: {formatShortDate(lastConfirmedOrder.estimatedDelivery)}
                </p>
              </div>
            </div>

            <div className="divide-y divide-[#E5EAF2] border-t border-[#E5EAF2] pt-3">
              {lastConfirmedOrder.items.map((item) => (
                <div key={item.id} className="flex items-center justify-between py-2 text-xs">
                  <span className="font-semibold text-[#101828]">
                    {item.quantity}x {item.productName} ({item.variantLabel})
                  </span>
                  <span className="font-mono font-bold text-[#101828] tabular-nums">
                    {formatCurrency(item.lineTotal, settings.currency)}
                  </span>
                </div>
              ))}
            </div>

            <div className="space-y-1.5 border-t border-[#E5EAF2] pt-3 text-xs">
              <div className="flex justify-between text-[#667085]">
                <span>Subtotal</span>
                <span className="font-mono tabular-nums">
                  {formatCurrency(lastConfirmedOrder.subtotal, settings.currency)}
                </span>
              </div>
              <div className="flex justify-between text-[#667085]">
                <span>Shipping</span>
                <span className="font-mono tabular-nums">
                  {lastConfirmedOrder.shippingCost === 0
                    ? 'Free'
                    : formatCurrency(lastConfirmedOrder.shippingCost, settings.currency)}
                </span>
              </div>
              {lastConfirmedOrder.discountAmount > 0 && (
                <div className="flex justify-between text-emerald-600 font-semibold">
                  <span>Discount ({lastConfirmedOrder.couponCode || 'Promo'})</span>
                  <span className="font-mono tabular-nums">
                    -{formatCurrency(lastConfirmedOrder.discountAmount, settings.currency)}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between border-t border-[#E5EAF2] pt-2 text-sm font-bold text-[#101828]">
                <span>Order Total</span>
                <span className="font-display text-base tabular-nums">
                  {formatCurrency(lastConfirmedOrder.total, settings.currency)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const enabledMethods = (Object.keys(settings.paymentMethodsEnabled) as PaymentMethod[]).filter(
    (m) => settings.paymentMethodsEnabled[m]
  );

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-6 sm:py-10 pb-24">
      <div className="flex items-center gap-3 mb-6">
        <button
          type="button"
          onClick={() => (step === 2 ? setStep(1) : navigate('/cart'))}
          aria-label="Go back"
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#E5EAF2] bg-white text-[#101828] cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <h1 className="font-display text-2xl font-bold text-[#101828]">Checkout</h1>
          <div className="mt-1 flex items-center gap-3 text-xs font-semibold">
            <span className={step >= 1 ? 'text-[#0860E8]' : 'text-[#98A2B3]'}>1. Shipping</span>
            <span className="text-[#CBD5E1]">/</span>
            <span className={step >= 2 ? 'text-[#0860E8]' : 'text-[#98A2B3]'}>2. Payment</span>
            <span className="text-[#CBD5E1]">/</span>
            <span className="text-[#98A2B3]">3. Confirmation</span>
          </div>
        </div>
      </div>

      {errorMsg && (
        <div role="alert" className="mb-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {errorMsg}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Step 1 or Step 2 Form */}
        <div className="lg:col-span-7">
          {step === 1 ? (
            <form onSubmit={handleStep1Submit} className="rounded-3xl border border-[#E5EAF2] bg-white p-5 sm:p-7 space-y-4">
              <h2 className="font-display text-lg font-bold text-[#101828]">Shipping Address</h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="ship-name" className="block text-xs font-semibold text-[#475467] mb-1">
                    Full Name *
                  </label>
                  <input
                    id="ship-name"
                    type="text"
                    required
                    value={address.fullName}
                    onChange={(e) => setAddress({...address, fullName: e.target.value})}
                    placeholder="Sarah Ahmed"
                    className="w-full rounded-xl border border-[#E5EAF2] bg-[#F4F8FF] px-3.5 py-2.5 text-sm text-[#101828] focus:border-[#0860E8] focus:bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="ship-email" className="block text-xs font-semibold text-[#475467] mb-1">
                    Email *
                  </label>
                  <input
                    id="ship-email"
                    type="email"
                    required
                    value={address.email}
                    onChange={(e) => setAddress({...address, email: e.target.value})}
                    placeholder="sarah@example.com"
                    className="w-full rounded-xl border border-[#E5EAF2] bg-[#F4F8FF] px-3.5 py-2.5 text-sm text-[#101828] focus:border-[#0860E8] focus:bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="ship-phone" className="block text-xs font-semibold text-[#475467] mb-1">
                    Phone Number *
                  </label>
                  <input
                    id="ship-phone"
                    type="tel"
                    required
                    value={address.phone}
                    onChange={(e) => setAddress({...address, phone: e.target.value})}
                    placeholder="+92 300 1234567"
                    className="w-full rounded-xl border border-[#E5EAF2] bg-[#F4F8FF] px-3.5 py-2.5 text-sm text-[#101828] focus:border-[#0860E8] focus:bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="ship-country" className="block text-xs font-semibold text-[#475467] mb-1">
                    Country *
                  </label>
                  <input
                    id="ship-country"
                    type="text"
                    required
                    value={address.country}
                    onChange={(e) => setAddress({...address, country: e.target.value})}
                    className="w-full rounded-xl border border-[#E5EAF2] bg-[#F4F8FF] px-3.5 py-2.5 text-sm text-[#101828] focus:border-[#0860E8] focus:bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="ship-city" className="block text-xs font-semibold text-[#475467] mb-1">
                    City *
                  </label>
                  <input
                    id="ship-city"
                    type="text"
                    required
                    value={address.city}
                    onChange={(e) => setAddress({...address, city: e.target.value})}
                    placeholder="Karachi"
                    className="w-full rounded-xl border border-[#E5EAF2] bg-[#F4F8FF] px-3.5 py-2.5 text-sm text-[#101828] focus:border-[#0860E8] focus:bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="ship-area" className="block text-xs font-semibold text-[#475467] mb-1">
                    Area / Neighborhood *
                  </label>
                  <input
                    id="ship-area"
                    type="text"
                    required
                    value={address.area}
                    onChange={(e) => setAddress({...address, area: e.target.value})}
                    placeholder="Clifton Block 4"
                    className="w-full rounded-xl border border-[#E5EAF2] bg-[#F4F8FF] px-3.5 py-2.5 text-sm text-[#101828] focus:border-[#0860E8] focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="ship-street" className="block text-xs font-semibold text-[#475467] mb-1">
                  Complete Street Address *
                </label>
                <input
                  id="ship-street"
                  type="text"
                  required
                  value={address.streetAddress}
                  onChange={(e) => setAddress({...address, streetAddress: e.target.value})}
                  placeholder="House 12, Street 4, Phase 2"
                  className="w-full rounded-xl border border-[#E5EAF2] bg-[#F4F8FF] px-3.5 py-2.5 text-sm text-[#101828] focus:border-[#0860E8] focus:bg-white focus:outline-none"
                />
              </div>

              <div className="sm:w-1/2">
                <label htmlFor="ship-postal" className="block text-xs font-semibold text-[#475467] mb-1">
                  Postal Code *
                </label>
                <input
                  id="ship-postal"
                  type="text"
                  required
                  value={address.postalCode}
                  onChange={(e) => setAddress({...address, postalCode: e.target.value})}
                  placeholder="75600"
                  className="w-full rounded-xl border border-[#E5EAF2] bg-[#F4F8FF] px-3.5 py-2.5 text-sm text-[#101828] focus:border-[#0860E8] focus:bg-white focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-[#0860E8] py-3.5 text-sm font-semibold text-white hover:bg-[#0650C7] transition cursor-pointer"
              >
                <span>Continue to Payment</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>
          ) : (
            <form onSubmit={handleConfirmOrder} className="rounded-3xl border border-[#E5EAF2] bg-white p-5 sm:p-7 space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-lg font-bold text-[#101828]">Payment Method</h2>
                <span className="text-[11px] font-semibold text-[#0860E8] bg-[#EEF4FF] px-2.5 py-1 rounded-lg">
                  Demo Gateway Mode
                </span>
              </div>

              <div className="space-y-2.5">
                {enabledMethods.map((method) => {
                  const selected = paymentMethod === method;
                  const Icon =
                    method === 'Credit / Debit Card'
                      ? CreditCard
                      : method === 'JazzCash' || method === 'Easypaisa'
                        ? Smartphone
                        : method === 'Bank Transfer'
                          ? Building2
                          : Banknote;
                  return (
                    <label
                      key={method}
                      className={`flex items-center justify-between gap-3 rounded-2xl border p-4 cursor-pointer transition ${
                        selected
                          ? 'border-[#0860E8] bg-[#F4F8FF]'
                          : 'border-[#E5EAF2] bg-white hover:bg-[#F9FBFF]'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="paymentMethod"
                          checked={selected}
                          onChange={() => setPaymentMethod(method)}
                          className="h-4 w-4 accent-[#0860E8]"
                        />
                        <span className="font-display text-sm font-semibold text-[#101828]">{method}</span>
                      </div>
                      <Icon className="h-5 w-5 text-[#0860E8]" aria-hidden="true" />
                    </label>
                  );
                })}
              </div>

              {paymentMethod === 'Credit / Debit Card' && (
                <div className="rounded-2xl border border-[#E5EAF2] bg-[#F4F8FF] p-4 space-y-3">
                  <p className="text-xs text-[#475467]">
                    Sandbox validation only — raw card numbers and CVV are never transmitted to or stored in our database.
                  </p>
                  <div>
                    <label htmlFor="card-num" className="block text-xs font-semibold text-[#475467] mb-1">
                      Card Number
                    </label>
                    <input
                      id="card-num"
                      type="text"
                      inputMode="numeric"
                      value={cardInput.number}
                      onChange={(e) => setCardInput({...cardInput, number: e.target.value})}
                      placeholder="4111 2222 3333 3456"
                      className="w-full rounded-xl border border-[#E5EAF2] bg-white px-3.5 py-2.5 font-mono text-sm text-[#101828] focus:border-[#0860E8] focus:outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="card-exp" className="block text-xs font-semibold text-[#475467] mb-1">
                        Expiry Date
                      </label>
                      <input
                        id="card-exp"
                        type="text"
                        value={cardInput.expiry}
                        onChange={(e) => setCardInput({...cardInput, expiry: e.target.value})}
                        placeholder="04/28"
                        className="w-full rounded-xl border border-[#E5EAF2] bg-white px-3.5 py-2.5 font-mono text-sm text-[#101828] focus:border-[#0860E8] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label htmlFor="card-cvv" className="block text-xs font-semibold text-[#475467] mb-1">
                        CVV
                      </label>
                      <input
                        id="card-cvv"
                        type="password"
                        maxLength={4}
                        value={cardInput.cvv}
                        onChange={(e) => setCardInput({...cardInput, cvv: e.target.value})}
                        placeholder="123"
                        className="w-full rounded-xl border border-[#E5EAF2] bg-white px-3.5 py-2.5 font-mono text-sm text-[#101828] focus:border-[#0860E8] focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {(paymentMethod === 'JazzCash' || paymentMethod === 'Easypaisa') && (
                <div className="rounded-2xl border border-[#E5EAF2] bg-[#F4F8FF] p-4 space-y-2">
                  <label htmlFor="wallet-phone" className="block text-xs font-semibold text-[#475467]">
                    {paymentMethod} Registered Mobile Number
                  </label>
                  <input
                    id="wallet-phone"
                    type="tel"
                    value={mobileAccount}
                    onChange={(e) => setMobileAccount(e.target.value)}
                    placeholder="0300 1234567"
                    className="w-full rounded-xl border border-[#E5EAF2] bg-white px-3.5 py-2.5 font-mono text-sm text-[#101828] focus:border-[#0860E8] focus:outline-none"
                  />
                </div>
              )}

              {paymentMethod === 'Bank Transfer' && (
                <div className="rounded-2xl border border-[#E5EAF2] bg-[#F4F8FF] p-4 space-y-2 text-xs text-[#475467]">
                  <p className="font-semibold text-[#101828]">TechNova Corporate Account</p>
                  <p>IBAN: PK42MEZN0002140104892101 (Meezan Bank)</p>
                  <input
                    type="text"
                    value={bankRef}
                    onChange={(e) => setBankRef(e.target.value)}
                    placeholder="Transaction / IBAN reference (optional)"
                    className="w-full rounded-xl border border-[#E5EAF2] bg-white px-3.5 py-2 text-sm text-[#101828] focus:border-[#0860E8] focus:outline-none"
                  />
                </div>
              )}

              {paymentMethod === 'Cash on Delivery' && (
                <div className="flex items-center gap-3 rounded-2xl border border-[#E5EAF2] bg-[#F4F8FF] p-4 text-xs text-[#475467]">
                  <Truck className="h-5 w-5 text-[#0860E8] shrink-0" />
                  <span>Pay securely in cash to the TechNova Express courier upon delivery inspection.</span>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0860E8] py-3.5 text-sm font-semibold text-white hover:bg-[#0650C7] disabled:opacity-60 transition cursor-pointer"
              >
                <Lock className="h-4 w-4" />
                <span>{submitting ? 'Confirming Order...' : 'Confirm Payment'}</span>
              </button>
              <p className="flex items-center justify-center gap-1.5 text-xs text-[#667085]">
                <Lock className="h-3.5 w-3.5 text-[#0860E8]" />
                Your order totals are verified server-side for complete accuracy.
              </p>
            </form>
          )}
        </div>

        {/* Right: Live Order Summary */}
        <div className="lg:col-span-5">
          <div className="rounded-3xl border border-[#E5EAF2] bg-white p-6 space-y-4 sticky top-20">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-bold text-[#101828]">Order Summary</h2>
              <button
                type="button"
                onClick={() => navigate('/cart')}
                className="text-xs font-semibold text-[#0860E8] hover:underline cursor-pointer"
              >
                Edit
              </button>
            </div>

            <div className="divide-y divide-[#F2F4F7]">
              {resolvedCart.map(({line, product, variant}) => (
                <div key={`${product.id}-${variant.id}`} className="flex items-center gap-3 py-3">
                  <img
                    src={product.images[0]}
                    alt={product.name}
                    className="h-14 w-16 rounded-xl bg-[#F7F9FC] object-cover shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-display text-sm font-semibold text-[#101828] truncate">
                      {product.name}
                    </p>
                    <p className="text-xs text-[#667085]">
                      {variant.storage} · {variant.colorName} × {line.quantity}
                    </p>
                  </div>
                  <span className="font-display text-sm font-bold text-[#101828] tabular-nums">
                    {formatCurrency(variant.price * line.quantity, settings.currency)}
                  </span>
                </div>
              ))}
            </div>

            <dl className="space-y-2 border-t border-[#E5EAF2] pt-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-[#667085]">Subtotal</dt>
                <dd className="font-semibold text-[#101828] tabular-nums">
                  {formatCurrency(quote.subtotal, settings.currency)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[#667085]">Shipping</dt>
                <dd className="font-semibold text-[#101828] tabular-nums">
                  {quote.shippingCost === 0
                    ? 'Free'
                    : formatCurrency(quote.shippingCost, settings.currency)}
                </dd>
              </div>
              {quote.discountAmount > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <dt>Discount ({appliedCouponCode})</dt>
                  <dd className="font-semibold tabular-nums">
                    -{formatCurrency(quote.discountAmount, settings.currency)}
                  </dd>
                </div>
              )}
              <div className="flex justify-between border-t border-[#E5EAF2] pt-3 text-base">
                <dt className="font-display font-bold text-[#101828]">Total</dt>
                <dd className="font-display font-extrabold text-[#101828] tabular-nums">
                  {formatCurrency(quote.total, settings.currency)}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
};
