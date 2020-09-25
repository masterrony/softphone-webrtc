import { Call } from 'softphone/utils/call';
import { module, test } from 'qunit';

module('Unit | Utility | call', function(hooks) {

  test('is active', function(assert) {
    let call = Call.create();
    assert.equal(call.isActive(), true);
  });

  test('is onhold', function(assert) {
    let call = Call.create();
    assert.equal(call.isOnHold(), false);
  });
});
