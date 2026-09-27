const test = require('node:test');
const assert = require('node:assert/strict');

const { formatRussianPhone, hasPhoneNumber } = require('../../dist-electron/src/shared/phone');

test('empty input stays empty', () => {
  assert.equal(formatRussianPhone(''), '');
  assert.equal(formatRussianPhone('   '), '');
  assert.equal(formatRussianPhone('abc'), '');
});

test('formats a number typed digit by digit', () => {
  const typed = '9001234567';
  const steps = [];
  for (let i = 1; i <= typed.length; i++) steps.push(formatRussianPhone(typed.slice(0, i)));

  assert.deepEqual(steps, [
    '+7 (9',
    '+7 (90',
    '+7 (900',
    '+7 (900) 1',
    '+7 (900) 12',
    '+7 (900) 123',
    '+7 (900) 123-4',
    '+7 (900) 123-45',
    '+7 (900) 123-45-6',
    '+7 (900) 123-45-67'
  ]);
});

test('accepts the common Russian prefixes', () => {
  assert.equal(formatRussianPhone('89001234567'), '+7 (900) 123-45-67');
  assert.equal(formatRussianPhone('79001234567'), '+7 (900) 123-45-67');
  assert.equal(formatRussianPhone('+7 900 123 45 67'), '+7 (900) 123-45-67');
  assert.equal(formatRussianPhone('8 (900) 123-45-67'), '+7 (900) 123-45-67');
});

test('keeps every entered digit for other area codes', () => {
  assert.equal(formatRussianPhone('4951234567'), '+7 (495) 123-45-67');
  assert.equal(formatRussianPhone('3812345678'), '+7 (381) 234-56-78');
});

test('ignores digits beyond the eleventh', () => {
  assert.equal(formatRussianPhone('900123456789999'), '+7 (900) 123-45-67');
});

test('is stable when applied to its own result', () => {
  const once = formatRussianPhone('9001234567');
  assert.equal(formatRussianPhone(once), once);
  assert.equal(formatRussianPhone(formatRussianPhone(once)), once);
});

test('a bare prefix is not a phone number', () => {
  assert.equal(hasPhoneNumber(''), false);
  assert.equal(hasPhoneNumber('+7'), false);
  assert.equal(hasPhoneNumber('+7 (9'), true);
  assert.equal(hasPhoneNumber('+7 (900) 123-45-67'), true);
});
