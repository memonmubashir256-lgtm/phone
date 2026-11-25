import React, {useState} from 'react';
import {
  ChevronDown,
  Compass,
  Heart,
  Home,
  PackageCheck,
  Search,
  ShoppingBag,
  Tag,
  User,
} from 'lucide-react';
import {useStore} from '../context/StoreContext';
import {TechNovaLogo} from './BrandLogo';

export const Navbar: React.FC = () => {
  const {route, navigate, cartCount, wishlistIds, user, setSearchOpen, brands} = useStore();
  const [shopDropdown, setShopDropdown] = useState(false);

  const isActive = (target: string) => {
    if (target === '/') return route === '/';
    return route === target || route.startsWith(`${target}/`);
  };

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-[#E5EAF2] bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex h-14 sm:h-16 max-w-7xl items-center justify-between gap-2.5 lg:gap-8 px-4 sm:px-6 lg:px-8">
          {/* Zone 1: Brand Wordmark */}
          <button
            type="button"
            onClick={() => navigate('/')}
            className="flex items-center gap-2.5 whitespace-nowrap shrink-0 cursor-pointer"
            aria-label="TechNova Home"
          >
            <TechNovaLogo className="h-8 w-8 sm:h-9 sm:w-9" />
            <span className="font-display text-lg sm:text-xl font-bold tracking-tight text-[#061B3D]">
              TechNova
            </span>
          </button>

          {/* Zone 2: Clean Single-Line Nav Links */}
          <nav
            aria-label="Primary navigation"
            className="hidden md:flex items-center gap-3 lg:gap-7 text-[13px] lg:text-sm font-medium text-[#475467]"
          >
            <button
              type="button"
              onClick={() => navigate('/')}
              className={`relative py-1 whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                isActive('/') ? 'font-semibold text-[#0860E8]' : 'hover:text-[#101828]'
              }`}
            >
              Home
              {isActive('/') && (
                <span className="absolute inset-x-0 -bottom-0.5 h-0.5 rounded-full bg-[#0860E8]" />
              )}
            </button>

            <div
              className="relative"
              onMouseEnter={() => setShopDropdown(true)}
              onMouseLeave={() => setShopDropdown(false)}
            >
              <button
                type="button"
                onClick={() => navigate('/shop')}
                aria-expanded={shopDropdown}
                className={`inline-flex items-center gap-1 py-1 whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                  isActive('/shop') ? 'font-semibold text-[#0860E8]' : 'hover:text-[#101828]'
                }`}
              >
                <span>Shop</span>
                <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
              </button>

              {shopDropdown && (
                <div className="absolute left-0 top-full pt-2 w-52 z-50">
                  <div className="rounded-xl border border-[#E5EAF2] bg-white p-2 shadow-xl">
                    <button
                      type="button"
                      onClick={() => {
                        setShopDropdown(false);
                        navigate('/shop');
                      }}
                      className="block w-full rounded-lg px-3 py-2 text-left text-xs font-semibold text-[#101828] hover:bg-[#F4F8FF] cursor-pointer"
                    >
                      All Smartphones & Audio
                    </button>
                    {brands.map((brand) => (
                      <button
                        key={brand.id}
                        type="button"
                        onClick={() => {
                          setShopDropdown(false);
                          navigate(`/shop?brand=${encodeURIComponent(brand.name)}`);
                        }}
                        className="block w-full rounded-lg px-3 py-1.5 text-left text-xs text-[#475467] hover:bg-[#F4F8FF] hover:text-[#0860E8] cursor-pointer"
                      >
                        {brand.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => navigate('/categories')}
              className={`relative py-1 whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                isActive('/categories') ? 'font-semibold text-[#0860E8]' : 'hover:text-[#101828]'
              }`}
            >
              Categories
            </button>

            <button
              type="button"
              onClick={() => navigate('/deals')}
              className={`relative py-1 whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                isActive('/deals') ? 'font-semibold text-[#0860E8]' : 'hover:text-[#101828]'
              }`}
            >
              Deals
            </button>

            <button
              type="button"
              onClick={() => navigate('/tracking')}
              className={`relative py-1 whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                isActive('/tracking') ? 'font-semibold text-[#0860E8]' : 'hover:text-[#101828]'
              }`}
            >
              Track Order
            </button>

            <button
              type="button"
              onClick={() => navigate('/about')}
              className={`relative py-1 whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                isActive('/about') ? 'font-semibold text-[#0860E8]' : 'hover:text-[#101828]'
              }`}
            >
              About
            </button>
          </nav>

          {/* Zone 3: Interactive Actions */}
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              aria-label="Search products"
              className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl text-[#475467] hover:bg-[#F4F8FF] hover:text-[#0860E8] transition cursor-pointer"
            >
              <Search className="h-5 w-5" />
            </button>

            <button
              type="button"
              onClick={() => navigate('/wishlist')}
              aria-label={`Wishlist (${wishlistIds.length} items)`}
              className="relative flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl text-[#475467] hover:bg-[#F4F8FF] hover:text-[#0860E8] transition cursor-pointer"
            >
              <Heart className="h-5 w-5" />
              {wishlistIds.length > 0 && (
                <span className="absolute right-1.5 top-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#0860E8] px-1 text-[10px] font-bold text-white tabular-nums">
                  {wishlistIds.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => navigate('/cart')}
              aria-label={`Shopping cart (${cartCount} items)`}
              className="relative flex h-10 w-10 items-center justify-center rounded-xl text-[#475467] hover:bg-[#F4F8FF] hover:text-[#0860E8] transition cursor-pointer"
            >
              <ShoppingBag className="h-5 w-5" />
              {cartCount > 0 && (
                <span
                  data-testid="cart-badge"
                  className="absolute right-1 top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#0860E8] px-1 text-[10px] font-bold text-white tabular-nums"
                >
                  {cartCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => navigate(user ? (user.role === 'admin' ? '/admin' : '/profile') : '/login')}
              aria-label={user ? 'Account profile' : 'Login or Sign Up'}
              className="flex h-9 items-center gap-2 rounded-xl border border-[#E5EAF2] bg-[#F4F8FF] px-2.5 sm:px-3 text-xs font-semibold text-[#101828] hover:border-[#0860E8]/40 hover:text-[#0860E8] transition whitespace-nowrap shrink-0 cursor-pointer"
            >
              <User className="h-4 w-4 text-[#0860E8]" />
              <span className="hidden lg:inline">
                {user ? user.fullName.split(' ')[0] : 'Sign In'}
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Bottom Thumb Navigation Bar (keeps total sticky height <= 15% of 844px viewport) */}
      <nav
        aria-label="Mobile quick navigation"
        className="fixed bottom-0 left-0 right-0 z-40 grid h-14 grid-cols-5 border-t border-[#E5EAF2] bg-white/95 backdrop-blur-md md:hidden"
      >
        {[
          {label: 'Home', path: '/', icon: Home},
          {label: 'Shop', path: '/shop', icon: Compass},
          {label: 'Deals', path: '/deals', icon: Tag},
          {label: 'Track', path: '/tracking', icon: PackageCheck},
          {label: user ? 'Profile' : 'Account', path: user ? '/profile' : '/login', icon: User},
        ].map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          return (
            <button
              key={item.path}
              type="button"
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition cursor-pointer ${
                active ? 'text-[#0860E8]' : 'text-[#667085]'
              }`}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
};
