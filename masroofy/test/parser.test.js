const test = require('node:test');
const assert = require('node:assert/strict');
const { accounts, categories } = require('../www/defaults.js');
const { parse, wordsToNumbers, normalize } = require('../www/parser.js');

// الأربع 7 أكتوبر 2026
const ctx = { accounts, categories, defaultAccountId: 'cash', today: new Date('2026-10-07T12:00:00') };
const one = text => {
  const [r] = parse(text, ctx);
  return { type: r.type, amount: r.amount, categoryId: r.categoryId, accountId: r.accountId, toAccountId: r.toAccountId, date: r.date, note: r.note };
};

test('مصروف بسيط من الكاش', () => {
  assert.deepEqual(one('دفعت 120 جنيه أكل من الكاش'), { type: 'expense', amount: 120, categoryId: 'food', accountId: 'cash', toAccountId: null, date: '2026-10-07', note: 'اكل' });
});

test('الحساب والتصنيف من الكلام', () => {
  const r = one('اوبر 85 انستاباي');
  assert.equal(r.categoryId, 'transport');
  assert.equal(r.accountId, 'instapay');
});

test('الدخل ومن غير فعل في الملاحظه', () => {
  const r = one('قبضت المرتب 15000 على انستاباي');
  assert.equal(r.type, 'income');
  assert.equal(r.categoryId, 'salary');
  assert.equal(r.note, 'المرتب');
});

test('السحب يبقى تحويل للكاش', () => {
  const r = one('سحبت 2000 من انستاباي');
  assert.deepEqual([r.type, r.accountId, r.toAccountId], ['transfer', 'instapay', 'cash']);
});

test('التحويل بين حسابين', () => {
  const r = one('حولت 500 من انستاباي لفودافون كاش');
  assert.deepEqual([r.type, r.accountId, r.toAccountId], ['transfer', 'instapay', 'wallet']);
});

test('اكتر من عمليه في جمله واحده', () => {
  const rs = parse('قهوة 60 و بنزين 400', ctx);
  assert.deepEqual(rs.map(r => [r.amount, r.categoryId]), [[60, 'food'], [400, 'transport']]);
});

test('الارقام بالكلام', () => {
  assert.equal(wordsToNumbers(normalize('الف وميتين وخمسين')), '1250');
  assert.equal(one('اشتريت هدوم بألف ونص من فودافون كاش').amount, 1500);
});

test('امبارح واول امبارح', () => {
  assert.equal(one('امبارح دفعت 30 ميكروباص').date, '2026-10-06');
  assert.equal(one('اول امبارح كشري 50').date, '2026-10-05');
});

test('من يومين ومن كام يوم', () => {
  assert.equal(one('من يومين بنزين 400').date, '2026-10-05');
  const r = one('من 3 ايام صيدلية 180');
  assert.deepEqual([r.amount, r.date, r.note], [180, '2026-10-04', 'صيدليه']);
});

test('ايام الاسبوع', () => {
  assert.equal(one('يوم الخميس دفعت 200 سينما').date, '2026-10-01');
  assert.equal(one('الجمعة اللي فاتت كشري 60').date, '2026-10-02');
  assert.equal(one('يوم التلات اوبر 70').date, '2026-10-06');
  assert.equal(one('الأربع غدا 90').date, '2026-10-07');
});
