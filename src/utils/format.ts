export function formatCurrency(amount: number, currency = 'PKR'): string {
  const safeAmount = Number.isFinite(amount) ? Math.round(amount) : 0;
  if (currency === 'USD') {
    return `$${safeAmount.toLocaleString('en-US')}`;
  }
  return `${currency} ${safeAmount.toLocaleString('en-US')}`;
}

export function formatShortDate(iso: string): string {
  if (!iso) return 'Pending';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatDateTime(iso: string): string {
  if (!iso) return 'Pending';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function normalizeRoutePath(pathname: string): string {
  const cleaned = pathname.replace(/\/+$/, '');
  return cleaned === '' ? '/' : cleaned;
}

export function matchProductSlug(pathname: string): string | null {
  const normalized = normalizeRoutePath(pathname);
  if (!normalized.startsWith('/product/')) return null;
  const slug = normalized.slice('/product/'.length);
  return slug ? decodeURIComponent(slug) : null;
}
