const assert = require('node:assert/strict');
const test = require('node:test');
const fc = require('fast-check');
const { createSignupService } = require('../../assets/signup-demo/services/signup-service.js');

const users = ['lin', 'qiao'];
const action = fc.record({
  kind: fc.constantFrom('edit', 'submit', 'failNext'),
  user: fc.constantFrom(...users),
  note: fc.oneof(fc.string({ maxLength: 120 }), fc.constant('第一行\n 第二行 '))
});

// 每次操作后对照独立的期望状态，同时核对两人的草稿与报名总数。
function checkSequence(actions) {
  const service = createSignupService();
  const drafts = new Map();
  const bookings = new Map();
  let failNext = false;
  for (const { kind, user, note } of actions) {
    if (kind === 'edit') {
      service.saveDraft(user, note);
      drafts.set(user, note);
    } else if (kind === 'failNext') {
      service.armFailure();
      failNext = true;
    } else {
      const currentNote = drafts.get(user) || '';
      const result = service.submit(user, currentNote);
      if (failNext) {
        assert.equal(result.ok, false);
        assert.equal(result.reason, 'network');
        failNext = false;
      } else {
        assert.equal(result.ok, true);
        assert.equal(result.duplicate, bookings.has(user));
        if (!bookings.has(user)) {
          bookings.set(user, currentNote);
          drafts.delete(user);
        }
        assert.equal(result.booking.userId, user);
        assert.equal(result.booking.note, bookings.get(user));
      }
    }
    assert.equal(service.count(), bookings.size);
    for (const id of users) assert.equal(service.loadDraft(id), drafts.get(id) || '');
  }
}

test('两个演示身份的草稿、失败和重复报名遵守相同规则', () => {
  const options = { numRuns: 200 };
  if (process.env.FC_SEED) options.seed = Number(process.env.FC_SEED);
  if (process.env.FC_PATH) options.path = process.env.FC_PATH;
  fc.assert(fc.property(fc.array(action, { minLength: 5, maxLength: 60 }), checkSequence), options);
});
