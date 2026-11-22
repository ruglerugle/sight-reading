'use strict';
// 「ひだまりのかえりみち」は、クリアの順番に関係なく、最初からどの段階も選べる。ほかの曲は今までどおり順番に開く
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const vm = require('vm');

const src = fs.readFileSync(require.resolve('../song-mode.js'), 'utf8');
const code = src.match(/const OPEN_ORDER_SONGS[\s\S]*?const isStepUnlocked = [^\n]*\n/)[0];
const ctx = vm.createContext({ isStepDone: () => false });
vm.runInContext(code + 'this.isStepUnlocked = isStepUnlocked;', ctx);

test('hidamari-michi: every step is open without clearing the previous one', () => {
  for (let i = 0; i < 5; i++) assert.equal(ctx.isStepUnlocked({ id: 'hidamari-michi' }, i), true);
});
test('other songs still open in order', () => {
  assert.equal(ctx.isStepUnlocked({ id: 'merry' }, 0), true);
  assert.equal(ctx.isStepUnlocked({ id: 'merry' }, 2), false);
});
