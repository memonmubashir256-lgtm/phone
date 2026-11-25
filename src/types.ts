export type UserRole = 'customer' | 'admin';

export type OrderStatus =
  | 'Order Placed'
  | 'Processing'
  | 'Shipped'
  | 'Out for Delivery'
  | 'Delivered'
  | 'Cancelled'
  | 'Returned';

export type PaymentMethod =
  | 'Credit / Debit Card'
  | 'JazzCash'
  | 'Easypaisa'
  | 'Bank Transfer'
  | 'Cash on Delivery';

export type PaymentStatus = 'Paid' | 'Pending COD' | 'Awaiting Verification' | 'Refunded';

export interface PublicUser {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  role: UserRole;
  pushSubscribed: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Brand {
  id: string;
  name: string;
  slug: string;
  tagline: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
}

export interface ProductVariant {
  id: string;
  productId: string;
  storage: string;
  colorName: string;
  colorHex: string;
  price: number;
  originalPrice: number;
  stock: number;
  sku: string;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  brandId: string;
  brandName: string;
  categoryId: string;
  categoryName: string;
  shortSpec: string;
  description: string;
  price: number;
  originalPrice: number;
  discountPercent: number;
  rating: number;
  reviewCount: number;
  badge?: string;
  isPopular: boolean;
  isBestDeal: boolean;
  displaySpec: string;
  chipSpec: string;
  connectivitySpec: string;
  cameraSpec: string;
  batterySpec: string;
  images: string[];
  active: boolean;
  createdAt: string;
  variants: ProductVariant[];
}

export interface CartLineItem {
  productId: string;
  variantId: string;
  quantity: number;
}

export interface ShippingAddress {
  fullName: string;
  email: string;
  phone: string;
  country: string;
  city: string;
  area: string;
  streetAddress: string;
  postalCode: string;
}

export interface Address {
  id: string;
  userId: string;
  label: string;
  fullName: string;
  phone: string;
  country: string;
  city: string;
  area: string;
  streetAddress: string;
  postalCode: string;
  isDefault: boolean;
}

export interface TimelineEvent {
  status: OrderStatus;
  label: string;
  timestamp: string;
  completed: boolean;
  note?: string;
}

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  variantId: string;
  productName: string;
  variantLabel: string;
  image: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
}

export interface Order {
  id: string;
  orderNumber: string;
  userId?: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress: ShippingAddress;
  status: OrderStatus;
  timeline: TimelineEvent[];
  trackingCode: string;
  carrier: string;
  estimatedDelivery: string;
  subtotal: number;
  shippingCost: number;
  discountAmount: number;
  couponCode?: string;
  total: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
}

export interface Review {
  id: string;
  productId: string;
  userId?: string;
  authorName: string;
  rating: number;
  comment: string;
  verifiedPurchase: boolean;
  createdAt: string;
}

export interface NotificationItem {
  id: string;
  userId?: string;
  title: string;
  body: string;
  category: 'order' | 'offer' | 'arrival';
  read: boolean;
  createdAt: string;
}

export interface HeroSlide {
  id: string;
  kicker: string;
  title: string;
  subtitle: string;
  description: string;
  ctaText: string;
  productSlug: string;
  image: string;
  active: boolean;
}

export interface WebsiteSettings {
  storeName: string;
  tagline: string;
  currency: string;
  freeShippingThreshold: number;
  standardShippingFee: number;
  promoBannerTitle: string;
  promoBannerSubtitle: string;
  promoBannerDiscount: string;
  paymentMethodsEnabled: Record<PaymentMethod, boolean>;
  pushNotificationsEnabled: boolean;
  supportEmail: string;
  supportPhone: string;
}

export interface Coupon {
  id: string;
  code: string;
  type: 'percent' | 'fixed';
  value: number;
  minOrderAmount: number;
  maxDiscount: number;
  active: boolean;
  expiresAt: string;
  usageCount: number;
}
