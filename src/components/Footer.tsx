import React from 'react';
import {useStore} from '../context/StoreContext';
import {TechNovaLogo} from './BrandLogo';

export const Footer: React.FC = () => {
  const {navigate, settings} = useStore();

  return (
    <footer className="border-t border-[#E5EAF2] bg-white pb-20 md:pb-10 pt-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-6 sm:gap-8 lg:grid-cols-5">
          <div className="col-span-2 lg:col-span-1">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="flex items-center gap-2.5 cursor-pointer"
            >
              <TechNovaLogo className="h-8 w-8" />
              <span className="font-display text-lg font-bold text-[#061B3D]">
                {settings.storeName}
              </span>
            </button>
            <p className="mt-3 text-sm text-[#667085] leading-relaxed">{settings.tagline}</p>
            <div className="mt-2 space-y-0.5 text-xs text-[#667085]">
              <p>
                <a href={`mailto:${settings.supportEmail}`} className="hover:text-[#0860E8]">
                  {settings.supportEmail}
                </a>
              </p>
              <p>
                <a href={`tel:${settings.supportPhone.replace(/\s+/g, '')}`} className="hover:text-[#0860E8]">
                  {settings.supportPhone}
                </a>
              </p>
            </div>
            <div className="mt-4 flex items-center gap-3 text-xs font-semibold text-[#475467]">
              <a
                href="#facebook"
                onClick={(e) => {
                  e.preventDefault();
                  navigate('/about');
                }}
                aria-label="TechNova on Facebook"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#E5EAF2] hover:border-[#0860E8] hover:text-[#0860E8]"
              >
                f
              </a>
              <a
                href="#instagram"
                onClick={(e) => {
                  e.preventDefault();
                  navigate('/about');
                }}
                aria-label="TechNova on Instagram"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#E5EAF2] hover:border-[#0860E8] hover:text-[#0860E8]"
              >
                ig
              </a>
              <a
                href="#youtube"
                onClick={(e) => {
                  e.preventDefault();
                  navigate('/about');
                }}
                aria-label="TechNova on YouTube"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#E5EAF2] hover:border-[#0860E8] hover:text-[#0860E8]"
              >
                yt
              </a>
            </div>
          </div>

          <div>
            <h4 className="font-display text-sm font-bold text-[#101828]">Quick Links</h4>
            <ul className="mt-3 space-y-2 text-sm text-[#667085]">
              <li>
                <button type="button" onClick={() => navigate('/')} className="hover:text-[#0860E8] cursor-pointer">
                  Home
                </button>
              </li>
              <li>
                <button type="button" onClick={() => navigate('/shop')} className="hover:text-[#0860E8] cursor-pointer">
                  Shop
                </button>
              </li>
              <li>
                <button type="button" onClick={() => navigate('/deals')} className="hover:text-[#0860E8] cursor-pointer">
                  Best Deals
                </button>
              </li>
              <li>
                <button type="button" onClick={() => navigate('/about')} className="hover:text-[#0860E8] cursor-pointer">
                  About Us
                </button>
              </li>
              <li>
                <button type="button" onClick={() => navigate('/admin')} className="hover:text-[#0860E8] cursor-pointer">
                  Admin Console
                </button>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-display text-sm font-bold text-[#101828]">Categories</h4>
            <ul className="mt-3 space-y-2 text-sm text-[#667085]">
              {['Apple', 'Samsung', 'Google', 'OnePlus', 'Xiaomi'].map((brand) => (
                <li key={brand}>
                  <button
                    type="button"
                    onClick={() => navigate(`/shop?brand=${encodeURIComponent(brand)}`)}
                    className="hover:text-[#0860E8] cursor-pointer"
                  >
                    {brand}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-display text-sm font-bold text-[#101828]">Customer Service</h4>
            <ul className="mt-3 space-y-2 text-sm text-[#667085]">
              <li>
                <button type="button" onClick={() => navigate('/tracking')} className="hover:text-[#0860E8] cursor-pointer">
                  Track Order
                </button>
              </li>
              <li>
                <button type="button" onClick={() => navigate('/about')} className="hover:text-[#0860E8] cursor-pointer">
                  Shipping & Delivery
                </button>
              </li>
              <li>
                <button type="button" onClick={() => navigate('/about')} className="hover:text-[#0860E8] cursor-pointer">
                  30-Day Returns
                </button>
              </li>
              <li>
                <button type="button" onClick={() => navigate('/wishlist')} className="hover:text-[#0860E8] cursor-pointer">
                  Saved Wishlist
                </button>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-display text-sm font-bold text-[#101828]">Payment Methods</h4>
            <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-semibold text-[#101828]">
              <span className="rounded-lg border border-[#E5EAF2] bg-[#F4F8FF] px-2.5 py-1">VISA</span>
              <span className="rounded-lg border border-[#E5EAF2] bg-[#F4F8FF] px-2.5 py-1">Mastercard</span>
              <span className="rounded-lg border border-[#E5EAF2] bg-[#F4F8FF] px-2.5 py-1">JazzCash</span>
              <span className="rounded-lg border border-[#E5EAF2] bg-[#F4F8FF] px-2.5 py-1">Easypaisa</span>
              <span className="rounded-lg border border-[#E5EAF2] bg-[#F4F8FF] px-2.5 py-1">Bank Transfer</span>
              <span className="rounded-lg border border-[#E5EAF2] bg-[#F4F8FF] px-2.5 py-1">Cash on Delivery</span>
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-[#E5EAF2] pt-6 text-xs text-[#667085] sm:flex-row">
          <p>© {new Date().getFullYear()} TechNova Electronics. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <button type="button" onClick={() => navigate('/about#privacy')} className="hover:text-[#0860E8] cursor-pointer">
              Privacy Policy
            </button>
            <button type="button" onClick={() => navigate('/about#terms')} className="hover:text-[#0860E8] cursor-pointer">
              Terms & Conditions
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};
