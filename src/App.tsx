/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, {useEffect} from 'react';
import {registerSW} from 'virtual:pwa-register';
import {StoreProvider, useStore} from './context/StoreContext';
import {Navbar} from './components/Navbar';
import {Footer} from './components/Footer';
import {SearchDrawer} from './components/SearchDrawer';
import {OfflineIndicator} from './components/OfflineIndicator';
import {MobileInstallPopup} from './components/PWAInstallButton';
import {HomePage} from './pages/HomePage';
import {ShopPage} from './pages/ShopPage';
import {ProductDetailPage} from './pages/ProductDetailPage';
import {CartPage} from './pages/CartPage';
import {CheckoutPage} from './pages/CheckoutPage';
import {TrackingPage} from './pages/TrackingPage';
import {WishlistPage} from './pages/WishlistPage';
import {AuthPages} from './pages/AuthPages';
import {ProfilePage} from './pages/ProfilePage';
import {AboutPage} from './pages/AboutPage';
import {AdminDashboard} from './pages/AdminDashboard';
import {matchProductSlug} from './utils/format';

const AppRouter: React.FC = () => {
  const {route, toast} = useStore();
  const productSlug = matchProductSlug(route);

  const renderPage = () => {
    if (productSlug) return <ProductDetailPage slug={productSlug} />;
    switch (route) {
      case '/':
        return <HomePage />;
      case '/shop':
        return <ShopPage mode="shop" />;
      case '/categories':
        return <ShopPage mode="categories" />;
      case '/deals':
        return <ShopPage mode="deals" />;
      case '/cart':
        return <CartPage />;
      case '/checkout':
        return <CheckoutPage />;
      case '/tracking':
        return <TrackingPage />;
      case '/wishlist':
        return <WishlistPage />;
      case '/login':
        return <AuthPages mode="login" />;
      case '/signup':
        return <AuthPages mode="signup" />;
      case '/forgot-password':
        return <AuthPages mode="forgot" />;
      case '/reset-password':
        return <AuthPages mode="reset" />;
      case '/profile':
        return <ProfilePage />;
      case '/about':
        return <AboutPage />;
      case '/admin':
        return <AdminDashboard />;
      default:
        return <HomePage />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F4F8FF] text-[#101828]">
      <Navbar />
      <main className="flex-1">{renderPage()}</main>
      <Footer />
      <SearchDrawer />
      <OfflineIndicator />
      <MobileInstallPopup />

      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed bottom-20 right-4 z-50 rounded-xl px-4 py-3 text-xs sm:text-sm font-semibold text-white shadow-xl animate-tn-pop md:bottom-6 md:right-6 ${
            toast.type === 'error'
              ? 'bg-rose-600'
              : toast.type === 'info'
                ? 'bg-[#061B3D]'
                : 'bg-[#0860E8]'
          }`}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
};

export default function App() {
  useEffect(() => {
    try {
      registerSW({immediate: true});
    } catch {
      // Service worker registration optional in unsupported contexts
    }
  }, []);

  return (
    <StoreProvider>
      <AppRouter />
    </StoreProvider>
  );
}
