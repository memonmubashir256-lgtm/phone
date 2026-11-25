import test from 'node:test';
import assert from 'node:assert/strict';
import {formatCurrency, matchProductSlug, normalizeRoutePath} from './format';

test('formatCurrency formats PKR and USD accurately', () => {
  assert.equal(formatCurrency(339999, 'PKR'), 'PKR 339,999');
  assert.equal(formatCurrency(1199, 'USD'), '$1,199');
  assert.equal(formatCurrency(Number.NaN, 'PKR'), 'PKR 0');
});

test('route normalization and product slug matching work cleanly', () => {
  assert.equal(normalizeRoutePath('/'), '/');
  assert.equal(normalizeRoutePath('/shop/'), '/shop');
  assert.equal(matchProductSlug('/product/iphone-16-pro'), 'iphone-16-pro');
  assert.equal(matchProductSlug('/shop'), null);
});
