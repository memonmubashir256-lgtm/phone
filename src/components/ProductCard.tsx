import React, {useState} from 'react';
import {Check, Heart, ShoppingCart, Smartphone, Star} from 'lucide-react';
import type {Product} from '../types';
import {useStore} from '../context/StoreContext';
import {formatCurrency} from '../utils/format';

interface ProductCardProps {
  product: Product;
}

export const ProductCard: React.FC<ProductCardProps> = ({product}) => {
  const {navigate, addToCart, toggleWishlist, wishlistIds, settings} = useStore();
  const [imgError, setImgError] = useState(false);
  const [justAdded, setJustAdded] = useState(false);

  const isWishlisted = wishlistIds.includes(product.id);
  const defaultVariant = product.variants[0];
  const displayPrice = defaultVariant ? defaultVariant.price : product.price;
  const displayOriginal = defaultVariant ? defaultVariant.originalPrice : product.originalPrice;

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    addToCart(product, defaultVariant, 1);
    setJustAdded(true);
    window.setTimeout(() => setJustAdded(false), 1100);
  };

  const handleWishlist = (e: React.MouseEvent) => {
    e.stopPropagation();
    void toggleWishlist(product.id);
  };

  return (
    <article className="group flex flex-col rounded-2xl border border-[#E5EAF2] bg-white p-3.5 sm:p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_34px_rgba(6,27,61,0.08)]">
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-[#F7F9FC]">
        {product.badge && (
          <span
            className={`absolute left-2.5 top-2.5 z-10 rounded-lg px-2 py-0.5 text-[11px] font-semibold tracking-tight ${
              product.badge.startsWith('-')
                ? 'bg-rose-500 text-white'
                : 'bg-[#0860E8] text-white'
            }`}
          >
            {product.badge}
          </span>
        )}
        <button
          type="button"
          onClick={handleWishlist}
          aria-label={isWishlisted ? `Remove ${product.name} from wishlist` : `Save ${product.name} to wishlist`}
          className={`absolute right-2.5 top-2.5 z-10 flex h-8 w-8 items-center justify-center rounded-full border transition cursor-pointer ${
            isWishlisted
              ? 'border-rose-200 bg-rose-50 text-rose-500'
              : 'border-[#E5EAF2] bg-white/90 text-[#667085] hover:text-rose-500'
          }`}
        >
          <Heart className={`h-4 w-4 ${isWishlisted ? 'fill-current' : ''}`} />
        </button>

        <button
          type="button"
          onClick={() => navigate(`/product/${product.slug}`)}
          className="flex h-full w-full items-center justify-center cursor-pointer"
          aria-label={`View ${product.name} details`}
        >
          {!imgError && product.images[0] ? (
            <img
              src={product.images[0]}
              alt={product.name}
              loading="lazy"
              referrerPolicy="no-referrer"
              onError={() => setImgError(true)}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-[#EEF4FF] to-[#E0EAFF] p-4 text-[#0860E8]">
              <Smartphone className="h-10 w-10" />
              <span className="text-xs font-semibold text-[#061B3D]">{product.name}</span>
            </div>
          )}
        </button>
      </div>

      <div className="mt-3.5 flex flex-1 flex-col">
        <button
          type="button"
          onClick={() => navigate(`/product/${product.slug}`)}
          className="text-left cursor-pointer"
        >
          <h3 className="font-display text-sm sm:text-base font-bold text-[#101828] group-hover:text-[#0860E8] transition-colors line-clamp-1">
            {product.name}
          </h3>
          <p className="mt-0.5 text-xs text-[#667085] line-clamp-1">{product.shortSpec}</p>
        </button>

        <div className="mt-2.5 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className="font-display text-sm sm:text-lg font-bold text-[#101828] tabular-nums">
            {formatCurrency(displayPrice, settings.currency)}
          </span>
          {displayOriginal > displayPrice && (
            <span className="text-[11px] sm:text-xs text-[#98A2B3] line-through tabular-nums">
              {formatCurrency(displayOriginal, settings.currency)}
            </span>
          )}
        </div>

        <div className="mt-1.5 flex items-center gap-1.5 text-xs text-[#667085]">
          <div className="flex items-center text-amber-400" aria-hidden="true">
            <Star className="h-3.5 w-3.5 fill-current" />
          </div>
          <span className="font-semibold text-[#101828] tabular-nums">{product.rating.toFixed(1)}</span>
          <span className="tabular-nums">({product.reviewCount})</span>
        </div>

        <button
          type="button"
          onClick={handleAdd}
          disabled={!defaultVariant || defaultVariant.stock <= 0}
          className={`mt-3.5 flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-xs sm:text-sm font-semibold transition-all duration-150 cursor-pointer ${
            justAdded
              ? 'bg-emerald-600 text-white'
              : !defaultVariant || defaultVariant.stock <= 0
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                : 'bg-[#0860E8] text-white hover:bg-[#0650C7] active:scale-[0.98]'
          }`}
        >
          {justAdded ? (
            <>
              <Check className="h-4 w-4" />
              <span>Added</span>
            </>
          ) : !defaultVariant || defaultVariant.stock <= 0 ? (
            <span>Out of Stock</span>
          ) : (
            <>
              <ShoppingCart className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Add to Cart</span>
            </>
          )}
        </button>
      </div>
    </article>
  );
};
