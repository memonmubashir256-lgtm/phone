import crypto from 'node:crypto';
import type {NextFunction, Request, Response} from 'express';
import {Router} from 'express';
import {getDb, saveDb, toPublicUser} from '../database/store';
import {
  generateResetToken,
  hashPassword,
  hashResetToken,
  signSessionToken,
  verifyPassword,
  verifySessionToken,
} from '../services/auth';
import {
  advanceOrderTimeline,
  buildInitialTimeline,
  calculateOrderTotals,
  derivePaymentStatus,
  generateOrderNumber,
  maskPaymentReference,
  sanitizeQuantity,
  validateShippingAddress,
} from '../services/commerce';
import type {
  Address,
  Coupon,
  Order,
  OrderItem,
  OrderStatus,
  PaymentMethod,
  Product,
  ProductVariant,
  ProductWithVariants,
  User,
} from '../types';

interface AuthedRequest extends Request {
  authUser?: User;
}

// Simple sliding-window rate limiter per IP + bucket
const rateBuckets = new Map<string, number[]>();
function rateLimit(bucket: string, maxRequests: number, windowMs: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    const key = `${bucket}:${req.ip || 'unknown'}`;
    const now = Date.now();
    const history = (rateBuckets.get(key) || []).filter((ts) => now - ts < windowMs);
    if (history.length >= maxRequests) {
      res.status(429).json({error: 'Too many requests. Please wait a moment and try again.'});
      return;
    }
    history.push(now);
    rateBuckets.set(key, history);
    next();
  };
}

function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  if (!cookieHeader) return {};
  const out: Record<string, string> = {};
  for (const part of cookieHeader.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    if (k) out[k] = decodeURIComponent(v);
  }
  return out;
}

function extractToken(req: Request): string | undefined {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }
  const cookies = parseCookies(req.headers.cookie);
  return cookies.technova_session;
}

function setSessionCookie(req: Request, res: Response, token: string): void {
  const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https';
  if (isHttps) {
    res.setHeader(
      'Set-Cookie',
      `technova_session=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=None; Partitioned; Max-Age=${60 * 60 * 24 * 7}`
    );
  } else {
    res.setHeader(
      'Set-Cookie',
      `technova_session=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 7}`
    );
  }
}

function clearSessionCookie(req: Request, res: Response): void {
  const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https';
  res.setHeader(
    'Set-Cookie',
    `technova_session=; Path=/; HttpOnly; ${isHttps ? 'Secure; SameSite=None; Partitioned;' : 'SameSite=Lax;'} Max-Age=0`
  );
}

function optionalAuth(req: AuthedRequest, _res: Response, next: NextFunction): void {
  const token = extractToken(req);
  const payload = verifySessionToken(token);
  if (payload) {
    const db = getDb();
    const user = db.users.find((u) => u.id === payload.sub);
    if (user) req.authUser = user;
  }
  next();
}

function requireAuth(req: AuthedRequest, res: Response, next: NextFunction): void {
  optionalAuth(req, res, () => {
    if (!req.authUser) {
      res.status(401).json({error: 'Authentication required.'});
      return;
    }
    next();
  });
}

function requireAdmin(req: AuthedRequest, res: Response, next: NextFunction): void {
  optionalAuth(req, res, () => {
    if (!req.authUser || req.authUser.role !== 'admin') {
      res.status(403).json({error: 'Administrator access required.'});
      return;
    }
    next();
  });
}

function attachVariants(products: Product[], variants: ProductVariant[]): ProductWithVariants[] {
  return products.map((product) => ({
    ...product,
    variants: variants.filter((v) => v.productId === product.id),
  }));
}

export function createApiRouter(): Router {
  const router = Router();

  // Storefront bootstrap data
  router.get('/store/bootstrap', optionalAuth, (req: AuthedRequest, res) => {
    const db = getDb();
    const activeProducts = attachVariants(
      db.products.filter((p) => p.active),
      db.productVariants
    );
    res.json({
      brands: db.brands,
      categories: db.categories,
      products: activeProducts,
      heroSlides: db.heroSlides.filter((s) => s.active),
      settings: db.websiteSettings,
      notifications: db.notifications.slice(0, 10),
      user: req.authUser ? toPublicUser(req.authUser) : null,
    });
  });

  // Catalog search & filtering
  router.get('/products', (req, res) => {
    const db = getDb();
    const q = typeof req.query.q === 'string' ? req.query.q.trim().toLowerCase() : '';
    const brand = typeof req.query.brand === 'string' ? req.query.brand.trim().toLowerCase() : '';
    const category = typeof req.query.category === 'string' ? req.query.category.trim().toLowerCase() : '';
    const dealsOnly = req.query.deals === 'true';

    let list = db.products.filter((p) => p.active);
    if (q) {
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.brandName.toLowerCase().includes(q) ||
          p.shortSpec.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q)
      );
    }
    if (brand && brand !== 'all') {
      list = list.filter((p) => p.brandName.toLowerCase() === brand || p.brandId === brand);
    }
    if (category && category !== 'all') {
      list = list.filter((p) => p.categoryName.toLowerCase() === category || p.categoryId === category);
    }
    if (dealsOnly) {
      list = list.filter((p) => p.discountPercent >= 10 || p.isBestDeal);
    }

    res.json({products: attachVariants(list, db.productVariants)});
  });

  // Single product with reviews & related
  router.get('/products/:slug', (req, res) => {
    const db = getDb();
    const slug = String(req.params.slug || '');
    const product = db.products.find((p) => (p.slug === slug || p.id === slug) && p.active);
    if (!product) {
      res.status(404).json({error: 'Product not found.'});
      return;
    }
    const variants = db.productVariants.filter((v) => v.productId === product.id);
    const reviews = db.reviews
      .filter((r) => r.productId === product.id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const related = attachVariants(
      db.products.filter((p) => p.active && p.id !== product.id).slice(0, 4),
      db.productVariants
    );
    res.json({product: {...product, variants}, reviews, related});
  });

  // Add product review
  router.post('/products/:id/reviews', rateLimit('reviews', 10, 60_000), optionalAuth, (req: AuthedRequest, res) => {
    const db = getDb();
    const product = db.products.find((p) => p.id === req.params.id && p.active);
    if (!product) {
      res.status(404).json({error: 'Product not found.'});
      return;
    }
    const rating = Number(req.body?.rating);
    const comment = typeof req.body?.comment === 'string' ? req.body.comment.trim() : '';
    const authorName =
      req.authUser?.fullName ||
      (typeof req.body?.authorName === 'string' ? req.body.authorName.trim() : '');

    if (!authorName || authorName.length < 2) {
      res.status(400).json({error: 'Your name is required.'});
      return;
    }
    if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
      res.status(400).json({error: 'Rating must be between 1 and 5.'});
      return;
    }
    if (comment.length < 6 || comment.length > 800) {
      res.status(400).json({error: 'Review comment must be between 6 and 800 characters.'});
      return;
    }

    const review = {
      id: `rev-${crypto.randomUUID().slice(0, 8)}`,
      productId: product.id,
      userId: req.authUser?.id,
      authorName,
      rating: Math.round(rating),
      comment,
      verifiedPurchase: Boolean(req.authUser),
      createdAt: new Date().toISOString(),
    };
    db.reviews.unshift(review);

    const productReviews = db.reviews.filter((r) => r.productId === product.id);
    const avg = productReviews.reduce((s, r) => s + r.rating, 0) / productReviews.length;
    product.rating = Math.round(avg * 10) / 10;
    product.reviewCount = productReviews.length;
    saveDb(db);

    res.status(201).json({review, rating: product.rating, reviewCount: product.reviewCount});
  });

  // Coupon validation & cart pricing preview
  router.post('/cart/quote', (req, res) => {
    const db = getDb();
    const rawItems = Array.isArray(req.body?.items) ? req.body.items : [];
    const couponCode = typeof req.body?.couponCode === 'string' ? req.body.couponCode.trim().toUpperCase() : '';

    const resolvedItems = [];
    for (const entry of rawItems) {
      if (!entry || typeof entry !== 'object') continue;
      const product = db.products.find((p) => p.id === entry.productId && p.active);
      const variant = db.productVariants.find(
        (v) => v.id === entry.variantId && v.productId === entry.productId
      );
      if (!product || !variant) continue;
      resolvedItems.push({
        product,
        variant,
        quantity: sanitizeQuantity(entry.quantity, variant.stock),
      });
    }

    const coupon = couponCode ? db.coupons.find((c) => c.code.toUpperCase() === couponCode) : null;
    if (couponCode && (!coupon || !coupon.active)) {
      const summary = calculateOrderTotals(resolvedItems, db.websiteSettings, null);
      res.status(400).json({error: 'Invalid or inactive promo code.', summary});
      return;
    }
    if (coupon && resolvedItems.length > 0) {
      const subtotal = resolvedItems.reduce((s, i) => s + i.variant.price * i.quantity, 0);
      if (subtotal < coupon.minOrderAmount) {
        const summary = calculateOrderTotals(resolvedItems, db.websiteSettings, null);
        res.status(400).json({
          error: `Promo code ${coupon.code} requires a minimum order of ${db.websiteSettings.currency} ${coupon.minOrderAmount.toLocaleString()}.`,
          summary,
        });
        return;
      }
    }

    const summary = calculateOrderTotals(resolvedItems, db.websiteSettings, coupon);
    res.json({summary});
  });

  // Secure order creation (strict server-side price & stock validation)
  router.post('/orders', rateLimit('orders', 15, 60_000), optionalAuth, (req: AuthedRequest, res) => {
    const db = getDb();
    const itemsInput = Array.isArray(req.body?.items) ? req.body.items : [];
    if (itemsInput.length === 0) {
      res.status(400).json({error: 'Your cart is empty.'});
      return;
    }

    const addressErr = validateShippingAddress(req.body?.shippingAddress || {});
    if (addressErr) {
      res.status(400).json({error: addressErr});
      return;
    }

    const paymentMethod = req.body?.paymentMethod as PaymentMethod;
    if (!paymentMethod || !db.websiteSettings.paymentMethodsEnabled[paymentMethod]) {
      res.status(400).json({error: 'Selected payment method is invalid or currently disabled.'});
      return;
    }

    const resolvedItems = [];
    for (const entry of itemsInput) {
      if (!entry || typeof entry !== 'object') continue;
      const product = db.products.find((p) => p.id === entry.productId && p.active);
      const variant = db.productVariants.find(
        (v) => v.id === entry.variantId && v.productId === entry.productId
      );
      if (!product || !variant) {
        res.status(400).json({error: 'One or more products in your cart are no longer available.'});
        return;
      }
      const requestedQty = Number(entry.quantity);
      if (!Number.isInteger(requestedQty) || requestedQty < 1 || requestedQty > 20) {
        res.status(400).json({error: `Invalid quantity for ${product.name}.`});
        return;
      }
      if (variant.stock < requestedQty) {
        res.status(400).json({
          error: `Only ${variant.stock} unit(s) of ${product.name} (${variant.storage} · ${variant.colorName}) remain in stock.`,
        });
        return;
      }
      resolvedItems.push({product, variant, quantity: requestedQty});
    }

    const couponCode =
      typeof req.body?.couponCode === 'string' ? req.body.couponCode.trim().toUpperCase() : '';
    const coupon = couponCode ? db.coupons.find((c) => c.code.toUpperCase() === couponCode) : null;
    const summary = calculateOrderTotals(resolvedItems, db.websiteSettings, coupon);

    // Deduct stock atomically
    for (const item of resolvedItems) {
      item.variant.stock -= item.quantity;
    }
    if (coupon && summary.discountAmount > 0) {
      coupon.usageCount += 1;
    }

    const now = new Date().toISOString();
    const deliveryDate = new Date(Date.now() + 1000 * 60 * 60 * 24 * 3).toISOString().slice(0, 10);
    const orderId = `ord-${crypto.randomUUID().slice(0, 10)}`;
    let orderNumber = generateOrderNumber();
    while (db.orders.some((o) => o.orderNumber === orderNumber)) {
      orderNumber = generateOrderNumber();
    }

    const addr = req.body.shippingAddress;
    const cleanAddress = {
      fullName: String(addr.fullName).trim(),
      email: String(addr.email).trim().toLowerCase(),
      phone: String(addr.phone).trim(),
      country: String(addr.country).trim(),
      city: String(addr.city).trim(),
      area: String(addr.area).trim(),
      streetAddress: String(addr.streetAddress).trim(),
      postalCode: String(addr.postalCode).trim(),
    };

    const paymentStatus = derivePaymentStatus(paymentMethod);
    const order: Order = {
      id: orderId,
      orderNumber,
      userId: req.authUser?.id,
      customerName: cleanAddress.fullName,
      customerEmail: cleanAddress.email,
      customerPhone: cleanAddress.phone,
      shippingAddress: cleanAddress,
      status: 'Order Placed',
      timeline: buildInitialTimeline(now),
      trackingCode: `TN-EXP-${Math.floor(100000 + Math.random() * 899999)}`,
      carrier: 'TechNova Express',
      estimatedDelivery: deliveryDate,
      subtotal: summary.subtotal,
      shippingCost: summary.shippingCost,
      discountAmount: summary.discountAmount,
      couponCode: summary.appliedCouponCode,
      total: summary.total,
      paymentMethod,
      paymentStatus,
      createdAt: now,
      updatedAt: now,
    };

    const orderItems: OrderItem[] = resolvedItems.map((item) => ({
      id: `oi-${crypto.randomUUID().slice(0, 8)}`,
      orderId,
      productId: item.product.id,
      variantId: item.variant.id,
      productName: item.product.name,
      variantLabel: `${item.variant.storage} · ${item.variant.colorName}`,
      image: item.product.images[0] || '',
      unitPrice: item.variant.price,
      quantity: item.quantity,
      lineTotal: item.variant.price * item.quantity,
    }));

    const paymentRefInput =
      typeof req.body?.paymentReference === 'string' ? req.body.paymentReference : undefined;
    db.payments.unshift({
      id: `pay-${crypto.randomUUID().slice(0, 8)}`,
      orderId,
      method: paymentMethod,
      mode:
        paymentMethod === 'Cash on Delivery'
          ? 'cod'
          : paymentMethod === 'Bank Transfer'
            ? 'bank_transfer'
            : 'demo_sandbox',
      status: paymentStatus,
      maskedReference: maskPaymentReference(paymentMethod, paymentRefInput),
      amount: summary.total,
      currency: db.websiteSettings.currency,
      createdAt: now,
    });

    db.orders.unshift(order);
    db.orderItems.push(...orderItems);

    if (req.authUser) {
      db.cartItems = db.cartItems.filter((c) => c.userId !== req.authUser!.id);
    }

    db.notifications.unshift({
      id: `notif-${crypto.randomUUID().slice(0, 8)}`,
      userId: req.authUser?.id,
      title: `Order ${order.orderNumber} Confirmed`,
      body: `We received your order for ${orderItems[0].productName}${orderItems.length > 1 ? ` + ${orderItems.length - 1} more` : ''}.`,
      category: 'order',
      read: false,
      createdAt: now,
    });

    saveDb(db);
    res.status(201).json({order: {...order, items: orderItems}});
  });

  // Track order (by Order ID + Phone OR authenticated owner)
  router.get('/orders/track', optionalAuth, (req: AuthedRequest, res) => {
    const db = getDb();
    const rawOrderNumber = typeof req.query.orderNumber === 'string' ? req.query.orderNumber.trim() : '';
    const rawPhone = typeof req.query.phone === 'string' ? req.query.phone.replace(/\D/g, '') : '';

    if (!rawOrderNumber) {
      res.status(400).json({error: 'Order number is required.'});
      return;
    }

    const normalized = rawOrderNumber.startsWith('#')
      ? rawOrderNumber.toUpperCase()
      : `#${rawOrderNumber.toUpperCase()}`;

    const order = db.orders.find((o) => o.orderNumber.toUpperCase() === normalized);
    if (!order) {
      res.status(404).json({error: 'Order not found. Check your order number (e.g. #TN784512).'});
      return;
    }

    const isOwner = req.authUser && (order.userId === req.authUser.id || req.authUser.role === 'admin');
    const orderPhoneDigits = order.customerPhone.replace(/\D/g, '');
    const phoneMatches =
      rawPhone.length >= 4 &&
      (orderPhoneDigits === rawPhone || orderPhoneDigits.endsWith(rawPhone.slice(-7)));

    if (!isOwner && !phoneMatches) {
      res.status(403).json({
        error: 'Please enter the phone number used on this order or sign in to view tracking.',
      });
      return;
    }

    const items = db.orderItems.filter((oi) => oi.orderId === order.id);
    res.json({order: {...order, items}});
  });

  // Authentication: Sign Up
  router.post('/auth/signup', rateLimit('auth', 20, 60_000), (req, res) => {
    const db = getDb();
    const fullName = typeof req.body?.fullName === 'string' ? req.body.fullName.trim() : '';
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const phone = typeof req.body?.phone === 'string' ? req.body.phone.trim() : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';

    if (fullName.length < 2) {
      res.status(400).json({error: 'Full name must be at least 2 characters.'});
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      res.status(400).json({error: 'Enter a valid email address.'});
      return;
    }
    if (password.length < 8) {
      res.status(400).json({error: 'Password must be at least 8 characters long.'});
      return;
    }
    if (db.users.some((u) => u.email.toLowerCase() === email)) {
      res.status(409).json({error: 'An account with this email already exists.'});
      return;
    }

    const now = new Date().toISOString();
    const user: User = {
      id: `usr-${crypto.randomUUID().slice(0, 10)}`,
      fullName,
      email,
      phone,
      passwordHash: hashPassword(password),
      role: 'customer',
      pushSubscribed: false,
      createdAt: now,
      updatedAt: now,
    };
    db.users.push(user);
    saveDb(db);

    const token = signSessionToken({sub: user.id, email: user.email, role: user.role});
    setSessionCookie(req, res, token);
    res.status(201).json({user: toPublicUser(user), token});
  });

  // Authentication: Login
  router.post('/auth/login', rateLimit('auth', 25, 60_000), (req, res) => {
    const db = getDb();
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';

    const user = db.users.find((u) => u.email.toLowerCase() === email);
    if (!user || !verifyPassword(password, user.passwordHash)) {
      res.status(401).json({error: 'Invalid email or password.'});
      return;
    }

    const token = signSessionToken({sub: user.id, email: user.email, role: user.role});
    setSessionCookie(req, res, token);
    res.json({user: toPublicUser(user), token});
  });

  // Authentication: Logout
  router.post('/auth/logout', (req, res) => {
    clearSessionCookie(req, res);
    res.json({ok: true});
  });

  // Authentication: Current session
  router.get('/auth/me', optionalAuth, (req: AuthedRequest, res) => {
    res.json({user: req.authUser ? toPublicUser(req.authUser) : null});
  });

  // Authentication: Forgot & Reset Password
  router.post('/auth/forgot-password', rateLimit('auth', 10, 60_000), (req, res) => {
    const db = getDb();
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const user = db.users.find((u) => u.email.toLowerCase() === email);
    if (!user) {
      res.json({
        message: 'If an account matches that email, a password reset link has been generated.',
      });
      return;
    }

    const reset = generateResetToken();
    user.resetTokenHash = reset.hashed;
    user.resetTokenExpiresAt = reset.expiresAt;
    user.updatedAt = new Date().toISOString();
    saveDb(db);

    res.json({
      message: 'Password reset token generated for this demo environment.',
      demoResetToken: reset.raw,
    });
  });

  router.post('/auth/reset-password', rateLimit('auth', 10, 60_000), (req, res) => {
    const db = getDb();
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const token = typeof req.body?.token === 'string' ? req.body.token.trim() : '';
    const newPassword = typeof req.body?.newPassword === 'string' ? req.body.newPassword : '';

    if (newPassword.length < 8) {
      res.status(400).json({error: 'New password must be at least 8 characters.'});
      return;
    }

    const user = db.users.find((u) => u.email.toLowerCase() === email);
    if (
      !user ||
      !user.resetTokenHash ||
      !user.resetTokenExpiresAt ||
      user.resetTokenExpiresAt < Date.now() ||
      user.resetTokenHash !== hashResetToken(token)
    ) {
      res.status(400).json({error: 'Invalid or expired reset token.'});
      return;
    }

    user.passwordHash = hashPassword(newPassword);
    delete user.resetTokenHash;
    delete user.resetTokenExpiresAt;
    user.updatedAt = new Date().toISOString();
    saveDb(db);

    res.json({message: 'Password updated successfully. You can now sign in.'});
  });

  // User Profile, Orders, Addresses, Wishlist, Cart sync
  router.get('/account/overview', requireAuth, (req: AuthedRequest, res) => {
    const db = getDb();
    const userId = req.authUser!.id;
    const orders = db.orders
      .filter((o) => o.userId === userId || o.customerEmail.toLowerCase() === req.authUser!.email.toLowerCase())
      .map((order) => ({
        ...order,
        items: db.orderItems.filter((oi) => oi.orderId === order.id),
      }));
    const addresses = db.addresses.filter((a) => a.userId === userId);
    const wishlistProductIds = db.wishlists.filter((w) => w.userId === userId).map((w) => w.productId);
    const cartItems = db.cartItems.filter((c) => c.userId === userId);

    res.json({
      user: toPublicUser(req.authUser!),
      orders,
      addresses,
      wishlistProductIds,
      cartItems,
    });
  });

  router.patch('/account/profile', requireAuth, (req: AuthedRequest, res) => {
    const db = getDb();
    const user = db.users.find((u) => u.id === req.authUser!.id);
    if (!user) {
      res.status(404).json({error: 'User not found.'});
      return;
    }
    if (typeof req.body?.fullName === 'string' && req.body.fullName.trim().length >= 2) {
      user.fullName = req.body.fullName.trim();
    }
    if (typeof req.body?.phone === 'string') {
      user.phone = req.body.phone.trim();
    }
    if (typeof req.body?.pushSubscribed === 'boolean') {
      user.pushSubscribed = req.body.pushSubscribed;
    }
    user.updatedAt = new Date().toISOString();
    saveDb(db);
    res.json({user: toPublicUser(user)});
  });

  router.post('/account/addresses', requireAuth, (req: AuthedRequest, res) => {
    const db = getDb();
    const err = validateShippingAddress({
      ...req.body,
      email: req.authUser!.email,
    });
    if (err) {
      res.status(400).json({error: err});
      return;
    }
    const addr: Address = {
      id: `addr-${crypto.randomUUID().slice(0, 8)}`,
      userId: req.authUser!.id,
      label: typeof req.body?.label === 'string' && req.body.label.trim() ? req.body.label.trim() : 'Home',
      fullName: String(req.body.fullName).trim(),
      phone: String(req.body.phone).trim(),
      country: String(req.body.country).trim(),
      city: String(req.body.city).trim(),
      area: String(req.body.area).trim(),
      streetAddress: String(req.body.streetAddress).trim(),
      postalCode: String(req.body.postalCode).trim(),
      isDefault: Boolean(req.body?.isDefault),
    };
    if (addr.isDefault) {
      db.addresses.forEach((a) => {
        if (a.userId === req.authUser!.id) a.isDefault = false;
      });
    }
    db.addresses.push(addr);
    saveDb(db);
    res.status(201).json({address: addr});
  });

  router.delete('/account/addresses/:id', requireAuth, (req: AuthedRequest, res) => {
    const db = getDb();
    const idx = db.addresses.findIndex(
      (a) => a.id === req.params.id && a.userId === req.authUser!.id
    );
    if (idx === -1) {
      res.status(404).json({error: 'Address not found.'});
      return;
    }
    db.addresses.splice(idx, 1);
    saveDb(db);
    res.json({ok: true});
  });

  router.post('/account/wishlist/toggle', requireAuth, (req: AuthedRequest, res) => {
    const db = getDb();
    const productId = typeof req.body?.productId === 'string' ? req.body.productId : '';
    if (!db.products.some((p) => p.id === productId)) {
      res.status(404).json({error: 'Product not found.'});
      return;
    }
    const existingIdx = db.wishlists.findIndex(
      (w) => w.userId === req.authUser!.id && w.productId === productId
    );
    let saved = false;
    if (existingIdx >= 0) {
      db.wishlists.splice(existingIdx, 1);
      saved = false;
    } else {
      db.wishlists.push({
        id: `wl-${crypto.randomUUID().slice(0, 8)}`,
        userId: req.authUser!.id,
        productId,
        createdAt: new Date().toISOString(),
      });
      saved = true;
    }
    saveDb(db);
    res.json({
      saved,
      wishlistProductIds: db.wishlists
        .filter((w) => w.userId === req.authUser!.id)
        .map((w) => w.productId),
    });
  });

  router.put('/account/cart', requireAuth, (req: AuthedRequest, res) => {
    const db = getDb();
    const incoming = Array.isArray(req.body?.items) ? req.body.items : [];
    db.cartItems = db.cartItems.filter((c) => c.userId !== req.authUser!.id);
    const now = new Date().toISOString();
    for (const item of incoming) {
      if (!item || typeof item !== 'object') continue;
      const variant = db.productVariants.find(
        (v) => v.id === item.variantId && v.productId === item.productId
      );
      if (!variant) continue;
      db.cartItems.push({
        id: `ci-${crypto.randomUUID().slice(0, 8)}`,
        userId: req.authUser!.id,
        productId: variant.productId,
        variantId: variant.id,
        quantity: sanitizeQuantity(item.quantity, variant.stock),
        updatedAt: now,
      });
    }
    saveDb(db);
    res.json({cartItems: db.cartItems.filter((c) => c.userId === req.authUser!.id)});
  });

  // Newsletter subscription
  router.post('/newsletter', rateLimit('newsletter', 10, 60_000), (req, res) => {
    const db = getDb();
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      res.status(400).json({error: 'Please enter a valid email address.'});
      return;
    }
    if (!db.newsletterSubscribers.some((s) => s.email === email)) {
      db.newsletterSubscribers.unshift({
        id: `sub-${crypto.randomUUID().slice(0, 8)}`,
        email,
        subscribedAt: new Date().toISOString(),
        active: true,
      });
      saveDb(db);
    }
    res.status(201).json({message: 'Subscribed to TechNova updates and exclusive deals!'});
  });

  // Admin setup/claim status (securecoder-persona compliant)
  router.get('/admin/status', optionalAuth, (req: AuthedRequest, res) => {
    const db = getDb();
    const envManaged = Boolean(process.env.ADMIN_PASSCODE?.trim());
    const claimed = Boolean(db.adminConfig?.claimedPasswordHash);
    res.json({
      envManaged,
      claimed,
      needsFirstRunClaim: !envManaged && !claimed,
      isAdmin: req.authUser?.role === 'admin',
      adminEmail: req.authUser?.role === 'admin' ? req.authUser.email : undefined,
    });
  });

  router.post('/admin/claim', rateLimit('admin-auth', 10, 60_000), (req, res) => {
    const db = getDb();
    const envPasscode = process.env.ADMIN_PASSCODE?.trim();
    if (envPasscode || db.adminConfig?.claimedPasswordHash) {
      res.status(409).json({error: 'Admin access has already been configured.'});
      return;
    }
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    const fullName = typeof req.body?.fullName === 'string' ? req.body.fullName.trim() : 'TechNova Admin';

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      res.status(400).json({error: 'A valid administrator email is required.'});
      return;
    }
    if (password.length < 8) {
      res.status(400).json({error: 'Administrator password must be at least 8 characters.'});
      return;
    }

    const now = new Date().toISOString();
    const passwordHash = hashPassword(password);
    db.adminConfig = {
      claimedEmail: email,
      claimedPasswordHash: passwordHash,
      claimedAt: now,
    };

    let adminUser = db.users.find((u) => u.email.toLowerCase() === email);
    if (adminUser) {
      adminUser.role = 'admin';
      adminUser.passwordHash = passwordHash;
      adminUser.updatedAt = now;
    } else {
      adminUser = {
        id: `usr-admin-${crypto.randomUUID().slice(0, 6)}`,
        fullName: fullName || 'TechNova Admin',
        email,
        phone: db.websiteSettings.supportPhone,
        passwordHash,
        role: 'admin',
        pushSubscribed: true,
        createdAt: now,
        updatedAt: now,
      };
      db.users.push(adminUser);
    }
    saveDb(db);

    const token = signSessionToken({sub: adminUser.id, email: adminUser.email, role: 'admin'});
    setSessionCookie(req, res, token);
    res.status(201).json({user: toPublicUser(adminUser), token});
  });

  router.post('/admin/login', rateLimit('admin-auth', 15, 60_000), (req, res) => {
    const db = getDb();
    const envPasscode = process.env.ADMIN_PASSCODE?.trim();
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';

    if (envPasscode) {
      const passBuf = Buffer.from(password);
      const envBuf = Buffer.from(envPasscode);
      const matchesEnv = passBuf.length === envBuf.length && crypto.timingSafeEqual(passBuf, envBuf);
      if (!matchesEnv) {
        res.status(401).json({error: 'Invalid administrator credentials.'});
        return;
      }
      const targetEmail = email || 'admin@technova.pk';
      let adminUser = db.users.find((u) => u.email.toLowerCase() === targetEmail && u.role === 'admin');
      if (!adminUser) {
        const now = new Date().toISOString();
        adminUser = {
          id: `usr-admin-${crypto.randomUUID().slice(0, 6)}`,
          fullName: 'TechNova Administrator',
          email: targetEmail,
          phone: db.websiteSettings.supportPhone,
          passwordHash: hashPassword(envPasscode),
          role: 'admin',
          pushSubscribed: true,
          createdAt: now,
          updatedAt: now,
        };
        db.users.push(adminUser);
        saveDb(db);
      }
      const token = signSessionToken({sub: adminUser.id, email: adminUser.email, role: 'admin'});
      setSessionCookie(req, res, token);
      res.json({user: toPublicUser(adminUser), token});
      return;
    }

    if (!db.adminConfig?.claimedPasswordHash) {
      res.status(400).json({error: 'No administrator account has been claimed yet.'});
      return;
    }

    const adminUser = db.users.find((u) => u.email.toLowerCase() === email && u.role === 'admin');
    if (!adminUser || !verifyPassword(password, adminUser.passwordHash)) {
      res.status(401).json({error: 'Invalid administrator email or password.'});
      return;
    }

    const token = signSessionToken({sub: adminUser.id, email: adminUser.email, role: 'admin'});
    setSessionCookie(req, res, token);
    res.json({user: toPublicUser(adminUser), token});
  });

  // Protected Admin Dashboard endpoints
  router.get('/admin/overview', requireAdmin, (_req, res) => {
    const db = getDb();
    const totalRevenue = db.orders
      .filter((o) => o.status !== 'Cancelled' && o.status !== 'Returned')
      .reduce((s, o) => s + o.total, 0);
    const pendingOrders = db.orders.filter(
      (o) => o.status === 'Order Placed' || o.status === 'Processing'
    ).length;

    const ordersWithItems = db.orders.map((order) => ({
      ...order,
      items: db.orderItems.filter((oi) => oi.orderId === order.id),
    }));

    // Product sales ranking
    const salesByProduct = new Map<string, {name: string; units: number; revenue: number}>();
    for (const oi of db.orderItems) {
      const current = salesByProduct.get(oi.productId) || {name: oi.productName, units: 0, revenue: 0};
      current.units += oi.quantity;
      current.revenue += oi.lineTotal;
      salesByProduct.set(oi.productId, current);
    }

    const topProducts = Array.from(salesByProduct.entries())
      .map(([productId, stats]) => ({productId, ...stats}))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    const monthlyRevenue = [
      {month: 'Jun', revenue: 1420000},
      {month: 'Jul', revenue: 1680000},
      {month: 'Aug', revenue: 1590000},
      {month: 'Sep', revenue: 1940000},
      {month: 'Oct', revenue: 2210000},
      {month: 'Nov', revenue: Math.max(2450000, totalRevenue)},
    ];

    res.json({
      kpis: {
        totalRevenue,
        totalOrders: db.orders.length,
        totalProducts: db.products.length,
        totalCustomers: db.users.filter((u) => u.role === 'customer').length,
        pendingOrders,
      },
      monthlyRevenue,
      topProducts,
      orders: ordersWithItems,
      payments: db.payments,
      products: attachVariants(db.products, db.productVariants),
      brands: db.brands,
      categories: db.categories,
      customers: db.users.filter((u) => u.role === 'customer').map(toPublicUser),
      coupons: db.coupons,
      heroSlides: db.heroSlides,
      newsletterSubscribers: db.newsletterSubscribers,
      settings: db.websiteSettings,
      notifications: db.notifications,
    });
  });

  // Admin: Product CRUD
  router.post('/admin/products', requireAdmin, (req, res) => {
    const db = getDb();
    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
    const brandName = typeof req.body?.brandName === 'string' ? req.body.brandName.trim() : 'Apple';
    const categoryName =
      typeof req.body?.categoryName === 'string' ? req.body.categoryName.trim() : 'Smartphones';
    const price = Number(req.body?.price);
    const originalPrice = Number(req.body?.originalPrice) || price;
    const stock = Math.max(0, Math.floor(Number(req.body?.stock) || 10));
    const storage = typeof req.body?.storage === 'string' && req.body.storage.trim() ? req.body.storage.trim() : '256GB';
    const colorName = typeof req.body?.colorName === 'string' && req.body.colorName.trim() ? req.body.colorName.trim() : 'Midnight';
    const image =
      typeof req.body?.image === 'string' && req.body.image.trim()
        ? req.body.image.trim()
        : '/src/assets/images/phone_iphone16_pro_1795612214518.jpg';

    if (!name || !Number.isFinite(price) || price <= 0) {
      res.status(400).json({error: 'Valid product name and positive price are required.'});
      return;
    }

    const brand =
      db.brands.find((b) => b.name.toLowerCase() === brandName.toLowerCase()) || db.brands[0];
    const category =
      db.categories.find((c) => c.name.toLowerCase() === categoryName.toLowerCase()) ||
      db.categories[0];

    const id = `prod-${crypto.randomUUID().slice(0, 8)}`;
    const slugBase = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const slug = `${slugBase}-${id.slice(-4)}`;
    const discountPercent =
      originalPrice > price ? Math.round(((originalPrice - price) / originalPrice) * 100) : 0;

    const product: Product = {
      id,
      slug,
      name,
      brandId: brand.id,
      brandName: brand.name,
      categoryId: category.id,
      categoryName: category.name,
      shortSpec: `${storage} · ${colorName}`,
      description:
        typeof req.body?.description === 'string' && req.body.description.trim()
          ? req.body.description.trim()
          : `${name} official retail unit with full manufacturer warranty.`,
      price,
      originalPrice,
      discountPercent,
      rating: 4.8,
      reviewCount: 1,
      badge: discountPercent >= 10 ? `-${discountPercent}%` : req.body?.badge || undefined,
      isPopular: Boolean(req.body?.isPopular),
      isBestDeal: Boolean(req.body?.isBestDeal) || discountPercent >= 10,
      displaySpec: req.body?.displaySpec || '6.5" OLED 120Hz',
      chipSpec: req.body?.chipSpec || 'Flagship SoC',
      connectivitySpec: '5G Ready',
      cameraSpec: req.body?.cameraSpec || '50MP Pro Camera',
      batterySpec: req.body?.batterySpec || '4800 mAh',
      images: [image],
      active: true,
      createdAt: new Date().toISOString(),
    };

    const variant: ProductVariant = {
      id: `var-${crypto.randomUUID().slice(0, 8)}`,
      productId: id,
      storage,
      colorName,
      colorHex: '#1D4ED8',
      price,
      originalPrice,
      stock,
      sku: `${slug.slice(0, 6).toUpperCase()}-${storage}`,
    };

    db.products.unshift(product);
    db.productVariants.push(variant);
    saveDb(db);
    res.status(201).json({product: {...product, variants: [variant]}});
  });

  router.patch('/admin/products/:id', requireAdmin, (req, res) => {
    const db = getDb();
    const product = db.products.find((p) => p.id === req.params.id);
    if (!product) {
      res.status(404).json({error: 'Product not found.'});
      return;
    }

    if (typeof req.body?.name === 'string' && req.body.name.trim()) {
      product.name = req.body.name.trim();
    }
    if (typeof req.body?.price === 'number' && req.body.price > 0) {
      product.price = req.body.price;
      const firstVariant = db.productVariants.find((v) => v.productId === product.id);
      if (firstVariant) firstVariant.price = req.body.price;
    }
    if (typeof req.body?.originalPrice === 'number' && req.body.originalPrice > 0) {
      product.originalPrice = req.body.originalPrice;
    }
    product.discountPercent =
      product.originalPrice > product.price
        ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
        : 0;
    if (typeof req.body?.stock === 'number' && req.body.stock >= 0) {
      const firstVariant = db.productVariants.find((v) => v.productId === product.id);
      if (firstVariant) firstVariant.stock = Math.floor(req.body.stock);
    }
    if (typeof req.body?.active === 'boolean') product.active = req.body.active;
    if (typeof req.body?.isPopular === 'boolean') product.isPopular = req.body.isPopular;
    if (typeof req.body?.isBestDeal === 'boolean') product.isBestDeal = req.body.isBestDeal;

    saveDb(db);
    res.json({
      product: {
        ...product,
        variants: db.productVariants.filter((v) => v.productId === product.id),
      },
    });
  });

  router.delete('/admin/products/:id', requireAdmin, (req, res) => {
    const db = getDb();
    const idx = db.products.findIndex((p) => p.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({error: 'Product not found.'});
      return;
    }
    db.products.splice(idx, 1);
    db.productVariants = db.productVariants.filter((v) => v.productId !== req.params.id);
    saveDb(db);
    res.json({ok: true});
  });

  // Admin: Update order status, tracking, payment status
  router.patch('/admin/orders/:id', requireAdmin, (req, res) => {
    const db = getDb();
    const order = db.orders.find((o) => o.id === req.params.id);
    if (!order) {
      res.status(404).json({error: 'Order not found.'});
      return;
    }
    const nextStatus = req.body?.status as OrderStatus | undefined;
    const note = typeof req.body?.note === 'string' ? req.body.note.trim() : undefined;
    const now = new Date().toISOString();

    if (nextStatus) {
      order.status = nextStatus;
      order.timeline = advanceOrderTimeline(order.timeline, nextStatus, now, note);
      if (nextStatus === 'Delivered' && order.paymentStatus === 'Pending COD') {
        order.paymentStatus = 'Paid';
      }
      if (nextStatus === 'Returned') {
        order.paymentStatus = 'Refunded';
      }
      db.notifications.unshift({
        id: `notif-${crypto.randomUUID().slice(0, 8)}`,
        userId: order.userId,
        title: `Order ${order.orderNumber} ${nextStatus}`,
        body: note || `Your order status is now ${nextStatus}.`,
        category: 'order',
        read: false,
        createdAt: now,
      });
    }
    if (typeof req.body?.trackingCode === 'string' && req.body.trackingCode.trim()) {
      order.trackingCode = req.body.trackingCode.trim();
    }
    if (typeof req.body?.carrier === 'string' && req.body.carrier.trim()) {
      order.carrier = req.body.carrier.trim();
    }
    if (typeof req.body?.paymentStatus === 'string') {
      order.paymentStatus = req.body.paymentStatus as Order['paymentStatus'];
    }
    order.updatedAt = now;
    saveDb(db);

    const items = db.orderItems.filter((oi) => oi.orderId === order.id);
    res.json({order: {...order, items}});
  });

  // Admin: Coupons CRUD
  router.post('/admin/coupons', requireAdmin, (req, res) => {
    const db = getDb();
    const code = typeof req.body?.code === 'string' ? req.body.code.trim().toUpperCase() : '';
    const type = req.body?.type === 'fixed' ? 'fixed' : 'percent';
    const value = Number(req.body?.value);
    const minOrderAmount = Number(req.body?.minOrderAmount) || 0;
    const maxDiscount = Number(req.body?.maxDiscount) || 0;

    if (!code || code.length < 3 || !Number.isFinite(value) || value <= 0) {
      res.status(400).json({error: 'Valid coupon code and discount value are required.'});
      return;
    }
    if (db.coupons.some((c) => c.code === code)) {
      res.status(409).json({error: 'Coupon code already exists.'});
      return;
    }

    const coupon: Coupon = {
      id: `cpn-${crypto.randomUUID().slice(0, 6)}`,
      code,
      type,
      value,
      minOrderAmount,
      maxDiscount,
      active: true,
      expiresAt: req.body?.expiresAt || '2027-12-31T23:59:59.000Z',
      usageCount: 0,
    };
    db.coupons.unshift(coupon);
    saveDb(db);
    res.status(201).json({coupon});
  });

  router.patch('/admin/coupons/:id', requireAdmin, (req, res) => {
    const db = getDb();
    const coupon = db.coupons.find((c) => c.id === req.params.id);
    if (!coupon) {
      res.status(404).json({error: 'Coupon not found.'});
      return;
    }
    if (typeof req.body?.active === 'boolean') coupon.active = req.body.active;
    saveDb(db);
    res.json({coupon});
  });

  // Admin: Settings & Hero banners & Broadcast notification
  router.patch('/admin/settings', requireAdmin, (req, res) => {
    const db = getDb();
    const s = db.websiteSettings;
    if (typeof req.body?.currency === 'string' && req.body.currency.trim()) {
      s.currency = req.body.currency.trim().toUpperCase();
    }
    if (typeof req.body?.freeShippingThreshold === 'number' && req.body.freeShippingThreshold >= 0) {
      s.freeShippingThreshold = req.body.freeShippingThreshold;
    }
    if (typeof req.body?.standardShippingFee === 'number' && req.body.standardShippingFee >= 0) {
      s.standardShippingFee = req.body.standardShippingFee;
    }
    if (typeof req.body?.promoBannerTitle === 'string') s.promoBannerTitle = req.body.promoBannerTitle;
    if (typeof req.body?.promoBannerSubtitle === 'string') {
      s.promoBannerSubtitle = req.body.promoBannerSubtitle;
    }
    if (req.body?.paymentMethodsEnabled && typeof req.body.paymentMethodsEnabled === 'object') {
      s.paymentMethodsEnabled = {...s.paymentMethodsEnabled, ...req.body.paymentMethodsEnabled};
    }
    saveDb(db);
    res.json({settings: db.websiteSettings});
  });

  router.post('/admin/notifications', requireAdmin, (req, res) => {
    const db = getDb();
    const title = typeof req.body?.title === 'string' ? req.body.title.trim() : '';
    const body = typeof req.body?.body === 'string' ? req.body.body.trim() : '';
    const category =
      req.body?.category === 'arrival' || req.body?.category === 'order' ? req.body.category : 'offer';
    if (!title || !body) {
      res.status(400).json({error: 'Notification title and message are required.'});
      return;
    }
    const item = {
      id: `notif-${crypto.randomUUID().slice(0, 8)}`,
      title,
      body,
      category,
      read: false,
      createdAt: new Date().toISOString(),
    } as const;
    db.notifications.unshift(item);
    saveDb(db);
    res.status(201).json({notification: item});
  });

  return router;
}
