import test from 'node:test';
import assert from 'node:assert/strict';
import {
  advanceOrderTimeline,
  buildInitialTimeline,
  calculateDiscountAmount,
  calculateOrderTotals,
  derivePaymentStatus,
  maskPaymentReference,
  sanitizeQuantity,
  validateShippingAddress,
} from './commerce';
import type {Coupon, Product, ProductVariant} from '../types';

const sampleProduct: Product = {
  id: 'prod-iphone-16-pro',
  slug: 'iphone-16-pro',
  name: 'iPhone 16 Pro',
  brandId: 'brand-apple',
  brandName: 'Apple',
  categoryId: 'cat-smartphones',
  categoryName: 'Smartphones',
  shortSpec: '256GB · Blue Titanium',
  description: 'Flagship smartphone',
  price: 339999,
  originalPrice: 359999,
  discountPercent: 6,
  rating: 4.8,
  reviewCount: 250,
  isPopular: true,
  isBestDeal: false,
  displaySpec: '6.3" OLED',
  chipSpec: 'A18 Pro',
  connectivitySpec: '5G Ready',
  cameraSpec: '48MP Triple',
  batterySpec: '3582 mAh',
  images: ['/src/assets/images/phone_iphone16_pro_1795612214518.jpg'],
  active: true,
  createdAt: '2026-01-01T00:00:00.000Z',
};

const sampleVariant: ProductVariant = {
  id: 'var-1',
  productId: 'prod-iphone-16-pro',
  storage: '256GB',
  colorName: 'Blue Titanium',
  colorHex: '#2C4A78',
  price: 339999,
  originalPrice: 359999,
  stock: 10,
  sku: 'IP16P-256-BLU',
};

const lowPriceVariant: ProductVariant = {
  ...sampleVariant,
  id: 'var-2',
  price: 5000,
  originalPrice: 5000,
  stock: 4,
};

test('sanitizeQuantity clamps invalid and over-stock values', () => {
  assert.equal(sanitizeQuantity(0, 10), 1);
  assert.equal(sanitizeQuantity(-5, 10), 1);
  assert.equal(sanitizeQuantity('abc', 10), 1);
  assert.equal(sanitizeQuantity(15, 4), 4);
  assert.equal(sanitizeQuantity(3, 10), 3);
});

test('calculateDiscountAmount enforces minimum order, max discount, and expiry', () => {
  const activeCoupon: Coupon = {
    id: 'c1',
    code: 'TECHNOVA10',
    type: 'percent',
    value: 10,
    minOrderAmount: 20000,
    maxDiscount: 25000,
    active: true,
    expiresAt: '2099-01-01T00:00:00.000Z',
    usageCount: 0,
  };
  assert.equal(calculateDiscountAmount(10000, activeCoupon), 0);
  assert.equal(calculateDiscountAmount(100000, activeCoupon), 10000);
  assert.equal(calculateDiscountAmount(339999, activeCoupon), 25000);

  const expiredCoupon: Coupon = {...activeCoupon, expiresAt: '2020-01-01T00:00:00.000Z'};
  assert.equal(calculateDiscountAmount(100000, expiredCoupon), 0);
});

test('calculateOrderTotals applies free shipping threshold and discount accurately', () => {
  const settings = {freeShippingThreshold: 10000, standardShippingFee: 500};

  const freeShippingSummary = calculateOrderTotals(
    [{product: sampleProduct, variant: sampleVariant, quantity: 1}],
    settings
  );
  assert.equal(freeShippingSummary.subtotal, 339999);
  assert.equal(freeShippingSummary.shippingCost, 0);
  assert.equal(freeShippingSummary.total, 339999);

  const paidShippingSummary = calculateOrderTotals(
    [{product: sampleProduct, variant: lowPriceVariant, quantity: 1}],
    settings
  );
  assert.equal(paidShippingSummary.subtotal, 5000);
  assert.equal(paidShippingSummary.shippingCost, 500);
  assert.equal(paidShippingSummary.total, 5500);
});

test('maskPaymentReference never exposes raw card digits', () => {
  const masked = maskPaymentReference('Credit / Debit Card', '4111 2222 3333 4444');
  assert.equal(masked, 'Sandbox Card •••• 4444');
  assert.equal(masked.includes('4111'), false);
  assert.equal(derivePaymentStatus('Cash on Delivery'), 'Pending COD');
  assert.equal(derivePaymentStatus('Credit / Debit Card'), 'Paid');
});

test('timeline progression updates completed steps accurately', () => {
  const initial = buildInitialTimeline('2026-11-25T10:00:00.000Z');
  assert.equal(initial[0].completed, true);
  assert.equal(initial[1].completed, false);

  const shipped = advanceOrderTimeline(initial, 'Shipped', '2026-11-25T14:00:00.000Z');
  assert.equal(shipped[0].completed, true);
  assert.equal(shipped[1].completed, true);
  assert.equal(shipped[2].completed, true);
  assert.equal(shipped[3].completed, false);
});

test('validateShippingAddress rejects incomplete addresses and accepts valid ones', () => {
  assert.notEqual(validateShippingAddress({fullName: 'A'}), null);
  assert.equal(
    validateShippingAddress({
      fullName: 'Sarah Ahmed',
      email: 'sarah@example.com',
      phone: '+92 300 1234567',
      country: 'Pakistan',
      city: 'Karachi',
      area: 'Clifton Block 4',
      streetAddress: 'House 12, Street 4',
      postalCode: '75600',
    }),
    null
  );
});
