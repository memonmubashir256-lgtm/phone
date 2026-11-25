import React, {useEffect, useMemo, useRef, useState} from 'react';
import {ArrowRight, Search, X} from 'lucide-react';
import {useStore} from '../context/StoreContext';
import {formatCurrency} from '../utils/format';

export const SearchDrawer: React.FC = () => {
  const {searchOpen, setSearchOpen, products, navigate, settings} = useStore();
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (searchOpen) {
      window.setTimeout(() => inputRef.current?.focus(), 60);
    }
  }, [searchOpen]);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products.slice(0, 5);
    return products
      .filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.brandName.toLowerCase().includes(q) ||
          p.shortSpec.toLowerCase().includes(q) ||
          p.categoryName.toLowerCase().includes(q)
      )
      .slice(0, 6);
  }, [query, products]);

  if (!searchOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchOpen(false);
    navigate(`/shop?q=${encodeURIComponent(query.trim())}`);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-[#061B3D]/55 p-4 pt-16 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Search TechNova catalog"
      onClick={() => setSearchOpen(false)}
    >
      <div
        className="w-full max-w-2xl rounded-2xl border border-[#E5EAF2] bg-white p-4 sm:p-5 shadow-2xl animate-tn-pop"
        onClick={(e) => e.stopPropagation()}
      >
        <form onSubmit={handleSubmit} className="flex items-center gap-3 border-b border-[#E5EAF2] pb-3">
          <Search className="h-5 w-5 text-[#0860E8] shrink-0" />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search smartphones, brands, AirPods, or specs..."
            className="w-full bg-transparent text-sm sm:text-base text-[#101828] placeholder:text-[#98A2B3] focus:outline-none"
          />
          <button
            type="button"
            onClick={() => setSearchOpen(false)}
            aria-label="Close search"
            className="rounded-lg p-1.5 text-[#667085] hover:bg-[#F4F8FF] hover:text-[#101828] cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </form>

        <div className="mt-3 divide-y divide-[#F2F4F7]">
          {matches.length === 0 ? (
            <div className="py-8 text-center text-sm text-[#667085]">
              No products matched "{query}". Try searching Apple, Samsung, Pixel, or OnePlus.
            </div>
          ) : (
            matches.map((product) => (
              <button
                key={product.id}
                type="button"
                onClick={() => {
                  setSearchOpen(false);
                  navigate(`/product/${product.slug}`);
                }}
                className="flex w-full items-center justify-between gap-3 py-2.5 px-2 rounded-xl text-left hover:bg-[#F4F8FF] transition cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={product.images[0]}
                    alt={product.name}
                    className="h-12 w-14 rounded-lg bg-[#F7F9FC] object-cover shrink-0"
                  />
                  <div className="min-w-0">
                    <p className="font-display text-sm font-semibold text-[#101828] truncate">
                      {product.name}
                    </p>
                    <p className="text-xs text-[#667085] truncate">
                      {product.brandName} · {product.shortSpec}
                    </p>
                  </div>
                </div>
                <span className="font-display text-sm font-bold text-[#0860E8] tabular-nums shrink-0">
                  {formatCurrency(product.price, settings.currency)}
                </span>
              </button>
            ))
          )}
        </div>

        <div className="mt-3 flex items-center justify-between border-t border-[#E5EAF2] pt-3 text-xs text-[#667085]">
          <span>Press Enter to search full catalog</span>
          <button
            type="button"
            onClick={() => {
              setSearchOpen(false);
              navigate(`/shop?q=${encodeURIComponent(query.trim())}`);
            }}
            className="inline-flex items-center gap-1 font-semibold text-[#0860E8] hover:underline cursor-pointer"
          >
            Browse All Products <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
