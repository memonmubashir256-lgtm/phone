import React, {useMemo, useState} from 'react';
import {Search, SlidersHorizontal, X} from 'lucide-react';
import {useStore} from '../context/StoreContext';
import {ProductCard} from '../components/ProductCard';

interface ShopPageProps {
  mode?: 'shop' | 'categories' | 'deals';
}

export const ShopPage: React.FC<ShopPageProps> = ({mode = 'shop'}) => {
  const {products, brands, categories, searchParams, navigate} = useStore();
  const initialBrand = searchParams.get('brand') || 'All';
  const initialCategory = searchParams.get('category') || 'All';
  const initialQuery = searchParams.get('q') || '';

  const [selectedBrand, setSelectedBrand] = useState(initialBrand);
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [query, setQuery] = useState(initialQuery);
  const [dealsOnly, setDealsOnly] = useState(mode === 'deals');
  const [sortBy, setSortBy] = useState<'featured' | 'price-asc' | 'price-desc' | 'rating'>('featured');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = products.filter((p) => {
      if (dealsOnly && !p.isBestDeal && p.discountPercent < 10) return false;
      if (selectedBrand !== 'All' && p.brandName.toLowerCase() !== selectedBrand.toLowerCase()) {
        return false;
      }
      if (
        selectedCategory !== 'All' &&
        p.categoryName.toLowerCase() !== selectedCategory.toLowerCase()
      ) {
        return false;
      }
      if (q) {
        return (
          p.name.toLowerCase().includes(q) ||
          p.brandName.toLowerCase().includes(q) ||
          p.shortSpec.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q)
        );
      }
      return true;
    });

    if (sortBy === 'price-asc') return [...list].sort((a, b) => a.price - b.price);
    if (sortBy === 'price-desc') return [...list].sort((a, b) => b.price - a.price);
    if (sortBy === 'rating') return [...list].sort((a, b) => b.rating - a.rating);
    return list;
  }, [products, dealsOnly, selectedBrand, selectedCategory, query, sortBy]);

  const title =
    mode === 'deals'
      ? 'Best Smartphone Deals'
      : mode === 'categories'
        ? 'Browse by Category'
        : 'All Smartphones & Electronics';

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-10 pb-20">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#101828]">{title}</h1>
          <p className="mt-1 text-sm text-[#667085]">
            {filtered.length} authentic devices available with official warranty and nationwide shipping.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="sort-select" className="text-xs font-semibold text-[#667085]">
            Sort:
          </label>
          <select
            id="sort-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="rounded-xl border border-[#E5EAF2] bg-white px-3 py-2 text-xs sm:text-sm font-medium text-[#101828] focus:border-[#0860E8] focus:outline-none"
          >
            <option value="featured">Featured</option>
            <option value="price-asc">Price: Low to High</option>
            <option value="price-desc">Price: High to Low</option>
            <option value="rating">Highest Rated</option>
          </select>
        </div>
      </div>

      {/* Category & Brand Filter Bar */}
      <div className="mt-6 rounded-2xl border border-[#E5EAF2] bg-white p-4 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#667085]" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter by model, processor, or storage..."
              aria-label="Filter products"
              className="w-full rounded-xl border border-[#E5EAF2] bg-[#F4F8FF] py-2.5 pl-10 pr-4 text-sm text-[#101828] placeholder:text-[#98A2B3] focus:border-[#0860E8] focus:bg-white focus:outline-none"
            />
          </div>

          <button
            type="button"
            onClick={() => setDealsOnly((prev) => !prev)}
            className={`inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-xs sm:text-sm font-semibold transition cursor-pointer ${
              dealsOnly
                ? 'border-[#0860E8] bg-[#0860E8] text-white'
                : 'border-[#E5EAF2] bg-white text-[#101828] hover:bg-[#F4F8FF]'
            }`}
          >
            <SlidersHorizontal className="h-4 w-4" />
            <span>Deals Only</span>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-[#667085] mr-1">Brand:</span>
          {['All', ...brands.map((b) => b.name)].map((brand) => (
            <button
              key={brand}
              type="button"
              onClick={() => setSelectedBrand(brand)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                selectedBrand.toLowerCase() === brand.toLowerCase()
                  ? 'bg-[#0860E8] text-white'
                  : 'bg-[#F4F8FF] text-[#475467] hover:bg-[#E4EEFF]'
              }`}
            >
              {brand}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-[#667085] mr-1">Category:</span>
          {['All', ...categories.map((c) => c.name)].map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                selectedCategory.toLowerCase() === cat.toLowerCase()
                  ? 'bg-[#061B3D] text-white'
                  : 'bg-[#F4F8FF] text-[#475467] hover:bg-[#E4EEFF]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-[#E5EAF2] bg-white p-10 text-center">
          <p className="font-display text-lg font-bold text-[#101828]">No matching products found</p>
          <p className="mt-1 text-sm text-[#667085]">
            Try clearing your brand or search filters to explore the full TechNova lineup.
          </p>
          <button
            type="button"
            onClick={() => {
              setSelectedBrand('All');
              setSelectedCategory('All');
              setQuery('');
              setDealsOnly(false);
              navigate('/shop');
            }}
            className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-[#0860E8] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0650C7] cursor-pointer"
          >
            <X className="h-4 w-4" /> Reset Filters
          </button>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5 sm:gap-5">
          {filtered.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
};
