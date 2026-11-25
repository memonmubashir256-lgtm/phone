import type {
  Coupon,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  Product,
  ProductVariant,
  ShippingAddress,
  TimelineEvent,
} from '../types';

export interface CartCalculationInputItem {
  product: Product;
  variant: ProductVariant;
  quantity: number;
}

export interface OrderPricingSummary {
  subtotal: number;
  shippingCost: number;
  discountAmount: number;
  total: number;
  appliedCouponCode?: string;
}

export const ORDER_FLOW_STEPS: OrderStatus[] = [
  'Order Placed',
  'Processing',
  'Shipped',
  'Out for Delivery',
  'Delivered',
];

export function sanitizeQuantity(qty: unknown, maxStock: number): number {
  const parsed = typeof qty === 'number' ? Math.floor(qty) : Number.parseInt(String(qty), 10);
  if (!Number.isFinite(parsed) || parsed < 1) return 1;
  if (maxStock > 0 && parsed > maxStock) return maxStock;
  return Math.min(parsed, 20);
}

export function calculateDiscountAmount(subtotal: number, coupon?: Coupon | null): number {
  if (!coupon || !coupon.active || subtotal <= 0) return 0;
  if (coupon.expiresAt && new Date(coupon.expiresAt).getTime() < Date.now()) return 0;
  if (subtotal < coupon.minOrderAmount) return 0;

  let discount = 0;
  if (coupon.type === 'percent') {
    discount = Math.round((subtotal * coupon.value) / 100);
  } else {
    discount = Math.round(coupon.value);
  }
  if (coupon.maxDiscount > 0) {
    discount = Math.min(discount, coupon.maxDiscount);
  }
  return Math.max(0, Math.min(discount, subtotal));
}

export function calculateOrderTotals(
  items: CartCalculationInputItem[],
  settings: {freeShippingThreshold: number; standardShippingFee: number},
  coupon?: Coupon | null
): OrderPricingSummary {
  const subtotal = items.reduce((sum, item) => {
    const qty = Math.max(1, Math.floor(item.quantity));
    return sum + item.variant.price * qty;
  }, 0);

  const discountAmount = calculateDiscountAmount(subtotal, coupon);
  const netAfterDiscount = Math.max(0, subtotal - discountAmount);
  const shippingCost =
    subtotal === 0 || netAfterDiscount >= settings.freeShippingThreshold
      ? 0
      : settings.standardShippingFee;
  const total = netAfterDiscount + shippingCost;

  return {
    subtotal,
    shippingCost,
    discountAmount,
    total,
    appliedCouponCode: discountAmount > 0 && coupon ? coupon.code : undefined,
  };
}

export function derivePaymentStatus(method: PaymentMethod): PaymentStatus {
  if (method === 'Cash on Delivery') return 'Pending COD';
  if (method === 'Bank Transfer') return 'Awaiting Verification';
  return 'Paid';
}

export function maskPaymentReference(method: PaymentMethod, rawInput?: string): string {
  const cleaned = (rawInput || '').replace(/\s+/g, '').trim();
  if (method === 'Credit / Debit Card') {
    const digits = cleaned.replace(/\D/g, '');
    const last4 = digits.length >= 4 ? digits.slice(-4) : '4242';
    return `Sandbox Card •••• ${last4}`;
  }
  if (method === 'JazzCash' || method === 'Easypaisa') {
    const digits = cleaned.replace(/\D/g, '');
    const last4 = digits.length >= 4 ? digits.slice(-4) : '0000';
    return `${method} •••• ${last4}`;
  }
  if (method === 'Bank Transfer') {
    return cleaned ? `IBAN Ref ${cleaned.slice(-6).toUpperCase()}` : 'Bank Transfer Pending';
  }
  return 'Pay on Delivery';
}

export function buildInitialTimeline(placedAtIso: string): TimelineEvent[] {
  return ORDER_FLOW_STEPS.map((status, idx) => ({
    status,
    label: status,
    timestamp: idx === 0 ? placedAtIso : '',
    completed: idx === 0,
    note: idx === 0 ? 'Order received and confirmed by TechNova.' : undefined,
  }));
}

export function advanceOrderTimeline(
  currentTimeline: TimelineEvent[],
  nextStatus: OrderStatus,
  updatedAtIso: string,
  note?: string
): TimelineEvent[] {
  if (nextStatus === 'Cancelled' || nextStatus === 'Returned') {
    const preserved = currentTimeline.filter(
      (step) => step.status !== 'Cancelled' && step.status !== 'Returned'
    );
    return [
      ...preserved,
      {
        status: nextStatus,
        label: nextStatus,
        timestamp: updatedAtIso,
        completed: true,
        note: note || `Order marked as ${nextStatus}.`,
      },
    ];
  }

  const targetIdx = ORDER_FLOW_STEPS.indexOf(nextStatus);
  return ORDER_FLOW_STEPS.map((stepStatus, idx) => {
    const existing = currentTimeline.find((item) => item.status === stepStatus);
    const completed = idx <= targetIdx;
    return {
      status: stepStatus,
      label: stepStatus,
      completed,
      timestamp: completed ? existing?.timestamp || updatedAtIso : '',
      note: idx === targetIdx && note ? note : existing?.note,
    };
  });
}

export function validateShippingAddress(addr: Partial<ShippingAddress>): string | null {
  if (!addr.fullName || addr.fullName.trim().length < 2) return 'Full name is required.';
  if (!addr.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(addr.email.trim())) {
    return 'A valid email address is required.';
  }
  if (!addr.phone || addr.phone.replace(/\D/g, '').length < 7) {
    return 'A valid phone number is required.';
  }
  if (!addr.country || addr.country.trim().length < 2) return 'Country is required.';
  if (!addr.city || addr.city.trim().length < 2) return 'City is required.';
  if (!addr.area || addr.area.trim().length < 2) return 'Area / neighborhood is required.';
  if (!addr.streetAddress || addr.streetAddress.trim().length < 5) {
    return 'Complete street address is required.';
  }
  if (!addr.postalCode || addr.postalCode.trim().length < 3) return 'Postal code is required.';
  return null;
}

export function generateOrderNumber(): string {
  const num = Math.floor(100000 + Math.random() * 900000);
  return `#TN${num}`;
}
