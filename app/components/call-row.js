import Component from '@ember/component';
import { computed } from '@ember/object';
import { later, cancel } from '@ember/runloop';
import { inject as service } from '@ember/service';

export default Component.extend({
  userAgent: service('sip-user-agent'),
  eventBus: service(),
  shortcuts: service('shortcuts'),
  attributeBindings: ['draggable'],
  draggable: true,
  classNames: ['call'],
  classNameBindings: ['isActive:active'],
  isVideo: false,
  isClickedPad: false,

  didDestroyElement() {
    cancel(this.get('timer'));
  },

  didInsertElement() {
    this.set('number', '');
    this.set('inputClass', 'right-text');
    if (this.get('isActive')) {
      this.get('element').querySelector('input').focus();
    }
  },

  click() {
    if (this.get('isActive') && !this.get('isClickedPad')) {
      this.get('element').querySelector('input').focus();
    }
    this.set('isClickedPad', false);
  },

  dragStart(event) {
    return event.dataTransfer.setData('text/data', this.get('call.session.id'));
  },

  keyUp(event) {
    event.preventDefault();
    if (event.keyCode === 8) {
      return false;
    }
    if (this.get('isActive')) {
      let action = this.get('shortcuts').resolveAction({ keyCode: event.keyCode, shiftKey: event.shiftKey });
      if (action) {
        this.send(action.action, action.argument);
      }
    }
  },

  callDuration: computed('time', function() {
    this.set('timer', later(this, () => this.set('time', new Date()), 1000));
    return this.get('call.startTime') && (this.get('time') - this.get('call.startTime')) / 1000;
  }),

  holdDuration: computed('time', function() {
    return this.get('call.holdTime') && Math.ceil((this.get('time') - this.get('call.holdTime')) / 1000);
  }),

  isActive: computed('call.status', function() { return this.get('call.status') === 'active'; }),
  isOnHold: computed('call.status', function() { return this.get('call.status') === 'onhold'; }),
  isCalling: computed('call.status', function() { return this.get('call.status') === 'calling'; }),

  actions: {

    keyPress(key) {
      let number = this.get('number');
      this.set('number', number + key);
      this.set('inputClass', 'left-text');
      let audio = this.element.querySelector('audio');
      if (/[0-9]/.test(key)) {
        audio.setAttribute('src', `/softphone/dtmf/${key}.wav`);
      }
      if (/#/.test(key)) {
        audio.setAttribute('src', '/softphone/dtmf/pound.wav');
      }
      if (/\*/.test(key)) {
        audio.setAttribute('src', '/softphone/dtmf/star.wav');
      }
      audio.play();
      this.get('sendKey')(key);
    },
    
    hangUp(id) {
      this.userAgent.hangUp(id);
    },

    reinviteWithVideo() {
      console.log('withVideo');
      this.userAgent.reinvite(true);
      this.set('isVideo', true);
    },

    reinviteNoVideo() {
      console.log('noVideo');
      this.userAgent.reinvite(false);
      this.set('isVideo', false);
      // let reinvite = this.userAgent.reinvite(false);
      // reinvite.on('', function(){
      //   this.set('isVideo', false);
      // }.bind(this));
    },

    holdCall() {
      this.userAgent.hold();
    },

    transferCall(number) {
      //console.log('my call id: ' + this.get('call.id'));
      //console.log('transfer to: ' + number);
    },

    unhold(id) {
      this.userAgent.unhold(id);
    },

    showTransfer() {
      //console.log('showTransfer');
      //Emit event that we started showing Transfer, so the transfer window can pick it up and set the callId to transfer
      this.eventBus.trigger('transferCallId', this.get('call.id'));
      //this.set('showTransfer', true);
    },

    showDialpad() {
      this.set('isClickedPad', true);
      this.set('showDialpad', true);
    },
  },
});
