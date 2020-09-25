import { A } from '@ember/array';
import EmberObject from '@ember/object';
import ArrayProxy from '@ember/array/proxy';
import { alias } from '@ember/object/computed';

const Call = EmberObject.extend({
  id: alias('session.request.call_id'),
  phone: alias('session.remoteIdentity.uri.user'),
  startTime: alias('session.startTime'),

  init() {
    this.set('session', this.call);
    this.set('name', this.name || this.phone);
    this.set('holdTime', null);
  },

  isActive() {
    return this.get('status') === 'active';
  },

  isOnHold() {
    return this.get('status') === 'onhold';
  },

  isCalling() {
    return this.get('status') === 'calling';
  },

});

const Calls = ArrayProxy.extend({
  init() {
    this.set('content', A([]));
    this._super(...arguments);
  },

  addCall(call) {
    let active = this.activeCall();
    if (active && call.isActive()) {
      active.set('status', 'onhold');
    }
    this.get('content').addObject(call);
  },

  removeCall(id) {
    let callToRemove = this.get('content').findBy('id', id);
    return callToRemove && this.get('content').removeObject(callToRemove);
  },

  activeCall() {
    return this.get('content').findBy('status', 'active');
  },

  onHoldCalls() {
    return this.get('content').filter(call => call.status === 'onhold');
  },
});

export { Calls, Call };
