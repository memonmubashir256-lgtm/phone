import React, {useEffect, useMemo, useState} from 'react';
import {ArrowLeft, ArrowRight, Minus, Plus, ShoppingBag, Tag, Trash2} from 'lucide-react';
import {useStore} from '../context/StoreContext';
import {formatCurrency} from '../utils/format';

export const CartPage: React.FC = () => {
  const {
    cart,
    products,
    settings,
    appliedCouponCode,
    setAppliedCouponCode,
    updateCartQuantity,
    removeFromCart,
    navigate,
    showToast,
    apiFetch,
  } = useStore();

  const [promoInput, setPromoInput] = useState(appliedCouponCode);
  const [quote, setQuote] = useState<{
    subtotal: number;
    shippingCost: number;
    discountAmount: number;
    total: number;
    appliedCouponCode?: string;
  } | null>(null);
  const [promoError, setPromoError] = useState('');

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
    if (resolvedCart.length === 0) {
      setQuote({subtotal: 0, shippingCost: 0, discountAmount: 0, total: 0});
      return;
    }
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
        if (!cancelled && data.summary) {
          setQuote(data.summary);
          setPromoError(res.ok ? '' : data.error || '');
        }
      } catch {
        // Offline client fallback preview
        const subtotal = resolvedCart.reduce(
          (sum, r) => sum + r.variant.price * r.line.quantity,
          0
        );
        const shippingCost = subtotal >= settings.freeShippingThreshold ? 0 : settings.standardShippingFee;
        if (!cancelled) {
          setQuote({subtotal, shippingCost, discountAmount: 0, total: subtotal + shippingCost});
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [resolvedCart, appliedCouponCode, apiFetch, settings]);

  const handleApplyPromo = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = promoInput.trim().toUpperCase();
    if (!cleaned) {
      setAppliedCouponCode('');
      setPromoError('');
      return;
    }
    const res = await apiFetch('/api/cart/quote', {
      method: 'POST',
      body: JSON.stringify({
        items: resolvedCart.map((r) => ({
          productId: r.product.id,
          variantId: r.variant.id,
          quantity: r.line.quantity,
        })),
        couponCode: cleaned,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setPromoError(data.error || 'Invalid promo code.');
      showToast(data.error || 'Invalid promo code.', 'error');
      return;
    }
    setPromoError('');
    setAppliedCouponCode(cleaned);
    if (data.summary) setQuote(data.summary);
    showToast(`Promo code ${cleaned} applied!`);
  };

  if (resolvedCart.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 pb-24">
        <div className="rounded-3xl border border-[#E5EAF2] bg-white p-10 text-center shadow-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#EEF4FF] text-[#0860E8]">
            <ShoppingBag className="h-8 w-8" />
          </div>
          <h1 className="mt-5 font-display text-2xl font-bold text-[#101828]">Your Cart is Empty</h1>
          <p className="mt-2 text-sm text-[#667085]">
            Explore flagship smartphones, earbuds, and limited-time deals to fill your bag.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/shop')}
              className="rounded-xl bg-[#0860E8] px-6 py-3 text-sm font-semibold text-white hover:bg-[#0650C7] transition cursor-pointer"
            >
              Browse Smartphones
            </button>
            <button
              type="button"
              onClick={() => navigate('/deals')}
              className="rounded-xl border border-[#E5EAF2] bg-white px-6 py-3 text-sm font-semibold text-[#101828] hover:bg-[#F4F8FF] transition cursor-pointer"
            >
              View Best Deals
            </button>
          </div>
        </div>
      </div>
    );
  }

  const subtotal = quote?.subtotal ?? 0;
  const shippingCost = quote?.shippingCost ?? 0;
  const discountAmount = quote?.discountAmount ?? 0;
  const grandTotal = quote?.total ?? subtotal + shippingCost;

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-6 sm:py-10 pb-24">
      <div className="flex items-center gap-3 mb-6">
        <button
          type="button"
          onClick={() => navigate('/shop')}
          aria-label="Continue shopping"
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#E5EAF2] bg-white text-[#101828] hover:bg-[#F4F8FF] cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <h1 className="font-display text-2xl font-bold text-[#101828]">
          Your Cart ({resolvedCart.reduce((s, r) => s + r.line.quantity, 0)})
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Cart Line Items */}
        <div className="lg:col-span-7 space-y-3.5">
          {resolvedCart.map(({line, product, variant}) => (
            <div
              key={`${product.id}-${variant.id}`}
              className="flex items-center gap-4 rounded-2xl border border-[#E5EAF2] bg-white p-4 shadow-[0_4px_14px_rgba(6,27,61,0.03)]"
            >
              <button
                type="button"
                onClick={() => navigate(`/product/${product.slug}`)}
                className="h-20 w-24 shrink-0 overflow-hidden rounded-xl bg-[#F7F9FC] cursor-pointer"
              >
                <img
                  src={product.images[0]}
                  alt={product.name}
                  className="h-full w-full object-cover"
                />
              </button>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <button
                      type="button"
                      onClick={() => navigate(`/product/${product.slug}`)}
                      className="font-display text-sm sm:text-base font-bold text-[#101828] hover:text-[#0860E8] text-left cursor-pointer"
                    >
                      {product.name}
                    </button>
                    <p className="text-xs text-[#667085]">
                      {variant.storage} · {variant.colorName}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFromCart(product.id, variant.id)}
                    aria-label={`Remove ${product.name}`}
                    className="rounded-lg p-1.5 text-[#98A2B3] hover:bg-rose-50 hover:text-rose-600 transition cursor-pointer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-3 flex items-center justify-between gap-3">
                  <span className="font-display text-sm sm:text-base font-bold text-[#101828] tabular-nums">
                    {formatCurrency(variant.price * line.quantity, settings.currency)}
                  </span>

                  <div className="inline-flex items-center gap-2 rounded-xl border border-[#E5EAF2] bg-[#F4F8FF] p-1">
                    <button
                      type="button"
                      onClick={() =>
                        updateCartQuantity(product.id, variant.id, line.quantity - 1)
                      }
                      disabled={line.quantity <= 1}
                      aria-label={`Decrease quantity for ${product.name}`}
                      className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-[#101828] disabled:opacity-40 cursor-pointer"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="w-6 text-center font-mono text-xs font-bold text-[#101828] tabular-nums">
                      {line.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        updateCartQuantity(product.id, variant.id, line.quantity + 1)
                      }
                      disabled={line.quantity >= variant.stock}
                      aria-label={`Increase quantity for ${product.name}`}
                      className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-[#101828] disabled:opacity-40 cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={() => navigate('/shop')}
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#0860E8] hover:underline pt-1 cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" /> Continue Shopping
          </button>
        </div>

        {/* Summary & Promo Code */}
        <div className="lg:col-span-5">
          <div className="rounded-3xl border border-[#E5EAF2] bg-white p-6 space-y-5 sticky top-20">
            <h2 className="font-display text-lg font-bold text-[#101828]">Order Summary</h2>

            <form onSubmit={handleApplyPromo} className="space-y-2">
              <label htmlFor="promo-code" className="block text-xs font-semibold text-[#475467]">
                Promo Code <span className="text-[#98A2B3]">(Try TECHNOVA10)</span>
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#667085]" />
                  <input
                    id="promo-code"
                    type="text"
                    value={promoInput}
                    onChange={(e) => setPromoInput(e.target.value)}
                    placeholder="Enter code"
                    className="w-full rounded-xl border border-[#E5EAF2] bg-[#F4F8FF] py-2.5 pl-9 pr-3 text-sm uppercase text-[#101828] focus:border-[#0860E8] focus:bg-white focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  className="rounded-xl bg-[#061B3D] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#092759] transition cursor-pointer"
                >
                  Apply
                </button>
              </div>
              {promoError && <p className="text-xs font-medium text-rose-600">{promoError}</p>}
              {quote?.appliedCouponCode && (
                <div className="flex items-center justify-between rounded-xl bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                  <span>
                    Code <strong>{quote.appliedCouponCode}</strong> applied
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setPromoInput('');
                      setAppliedCouponCode('');
                    }}
                    className="font-semibold underline cursor-pointer"
                  >
                    Remove
                  </button>
                </div>
              )}
            </form>

            <dl className="space-y-2.5 border-t border-[#F2F4F7] pt-4 text-sm">
              <div className="flex justify-between">
                <dt className="text-[#667085]">Subtotal</dt>
                <dd className="font-semibold text-[#101828] tabular-nums">
                  {formatCurrency(subtotal, settings.currency)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[#667085]">Shipping</dt>
                <dd className="font-semibold text-[#101828] tabular-nums">
                  {shippingCost === 0 ? 'Free' : formatCurrency(shippingCost, settings.currency)}
                </dd>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <dt>Discount</dt>
                  <dd className="font-semibold tabular-nums">
                    -{formatCurrency(discountAmount, settings.currency)}
                  </dd>
                </div>
              )}
              <div className="flex justify-between border-t border-[#E5EAF2] pt-3 text-base">
                <dt className="font-display font-bold text-[#101828]">Total</dt>
                <dd
                  data-testid="cart-total"
                  className="font-display font-extrabold text-[#101828] tabular-nums"
                >
                  {formatCurrency(grandTotal, settings.currency)}
                </dd>
              </div>
            </dl>

            <button
              type="button"
              onClick={() => navigate('/checkout')}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0860E8] py-3.5 text-sm font-semibold text-white shadow-sm hover:bg-[#0650C7] transition cursor-pointer"
            >
              <span>Proceed to Checkout</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
