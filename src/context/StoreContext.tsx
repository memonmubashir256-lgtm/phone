import React, {createContext, useCallback, useContext, useEffect, useMemo, useState} from 'react';
import type {
  Brand,
  CartLineItem,
  Category,
  HeroSlide,
  NotificationItem,
  Order,
  Product,
  ProductVariant,
  PublicUser,
  WebsiteSettings,
} from '../types';
import {normalizeRoutePath} from '../utils/format';

const CART_STORAGE_KEY = 'technova_cart_v1';
const WISHLIST_STORAGE_KEY = 'technova_wishlist_v1';
const COUPON_STORAGE_KEY = 'technova_coupon_v1';

interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface StoreContextValue {
  route: string;
  searchParams: URLSearchParams;
  navigate: (to: string) => void;
  loading: boolean;
  brands: Brand[];
  categories: Category[];
  products: Product[];
  heroSlides: HeroSlide[];
  settings: WebsiteSettings;
  notifications: NotificationItem[];
  user: PublicUser | null;
  authToken: string | null;
  cart: CartLineItem[];
  cartCount: number;
  wishlistIds: string[];
  appliedCouponCode: string;
  setAppliedCouponCode: (code: string) => void;
  lastConfirmedOrder: Order | null;
  setLastConfirmedOrder: (order: Order | null) => void;
  searchOpen: boolean;
  setSearchOpen: (open: boolean) => void;
  toast: ToastMessage | null;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  addToCart: (product: Product, variant?: ProductVariant, quantity?: number) => void;
  updateCartQuantity: (productId: string, variantId: string, quantity: number) => void;
  removeFromCart: (productId: string, variantId: string) => void;
  clearCart: () => void;
  toggleWishlist: (productId: string) => Promise<void>;
  refreshBootstrap: () => Promise<void>;
  setSession: (user: PublicUser | null, token?: string | null) => void;
  logout: () => Promise<void>;
  apiFetch: (url: string, init?: RequestInit) => Promise<Response>;
}

const DEFAULT_SETTINGS: WebsiteSettings = {
  storeName: 'TechNova',
  tagline: 'Better Tech. Brighter Tomorrow.',
  currency: 'PKR',
  freeShippingThreshold: 10000,
  standardShippingFee: 500,
  promoBannerTitle: 'Up to 30% Off',
  promoBannerSubtitle: 'On Selected Smartphones',
  promoBannerDiscount: '30%',
  paymentMethodsEnabled: {
    'Credit / Debit Card': true,
    JazzCash: true,
    Easypaisa: true,
    'Bank Transfer': true,
    'Cash on Delivery': true,
  },
  pushNotificationsEnabled: true,
  supportEmail: 'support@technova.pk',
  supportPhone: '+92 21 111 832 466',
};

const StoreContext = createContext<StoreContextValue | null>(null);

function readStoredJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export const StoreProvider: React.FC<{children: React.ReactNode}> = ({children}) => {
  const [locationState, setLocationState] = useState(() => ({
    pathname: normalizeRoutePath(window.location.pathname),
    search: window.location.search,
  }));
  const [loading, setLoading] = useState(true);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [heroSlides, setHeroSlides] = useState<HeroSlide[]>([]);
  const [settings, setSettings] = useState<WebsiteSettings>(DEFAULT_SETTINGS);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [user, setUser] = useState<PublicUser | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);

  const [cart, setCart] = useState<CartLineItem[]>(() => readStoredJson(CART_STORAGE_KEY, []));
  const [wishlistIds, setWishlistIds] = useState<string[]>(() =>
    readStoredJson(WISHLIST_STORAGE_KEY, ['prod-iphone-16-pro'])
  );
  const [appliedCouponCode, setAppliedCouponCode] = useState<string>(() => {
    try {
      return localStorage.getItem(COUPON_STORAGE_KEY) || '';
    } catch {
      return '';
    }
  });
  const [lastConfirmedOrder, setLastConfirmedOrder] = useState<Order | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const showToast = useCallback(
    (message: string, type: 'success' | 'error' | 'info' = 'success') => {
      const id = String(Date.now());
      setToast({id, message, type});
      window.setTimeout(() => {
        setToast((curr) => (curr?.id === id ? null : curr));
      }, 3200);
    },
    []
  );

  const apiFetch = useCallback(
    (url: string, init: RequestInit = {}) => {
      const headers = new Headers(init.headers || {});
      if (authToken && !headers.has('Authorization')) {
        headers.set('Authorization', `Bearer ${authToken}`);
      }
      if (init.body && !headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
      }
      return fetch(url, {
        ...init,
        headers,
        credentials: 'include',
      });
    },
    [authToken]
  );

  const navigate = useCallback((to: string) => {
    const [rawPath, rawSearch] = to.split('?');
    const nextPath = normalizeRoutePath(rawPath || '/');
    const nextSearch = rawSearch ? `?${rawSearch}` : '';
    window.history.pushState({}, '', `${nextPath}${nextSearch}`);
    setLocationState({pathname: nextPath, search: nextSearch});
    window.scrollTo({top: 0, behavior: 'smooth'});
  }, []);

  useEffect(() => {
    const onPopState = () => {
      setLocationState({
        pathname: normalizeRoutePath(window.location.pathname),
        search: window.location.search,
      });
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    } catch {
      // ignore storage errors
    }
  }, [cart]);

  useEffect(() => {
    try {
      localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(wishlistIds));
    } catch {
      // ignore
    }
  }, [wishlistIds]);

  useEffect(() => {
    try {
      localStorage.setItem(COUPON_STORAGE_KEY, appliedCouponCode);
    } catch {
      // ignore
    }
  }, [appliedCouponCode]);

  const refreshBootstrap = useCallback(async () => {
    try {
      const res = await apiFetch('/api/store/bootstrap');
      if (!res.ok) return;
      const data = await res.json();
      setBrands(data.brands || []);
      setCategories(data.categories || []);
      setProducts(data.products || []);
      setHeroSlides(data.heroSlides || []);
      if (data.settings) setSettings(data.settings);
      setNotifications(data.notifications || []);
      if (data.user !== undefined) setUser(data.user);
    } finally {
      setLoading(false);
    }
  }, [apiFetch]);

  useEffect(() => {
    void refreshBootstrap();
  }, [refreshBootstrap]);

  // Sync cart to server when logged in
  useEffect(() => {
    if (!user) return;
    void apiFetch('/api/account/cart', {
      method: 'PUT',
      body: JSON.stringify({items: cart}),
    });
  }, [cart, user, apiFetch]);

  const setSession = useCallback((nextUser: PublicUser | null, token: string | null = null) => {
    setUser(nextUser);
    setAuthToken(token);
  }, []);

  const logout = useCallback(async () => {
    await apiFetch('/api/auth/logout', {method: 'POST'});
    setUser(null);
    setAuthToken(null);
    showToast('Signed out successfully.', 'info');
    navigate('/');
  }, [apiFetch, navigate, showToast]);

  const addToCart = useCallback(
    (product: Product, variant?: ProductVariant, quantity = 1) => {
      const chosenVariant = variant || product.variants[0];
      if (!chosenVariant) return;
      if (chosenVariant.stock <= 0) {
        showToast(`${product.name} is currently out of stock.`, 'error');
        return;
      }

      setCart((prev) => {
        const idx = prev.findIndex(
          (item) => item.productId === product.id && item.variantId === chosenVariant.id
        );
        if (idx >= 0) {
          const next = [...prev];
          const updatedQty = Math.min(chosenVariant.stock, next[idx].quantity + quantity);
          next[idx] = {...next[idx], quantity: updatedQty};
          return next;
        }
        return [
          ...prev,
          {
            productId: product.id,
            variantId: chosenVariant.id,
            quantity: Math.min(chosenVariant.stock, Math.max(1, quantity)),
          },
        ];
      });
      showToast(`${product.name} (${chosenVariant.storage}) added to cart.`);
    },
    [showToast]
  );

  const updateCartQuantity = useCallback(
    (productId: string, variantId: string, quantity: number) => {
      if (quantity < 1) return;
      const product = products.find((p) => p.id === productId);
      const variant = product?.variants.find((v) => v.id === variantId);
      const maxStock = variant ? Math.max(1, variant.stock) : 20;
      const clamped = Math.min(quantity, maxStock);

      setCart((prev) =>
        prev.map((item) =>
          item.productId === productId && item.variantId === variantId
            ? {...item, quantity: clamped}
            : item
        )
      );
    },
    [products]
  );

  const removeFromCart = useCallback(
    (productId: string, variantId: string) => {
      setCart((prev) =>
        prev.filter((item) => !(item.productId === productId && item.variantId === variantId))
      );
      showToast('Item removed from cart.', 'info');
    },
    [showToast]
  );

  const clearCart = useCallback(() => {
    setCart([]);
    setAppliedCouponCode('');
  }, []);

  const toggleWishlist = useCallback(
    async (productId: string) => {
      const exists = wishlistIds.includes(productId);
      setWishlistIds((prev) =>
        exists ? prev.filter((id) => id !== productId) : [...prev, productId]
      );
      showToast(exists ? 'Removed from wishlist.' : 'Saved to wishlist.', 'info');
      if (user) {
        await apiFetch('/api/account/wishlist/toggle', {
          method: 'POST',
          body: JSON.stringify({productId}),
        });
      }
    },
    [wishlistIds, user, apiFetch, showToast]
  );

  const cartCount = useMemo(
    () => cart.reduce((sum, item) => sum + item.quantity, 0),
    [cart]
  );

  const searchParams = useMemo(
    () => new URLSearchParams(locationState.search),
    [locationState.search]
  );

  const value: StoreContextValue = {
    route: locationState.pathname,
    searchParams,
    navigate,
    loading,
    brands,
    categories,
    products,
    heroSlides,
    settings,
    notifications,
    user,
    authToken,
    cart,
    cartCount,
    wishlistIds,
    appliedCouponCode,
    setAppliedCouponCode,
    lastConfirmedOrder,
    setLastConfirmedOrder,
    searchOpen,
    setSearchOpen,
    toast,
    showToast,
    addToCart,
    updateCartQuantity,
    removeFromCart,
    clearCart,
    toggleWishlist,
    refreshBootstrap,
    setSession,
    logout,
    apiFetch,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
};

export function useStore(): StoreContextValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside StoreProvider');
  return ctx;
}
