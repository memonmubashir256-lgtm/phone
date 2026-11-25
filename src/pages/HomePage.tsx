import React, {useEffect, useMemo, useState} from 'react';
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Headphones,
  RotateCcw,
  ShieldCheck,
  Truck,
} from 'lucide-react';
import {useStore} from '../context/StoreContext';
import {ProductCard} from '../components/ProductCard';
import {BrandMark} from '../components/BrandLogo';
import {formatCurrency} from '../utils/format';

export const HomePage: React.FC = () => {
  const {
    heroSlides,
    products,
    brands,
    settings,
    navigate,
    showToast,
    apiFetch,
  } = useStore();
  const [slideIdx, setSlideIdx] = useState(0);
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [submittingNewsletter, setSubmittingNewsletter] = useState(false);

  const slides = heroSlides.length > 0 ? heroSlides : [];
  const activeSlide = slides[slideIdx % Math.max(1, slides.length)];

  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = window.setInterval(() => {
      setSlideIdx((prev) => (prev + 1) % slides.length);
    }, 6500);
    return () => window.clearInterval(timer);
  }, [slides.length]);

  const popularProducts = useMemo(() => {
    const flagged = products.filter((p) => p.isPopular);
    return (flagged.length > 0 ? flagged : products).slice(0, 4);
  }, [products]);

  const dealProducts = useMemo(() => {
    const flagged = products.filter((p) => p.isBestDeal || p.discountPercent >= 10);
    return (flagged.length > 0 ? flagged : products).slice(0, 4);
  }, [products]);

  const handleNewsletter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsletterEmail.trim()) return;
    setSubmittingNewsletter(true);
    try {
      const res = await apiFetch('/api/newsletter', {
        method: 'POST',
        body: JSON.stringify({email: newsletterEmail.trim()}),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Could not subscribe.', 'error');
      } else {
        showToast(data.message || 'Subscribed to TechNova!');
        setNewsletterEmail('');
      }
    } finally {
      setSubmittingNewsletter(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 pb-16 space-y-10 sm:space-y-14">
      {/* B. Hero Section */}
      {activeSlide && (
        <section
          aria-label="Featured launch"
          className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#041229] via-[#061B3D] to-[#082A63] text-white shadow-[0_24px_60px_rgba(6,27,61,0.18)]"
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-20 -top-24 h-96 w-96 rounded-full bg-[#1D75F0]/25 blur-3xl"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-24 left-1/3 h-72 w-72 rounded-full bg-[#0860E8]/25 blur-3xl"
          />

          <div className="relative grid grid-cols-1 lg:grid-cols-12 items-center gap-6 px-5 py-7 sm:px-10 lg:px-12 sm:py-12 lg:py-14">
            <div className="lg:col-span-6 space-y-3.5 sm:space-y-4 z-10">
              <p className="text-xs font-semibold tracking-[0.22em] text-[#93C5FD] uppercase">
                {activeSlide.kicker}
              </p>
              <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white text-balance leading-[1.08]">
                {activeSlide.title}
              </h1>
              <p className="font-display text-lg sm:text-xl font-semibold text-blue-100">
                {activeSlide.subtitle}
              </p>
              <p className="max-w-lg text-sm sm:text-base text-blue-100/80 leading-relaxed">
                {activeSlide.description}
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => navigate(`/product/${activeSlide.productSlug}`)}
                  className="inline-flex items-center gap-2 rounded-full bg-[#0860E8] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-[#0860E8]/35 hover:bg-[#1D75F0] active:scale-[0.98] transition cursor-pointer"
                >
                  <span>{activeSlide.ctaText}</span>
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/shop')}
                  className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-5 py-3 text-sm font-semibold text-white backdrop-blur-sm hover:bg-white/20 transition cursor-pointer"
                >
                  Explore Collection
                </button>
              </div>

              {/* Slide Pagination Dots */}
              {slides.length > 1 && (
                <div className="flex items-center gap-2 pt-4" role="tablist" aria-label="Hero slides">
                  {slides.map((slide, idx) => (
                    <button
                      key={slide.id}
                      type="button"
                      role="tab"
                      aria-selected={idx === slideIdx}
                      aria-label={`Slide ${idx + 1}: ${slide.title}`}
                      onClick={() => setSlideIdx(idx)}
                      className={`h-2 rounded-full transition-all cursor-pointer ${
                        idx === slideIdx ? 'w-7 bg-white' : 'w-2 bg-white/40 hover:bg-white/70'
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>

            <div className="lg:col-span-6 relative flex items-center justify-center">
              <img
                src={activeSlide.image}
                alt={activeSlide.title}
                referrerPolicy="no-referrer"
                className="w-full max-h-[230px] sm:max-h-[340px] lg:max-h-[400px] rounded-2xl object-cover [mask-image:radial-gradient(ellipse_at_center,black_62%,transparent_98%)] transition-transform duration-500"
              />
              {slides.length > 1 && (
                <div className="absolute bottom-3 right-3 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSlideIdx((prev) => (prev - 1 + slides.length) % slides.length)}
                    aria-label="Previous hero slide"
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-[#061B3D]/80 text-white ring-1 ring-white/20 backdrop-blur hover:bg-[#0860E8] transition cursor-pointer"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setSlideIdx((prev) => (prev + 1) % slides.length)}
                    aria-label="Next hero slide"
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-[#061B3D]/80 text-white ring-1 ring-white/20 backdrop-blur hover:bg-[#0860E8] transition cursor-pointer"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* C. Service Benefits */}
      <section aria-label="Store guarantees" className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        {[
          {
            icon: Truck,
            title: 'Free Shipping',
            desc: `On orders over ${formatCurrency(settings.freeShippingThreshold, settings.currency)}`,
          },
          {
            icon: ShieldCheck,
            title: 'Secure Payment',
            desc: 'Protected transactions',
          },
          {
            icon: Headphones,
            title: '24/7 Support',
            desc: "We're here to help",
          },
          {
            icon: RotateCcw,
            title: 'Easy Returns',
            desc: '30-day return policy',
          },
        ].map((benefit) => {
          const Icon = benefit.icon;
          return (
            <div
              key={benefit.title}
              className="flex flex-col sm:flex-row items-start sm:items-center gap-2.5 sm:gap-3.5 rounded-2xl border border-[#E5EAF2] bg-white p-3.5 sm:p-4 shadow-[0_4px_16px_rgba(6,27,61,0.03)]"
            >
              <div className="flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-xl bg-[#EEF4FF] text-[#0860E8]">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <h2 className="font-display text-xs sm:text-sm font-bold text-[#101828]">{benefit.title}</h2>
                <p className="text-[11px] sm:text-xs text-[#667085] leading-snug">{benefit.desc}</p>
              </div>
            </div>
          );
        })}
      </section>

      {/* D. Popular Smartphones */}
      <section aria-labelledby="popular-heading">
        <div className="flex items-end justify-between gap-4 mb-5">
          <div>
            <h2 id="popular-heading" className="font-display text-xl sm:text-2xl font-bold text-[#101828]">
              Popular Smartphones
            </h2>
            <p className="mt-0.5 text-sm text-[#667085]">
              Discover the most loved devices by our customers.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/shop')}
            className="inline-flex items-center gap-1 text-sm font-semibold text-[#101828] hover:text-[#0860E8] whitespace-nowrap shrink-0 cursor-pointer"
          >
            <span>View All</span>
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-5">
          {popularProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      {/* E. Promotional Banner */}
      <section
        aria-label="Limited time offer"
        className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#061B3D] via-[#093275] to-[#0860E8] text-white"
      >
        <div className="grid grid-cols-1 md:grid-cols-12 items-center gap-6 px-6 py-8 sm:px-10 sm:py-10">
          <div className="md:col-span-6 space-y-3 z-10">
            <p className="text-xs font-semibold uppercase tracking-widest text-blue-200">
              Limited Time Offer
            </p>
            <h2 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
              {settings.promoBannerTitle}
            </h2>
            <p className="text-sm sm:text-base text-blue-100">{settings.promoBannerSubtitle}</p>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => navigate('/deals')}
                className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-bold text-[#061B3D] shadow-md hover:bg-blue-50 transition cursor-pointer"
              >
                <span>Shop Deals</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
          <div className="md:col-span-6 flex items-center justify-end">
            <img
              src="/src/assets/images/promo_smartphones_lineup_1795612214384.jpg"
              alt="Selected discounted flagship smartphones"
              loading="lazy"
              referrerPolicy="no-referrer"
              className="w-full max-h-56 rounded-2xl object-cover shadow-xl ring-1 ring-white/15"
            />
          </div>
        </div>
      </section>

      {/* F. Shop By Brand */}
      <section aria-labelledby="brands-heading">
        <div className="flex items-center justify-between gap-4 mb-5">
          <h2 id="brands-heading" className="font-display text-xl sm:text-2xl font-bold text-[#101828]">
            Shop by Brand
          </h2>
          <button
            type="button"
            onClick={() => navigate('/shop')}
            className="inline-flex items-center gap-1 text-sm font-semibold text-[#101828] hover:text-[#0860E8] whitespace-nowrap shrink-0 cursor-pointer"
          >
            <span>View All</span>
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="grid grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-4">
          {brands.map((brand) => (
            <button
              key={brand.id}
              type="button"
              onClick={() => navigate(`/shop?brand=${encodeURIComponent(brand.name)}`)}
              className="group flex flex-col items-center justify-center gap-2 sm:gap-3 rounded-2xl border border-[#E5EAF2] bg-white p-3.5 sm:p-5 hover:border-[#0860E8] hover:shadow-md transition cursor-pointer"
            >
              <div className="flex h-10 sm:h-12 items-center justify-center transition-transform group-hover:scale-105">
                <BrandMark slug={brand.slug} />
              </div>
              <span className="font-display text-xs sm:text-sm font-semibold text-[#101828] group-hover:text-[#0860E8]">
                {brand.name}
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* G. Best Deals */}
      <section aria-labelledby="deals-heading">
        <div className="flex items-end justify-between gap-4 mb-5">
          <div>
            <h2 id="deals-heading" className="font-display text-xl sm:text-2xl font-bold text-[#101828]">
              Best Deals
            </h2>
            <p className="mt-0.5 text-sm text-[#667085]">Top offers. Limited time only.</p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/deals')}
            className="inline-flex items-center gap-1 text-sm font-semibold text-[#101828] hover:text-[#0860E8] whitespace-nowrap shrink-0 cursor-pointer"
          >
            <span>View All</span>
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-5">
          {dealProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      {/* H. Newsletter */}
      <section
        aria-labelledby="newsletter-heading"
        className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#061B3D] via-[#0B2A5E] to-[#07214C] p-6 sm:p-10 text-white"
      >
        <div className="grid grid-cols-1 md:grid-cols-12 items-center gap-6">
          <div className="md:col-span-7 space-y-3">
            <h2 id="newsletter-heading" className="font-display text-2xl sm:text-3xl font-bold">
              Stay Connected
            </h2>
            <p className="text-sm sm:text-base text-blue-100/85">
              Get the latest updates, offers, and new arrivals delivered straight to your inbox.
            </p>
            <form onSubmit={handleNewsletter} className="mt-4 flex max-w-md items-center gap-2 rounded-full bg-white/10 p-1.5 ring-1 ring-white/20 backdrop-blur-sm">
              <label htmlFor="newsletter-email" className="sr-only">
                Email address
              </label>
              <input
                id="newsletter-email"
                type="email"
                required
                value={newsletterEmail}
                onChange={(e) => setNewsletterEmail(e.target.value)}
                placeholder="Your email address"
                className="min-w-0 flex-1 bg-transparent px-4 py-2 text-sm text-white placeholder:text-blue-200/70 focus:outline-none"
              />
              <button
                type="submit"
                disabled={submittingNewsletter}
                aria-label="Subscribe to newsletter"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#0860E8] text-white hover:bg-[#1D75F0] transition disabled:opacity-60 cursor-pointer"
              >
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>
          </div>
          <div className="hidden md:flex md:col-span-5 justify-end">
            <img
              src="/src/assets/images/hero_iphone16_pro_1795612213834.jpg"
              alt="TechNova flagship updates"
              loading="lazy"
              referrerPolicy="no-referrer"
              className="h-44 w-full max-w-xs rounded-2xl object-cover ring-1 ring-white/15"
            />
          </div>
        </div>
      </section>
    </div>
  );
};
