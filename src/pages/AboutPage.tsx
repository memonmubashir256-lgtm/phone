import React from 'react';
import {CheckCircle2, Headphones, ShieldCheck, Truck} from 'lucide-react';
import {useStore} from '../context/StoreContext';
import {formatCurrency} from '../utils/format';

export const AboutPage: React.FC = () => {
  const {navigate, settings} = useStore();

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12 pb-24 space-y-10">
      <section className="rounded-3xl bg-gradient-to-br from-[#061B3D] to-[#0A3882] p-7 sm:p-12 text-white">
        <p className="text-xs font-semibold uppercase tracking-widest text-blue-200">About TechNova</p>
        <h1 className="mt-2 font-display text-3xl sm:text-4xl font-extrabold">
          {settings.tagline}
        </h1>
        <p className="mt-4 max-w-2xl text-sm sm:text-base text-blue-100/85 leading-relaxed">
          TechNova is Pakistan's modern smartphone and audio destination built for speed, transparency,
          and official warranty peace of mind. Every device ships factory-sealed with verified PTA
          compliance and 30-day return protection.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => navigate('/shop')}
            className="rounded-xl bg-[#0860E8] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#1D75F0] cursor-pointer"
          >
            Explore Catalog
          </button>
          <button
            type="button"
            onClick={() => navigate('/tracking')}
            className="rounded-xl border border-white/25 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/20 cursor-pointer"
          >
            Track an Order
          </button>
        </div>
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          {
            icon: ShieldCheck,
            title: '100% Authentic Hardware',
            desc: 'Factory-sealed units sourced through authorized distributors with serial verification.',
          },
          {
            icon: Truck,
            title: 'Nationwide Express',
            desc: `Free insured delivery over ${formatCurrency(settings.freeShippingThreshold, settings.currency)}.`,
          },
          {
            icon: Headphones,
            title: 'Dedicated Care',
            desc: `24/7 specialist support via ${settings.supportEmail} and ${settings.supportPhone}.`,
          },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.title} className="rounded-2xl border border-[#E5EAF2] bg-white p-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EEF4FF] text-[#0860E8]">
                <Icon className="h-5 w-5" />
              </div>
              <h2 className="mt-3 font-display text-base font-bold text-[#101828]">{item.title}</h2>
              <p className="mt-1 text-xs text-[#667085] leading-relaxed">{item.desc}</p>
            </div>
          );
        })}
      </section>

      <section id="privacy" className="rounded-3xl border border-[#E5EAF2] bg-white p-6 sm:p-8 space-y-3">
        <h2 className="font-display text-xl font-bold text-[#101828]">Privacy Policy & Security</h2>
        <p className="text-sm text-[#475467] leading-relaxed">
          TechNova collects only the contact and shipping details needed to fulfill orders and provide
          live shipment tracking. Raw payment card numbers and CVV codes are never stored in our
          database.
        </p>
        <ul className="space-y-1.5 text-xs text-[#475467]">
          <li className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-[#0860E8]" /> Password credentials are salted and hashed with scrypt.
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-[#0860E8]" /> Order prices and inventory are verified server-side on every checkout.
          </li>
        </ul>
      </section>

      <section id="terms" className="rounded-3xl border border-[#E5EAF2] bg-white p-6 sm:p-8 space-y-3">
        <h2 className="font-display text-xl font-bold text-[#101828]">Terms & Conditions</h2>
        <p className="text-sm text-[#475467] leading-relaxed">
          Devices are eligible for return or exchange within 30 days of delivery provided the retail
          packaging and accessories remain intact. Promotional coupon codes are subject to minimum
          order thresholds and expiration dates.
        </p>
      </section>
    </div>
  );
};
