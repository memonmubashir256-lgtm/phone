import React, {useEffect, useMemo, useState} from 'react';
import {
  ArrowLeft,
  Check,
  Cpu,
  Heart,
  HardDrive,
  Minus,
  Plus,
  Share2,
  ShieldCheck,
  Smartphone,
  Star,
  Truck,
  Wifi,
} from 'lucide-react';
import {useStore} from '../context/StoreContext';
import type {Product, Review} from '../types';
import {formatCurrency, formatShortDate} from '../utils/format';
import {ProductCard} from '../components/ProductCard';

export const ProductDetailPage: React.FC<{slug: string}> = ({slug}) => {
  const {products, navigate, addToCart, toggleWishlist, wishlistIds, settings, user, showToast, apiFetch} =
    useStore();

  const cachedProduct = useMemo(
    () => products.find((p) => p.slug === slug || p.id === slug) || null,
    [products, slug]
  );

  const [product, setProduct] = useState<Product | null>(cachedProduct);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [related, setRelated] = useState<Product[]>([]);
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [selectedStorage, setSelectedStorage] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [reviewName, setReviewName] = useState(user?.fullName || '');
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    setActiveImageIdx(0);
    setQuantity(1);
    let cancelled = false;
    (async () => {
      try {
        const res = await apiFetch(`/api/products/${encodeURIComponent(slug)}`);
        if (!res.ok) {
          if (!cancelled && cachedProduct) setProduct(cachedProduct);
          return;
        }
        const data = await res.json();
        if (!cancelled) {
          setProduct(data.product);
          setReviews(data.reviews || []);
          setRelated(data.related || []);
        }
      } catch {
        if (!cancelled && cachedProduct) setProduct(cachedProduct);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug, apiFetch, cachedProduct]);

  useEffect(() => {
    if (product && product.variants.length > 0) {
      setSelectedStorage(product.variants[0].storage);
      setSelectedColor(product.variants[0].colorName);
    }
  }, [product?.id]);

  if (!product) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center">
        <h1 className="font-display text-2xl font-bold text-[#101828]">Product not found</h1>
        <p className="mt-2 text-sm text-[#667085]">This device may have moved or been archived.</p>
        <button
          type="button"
          onClick={() => navigate('/shop')}
          className="mt-5 rounded-xl bg-[#0860E8] px-5 py-2.5 text-sm font-semibold text-white cursor-pointer"
        >
          Back to Shop
        </button>
      </div>
    );
  }

  const storages = Array.from(new Set(product.variants.map((v) => v.storage)));
  const colors = Array.from(
    new Map(product.variants.map((v) => [v.colorName, v.colorHex])).entries()
  );

  const activeVariant =
    product.variants.find(
      (v) => v.storage === selectedStorage && v.colorName === selectedColor
    ) ||
    product.variants.find((v) => v.storage === selectedStorage) ||
    product.variants.find((v) => v.colorName === selectedColor) ||
    product.variants[0];

  const isWishlisted = wishlistIds.includes(product.id);
  const currentPrice = activeVariant ? activeVariant.price : product.price;
  const currentOriginal = activeVariant ? activeVariant.originalPrice : product.originalPrice;
  const currentStock = activeVariant ? activeVariant.stock : 10;

  const handleShare = async () => {
    const shareUrl = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({title: product.name, url: shareUrl});
        return;
      } catch {
        // fallback to clipboard
      }
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
      showToast('Product link copied to clipboard.', 'info');
    } catch {
      showToast('Share link ready in browser address bar.', 'info');
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingReview(true);
    try {
      const res = await apiFetch(`/api/products/${product.id}/reviews`, {
        method: 'POST',
        body: JSON.stringify({
          authorName: user?.fullName || reviewName,
          rating: reviewRating,
          comment: reviewComment,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Could not post review.', 'error');
        return;
      }
      setReviews((prev) => [data.review, ...prev]);
      setProduct((prev) =>
        prev ? {...prev, rating: data.rating, reviewCount: data.reviewCount} : prev
      );
      setReviewComment('');
      showToast('Thank you for reviewing this product!');
    } finally {
      setSubmittingReview(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-5 sm:py-8 pb-24">
      {/* Top Action Row */}
      <div className="flex items-center justify-between mb-5">
        <button
          type="button"
          onClick={() => navigate('/shop')}
          className="inline-flex items-center gap-2 rounded-xl border border-[#E5EAF2] bg-white px-3.5 py-2 text-xs sm:text-sm font-semibold text-[#101828] hover:bg-[#F4F8FF] transition cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Shop</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void toggleWishlist(product.id)}
            aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
            className={`flex h-10 w-10 items-center justify-center rounded-xl border transition cursor-pointer ${
              isWishlisted
                ? 'border-rose-200 bg-rose-50 text-rose-500'
                : 'border-[#E5EAF2] bg-white text-[#475467] hover:text-rose-500'
            }`}
          >
            <Heart className={`h-4 w-4 ${isWishlisted ? 'fill-current' : ''}`} />
          </button>
          <button
            type="button"
            onClick={() => void handleShare()}
            aria-label="Share product"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#E5EAF2] bg-white text-[#475467] hover:text-[#0860E8] transition cursor-pointer"
          >
            <Share2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Main Product Module */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10">
        {/* Left: Gallery + Thumbnails */}
        <div className="lg:col-span-6 flex flex-col-reverse sm:flex-row gap-3">
          {product.images.length > 1 && (
            <div className="flex sm:flex-col gap-2.5 overflow-x-auto sm:w-20 shrink-0">
              {product.images.map((img, idx) => (
                <button
                  key={`${img}-${idx}`}
                  type="button"
                  onClick={() => setActiveImageIdx(idx)}
                  aria-label={`View image ${idx + 1}`}
                  className={`h-16 w-16 sm:h-20 sm:w-20 shrink-0 overflow-hidden rounded-xl border-2 bg-white transition cursor-pointer ${
                    idx === activeImageIdx ? 'border-[#0860E8]' : 'border-[#E5EAF2] opacity-75 hover:opacity-100'
                  }`}
                >
                  <img src={img} alt={`${product.name} thumbnail ${idx + 1}`} className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}

          <div className="relative flex-1 overflow-hidden rounded-3xl border border-[#E5EAF2] bg-white p-4 sm:p-6">
            <img
              src={product.images[activeImageIdx] || product.images[0]}
              alt={product.name}
              referrerPolicy="no-referrer"
              className="aspect-[4/3] w-full rounded-2xl object-cover bg-[#F7F9FC]"
            />
          </div>
        </div>

        {/* Right: Contiguous Purchase Module */}
        <div className="lg:col-span-6 rounded-3xl border border-[#E5EAF2] bg-white p-5 sm:p-7 space-y-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[#0860E8]">
              {product.brandName} · {product.categoryName}
            </p>
            <h1 className="mt-1 font-display text-2xl sm:text-3xl font-extrabold text-[#101828]">
              {product.name}
            </h1>
            <p className="mt-0.5 text-sm text-[#667085]">
              {activeVariant ? `${activeVariant.storage} · ${activeVariant.colorName}` : product.shortSpec}
            </p>

            <div className="mt-2.5 flex items-center gap-2 text-sm">
              <div className="flex items-center gap-0.5 text-amber-400">
                {[1, 2, 3, 4, 5].map((n) => (
                  <Star
                    key={n}
                    className={`h-4 w-4 ${n <= Math.round(product.rating) ? 'fill-current' : 'text-slate-200'}`}
                  />
                ))}
              </div>
              <span className="font-semibold text-[#101828] tabular-nums">{product.rating.toFixed(1)}</span>
              <span className="text-[#667085] tabular-nums">({product.reviewCount} reviews)</span>
            </div>
          </div>

          <div className="flex items-baseline gap-3 border-y border-[#F2F4F7] py-4">
            <span
              data-testid="pdp-price"
              className="font-display text-2xl sm:text-3xl font-extrabold text-[#101828] tabular-nums"
            >
              {formatCurrency(currentPrice, settings.currency)}
            </span>
            {currentOriginal > currentPrice && (
              <>
                <span className="text-sm text-[#98A2B3] line-through tabular-nums">
                  {formatCurrency(currentOriginal, settings.currency)}
                </span>
                <span className="rounded-lg bg-rose-50 px-2 py-0.5 text-xs font-bold text-rose-600">
                  Save {Math.round(((currentOriginal - currentPrice) / currentOriginal) * 100)}%
                </span>
              </>
            )}
          </div>

          <p className="text-sm text-[#475467] leading-relaxed">{product.description}</p>

          {/* 4 Quick Specs Tiles (matching mobile PDP reference) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {[
              {icon: Smartphone, label: 'Display', value: product.displaySpec},
              {icon: HardDrive, label: 'Storage', value: activeVariant?.storage || '256GB'},
              {icon: Cpu, label: 'Processor', value: product.chipSpec},
              {icon: Wifi, label: 'Network', value: product.connectivitySpec},
            ].map((spec) => {
              const Icon = spec.icon;
              return (
                <div key={spec.label} className="rounded-xl bg-[#F4F8FF] p-3 text-center">
                  <Icon className="mx-auto h-4 w-4 text-[#0860E8]" aria-hidden="true" />
                  <p className="mt-1.5 font-display text-xs font-bold text-[#101828] truncate">
                    {spec.value}
                  </p>
                  <p className="text-[11px] text-[#667085]">{spec.label}</p>
                </div>
              );
            })}
          </div>

          {/* Storage Selector */}
          {storages.length > 0 && (
            <div>
              <span className="block text-xs font-bold uppercase tracking-wider text-[#475467]">
                Storage Capacity
              </span>
              <div className="mt-2 flex flex-wrap gap-2">
                {storages.map((storage) => (
                  <button
                    key={storage}
                    type="button"
                    onClick={() => setSelectedStorage(storage)}
                    className={`rounded-xl border px-4 py-2 text-xs sm:text-sm font-semibold transition cursor-pointer ${
                      (activeVariant?.storage || selectedStorage) === storage
                        ? 'border-[#0860E8] bg-[#EEF4FF] text-[#0860E8]'
                        : 'border-[#E5EAF2] bg-white text-[#101828] hover:border-[#0860E8]/40'
                    }`}
                  >
                    {storage}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Color Selector */}
          {colors.length > 0 && (
            <div>
              <span className="block text-xs font-bold uppercase tracking-wider text-[#475467]">
                Color: <strong className="text-[#101828]">{activeVariant?.colorName || selectedColor}</strong>
              </span>
              <div className="mt-2 flex flex-wrap items-center gap-2.5">
                {colors.map(([colorName, colorHex]) => {
                  const isSelected = (activeVariant?.colorName || selectedColor) === colorName;
                  return (
                    <button
                      key={colorName}
                      type="button"
                      onClick={() => setSelectedColor(colorName)}
                      aria-label={`Select color ${colorName}`}
                      title={colorName}
                      className={`flex h-9 w-9 items-center justify-center rounded-full border-2 transition cursor-pointer ${
                        isSelected ? 'border-[#0860E8] scale-110' : 'border-[#E5EAF2]'
                      }`}
                    >
                      <span
                        className="h-6 w-6 rounded-full border border-black/10"
                        style={{backgroundColor: colorHex}}
                      />
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Quantity + Add to Cart + Buy Now */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-[#475467]">
                Availability:{' '}
                <strong className={currentStock > 0 ? 'text-emerald-600' : 'text-rose-600'}>
                  {currentStock > 0 ? `In Stock (${currentStock} ready)` : 'Out of Stock'}
                </strong>
              </span>
              {activeVariant && (
                <span className="font-mono text-[#667085]">SKU: {activeVariant.sku}</span>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="inline-flex items-center justify-between rounded-xl border border-[#E5EAF2] bg-[#F4F8FF] px-2 py-1.5 sm:w-36">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  aria-label="Decrease quantity"
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-[#101828] shadow-xs hover:text-[#0860E8] cursor-pointer"
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <span className="font-mono text-sm font-bold text-[#101828] tabular-nums">{quantity}</span>
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.min(Math.max(1, currentStock), q + 1))}
                  aria-label="Increase quantity"
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-[#101828] shadow-xs hover:text-[#0860E8] cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>

              <button
                type="button"
                disabled={currentStock <= 0}
                onClick={() => addToCart(product, activeVariant, quantity)}
                className="flex-1 rounded-xl bg-[#0860E8] px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-[#0650C7] disabled:bg-slate-200 disabled:text-slate-400 transition cursor-pointer"
              >
                Add to Cart
              </button>

              <button
                type="button"
                disabled={currentStock <= 0}
                onClick={() => {
                  addToCart(product, activeVariant, quantity);
                  navigate('/checkout');
                }}
                className="rounded-xl border border-[#061B3D] bg-[#061B3D] px-5 py-3 text-sm font-semibold text-white hover:bg-[#092759] disabled:opacity-50 transition cursor-pointer"
              >
                Buy Now
              </button>
            </div>
          </div>

          {/* Delivery Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-2xl bg-[#F4F8FF] p-4 text-xs text-[#475467]">
            <div className="flex items-start gap-2.5">
              <Truck className="h-4 w-4 shrink-0 text-[#0860E8] mt-0.5" />
              <div>
                <p className="font-semibold text-[#101828]">Express Nationwide Delivery</p>
                <p>Free shipping over {formatCurrency(settings.freeShippingThreshold, settings.currency)}</p>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <ShieldCheck className="h-4 w-4 shrink-0 text-[#0860E8] mt-0.5" />
              <div>
                <p className="font-semibold text-[#101828]">Official Warranty & 30-Day Returns</p>
                <p>Sealed retail box with PTA & brand verification</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Full Technical Specifications & Customer Reviews */}
      <div className="mt-10 grid grid-cols-1 lg:grid-cols-12 gap-6">
        <section className="lg:col-span-5 rounded-3xl border border-[#E5EAF2] bg-white p-6">
          <h2 className="font-display text-lg font-bold text-[#101828]">Technical Specifications</h2>
          <dl className="mt-4 divide-y divide-[#F2F4F7] text-sm">
            {[
              ['Display', product.displaySpec],
              ['Processor', product.chipSpec],
              ['Camera System', product.cameraSpec],
              ['Battery & Charging', product.batterySpec],
              ['Connectivity', product.connectivitySpec],
              ['Warranty', '12 Months Official Manufacturer Warranty'],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between gap-4 py-3">
                <dt className="text-[#667085]">{label}</dt>
                <dd className="font-semibold text-[#101828] text-right">{value}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="lg:col-span-7 rounded-3xl border border-[#E5EAF2] bg-white p-6">
          <h2 className="font-display text-lg font-bold text-[#101828]">
            Customer Reviews ({reviews.length})
          </h2>

          <form onSubmit={handleSubmitReview} className="mt-4 rounded-2xl bg-[#F4F8FF] p-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                required
                value={user?.fullName || reviewName}
                disabled={Boolean(user)}
                onChange={(e) => setReviewName(e.target.value)}
                placeholder="Your name"
                className="rounded-xl border border-[#E5EAF2] bg-white px-3.5 py-2 text-sm text-[#101828] focus:border-[#0860E8] focus:outline-none"
              />
              <select
                value={reviewRating}
                onChange={(e) => setReviewRating(Number(e.target.value))}
                aria-label="Rating"
                className="rounded-xl border border-[#E5EAF2] bg-white px-3.5 py-2 text-sm text-[#101828] focus:border-[#0860E8] focus:outline-none"
              >
                {[5, 4, 3, 2, 1].map((n) => (
                  <option key={n} value={n}>
                    {n} Stars
                  </option>
                ))}
              </select>
            </div>
            <textarea
              required
              rows={2}
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
              placeholder="Share your experience with this smartphone..."
              className="w-full rounded-xl border border-[#E5EAF2] bg-white px-3.5 py-2 text-sm text-[#101828] focus:border-[#0860E8] focus:outline-none"
            />
            <button
              type="submit"
              disabled={submittingReview}
              className="rounded-xl bg-[#0860E8] px-4 py-2 text-xs font-semibold text-white hover:bg-[#0650C7] disabled:opacity-60 cursor-pointer"
            >
              {submittingReview ? 'Submitting...' : 'Post Review'}
            </button>
          </form>

          <div className="mt-5 divide-y divide-[#F2F4F7]">
            {reviews.length === 0 ? (
              <p className="py-4 text-sm text-[#667085]">Be the first to review {product.name}.</p>
            ) : (
              reviews.map((rev) => (
                <div key={rev.id} className="py-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-display text-sm font-bold text-[#101828]">{rev.authorName}</span>
                      {rev.verifiedPurchase && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                          <Check className="h-3 w-3" /> Verified Buyer
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-[#667085]">{formatShortDate(rev.createdAt)}</span>
                  </div>
                  <div className="mt-1 flex items-center gap-0.5 text-amber-400">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Star
                        key={n}
                        className={`h-3.5 w-3.5 ${n <= rev.rating ? 'fill-current' : 'text-slate-200'}`}
                      />
                    ))}
                  </div>
                  <p className="mt-1.5 text-sm text-[#475467]">{rev.comment}</p>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      {/* Related Products */}
      {related.length > 0 && (
        <section className="mt-12">
          <h2 className="font-display text-xl font-bold text-[#101828] mb-5">Related Devices</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-5">
            {related.map((item) => (
              <ProductCard key={item.id} product={item} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
