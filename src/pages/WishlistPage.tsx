import React, {useMemo} from 'react';
import {Heart, ShoppingCart, Trash2} from 'lucide-react';
import {useStore} from '../context/StoreContext';
import {formatCurrency} from '../utils/format';

export const WishlistPage: React.FC = () => {
  const {products, wishlistIds, toggleWishlist, addToCart, navigate, settings} = useStore();

  const savedProducts = useMemo(
    () => products.filter((p) => wishlistIds.includes(p.id)),
    [products, wishlistIds]
  );

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-6 sm:py-10 pb-24">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#101828]">
            Saved Wishlist ({savedProducts.length})
          </h1>
          <p className="mt-1 text-sm text-[#667085]">
            Keep track of your favorite smartphones and move them to cart anytime.
          </p>
        </div>
      </div>

      {savedProducts.length === 0 ? (
        <div className="rounded-3xl border border-[#E5EAF2] bg-white p-10 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#EEF4FF] text-[#0860E8]">
            <Heart className="h-7 w-7" />
          </div>
          <h2 className="mt-4 font-display text-xl font-bold text-[#101828]">No saved items yet</h2>
          <p className="mt-1 text-sm text-[#667085]">
            Tap the heart icon on any smartphone to save it here.
          </p>
          <button
            type="button"
            onClick={() => navigate('/shop')}
            className="mt-5 rounded-xl bg-[#0860E8] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#0650C7] cursor-pointer"
          >
            Explore Smartphones
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {savedProducts.map((product) => (
            <div
              key={product.id}
              className="flex flex-col rounded-2xl border border-[#E5EAF2] bg-white p-4 shadow-xs"
            >
              <button
                type="button"
                onClick={() => navigate(`/product/${product.slug}`)}
                className="aspect-[4/3] w-full overflow-hidden rounded-xl bg-[#F7F9FC] cursor-pointer"
              >
                <img
                  src={product.images[0]}
                  alt={product.name}
                  className="h-full w-full object-cover"
                />
              </button>
              <div className="mt-3.5 flex-1">
                <h3 className="font-display text-base font-bold text-[#101828]">{product.name}</h3>
                <p className="text-xs text-[#667085]">{product.shortSpec}</p>
                <p className="mt-2 font-display text-lg font-bold text-[#0860E8] tabular-nums">
                  {formatCurrency(product.price, settings.currency)}
                </p>
              </div>
              <div className="mt-4 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => addToCart(product, product.variants[0], 1)}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#0860E8] py-2.5 text-xs font-semibold text-white hover:bg-[#0650C7] cursor-pointer"
                >
                  <ShoppingCart className="h-3.5 w-3.5" /> Move to Cart
                </button>
                <button
                  type="button"
                  onClick={() => void toggleWishlist(product.id)}
                  aria-label={`Remove ${product.name} from wishlist`}
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#E5EAF2] text-[#667085] hover:bg-rose-50 hover:text-rose-600 cursor-pointer"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
