import Component from '@ember/component';
import { inject as service } from '@ember/service';
import $ from 'jquery';

export default Component.extend({
  shortcuts: service('shortcuts'),
  eventBus: service(),

  classNames: ['modal', 'dialpad'],
  classNameBindings: ['show:open'],
  callIdToTransfer: '',

  init() {
    this._super(...arguments);
  },

  keyUp(event) {
    event.preventDefault();
    if (event.keyCode === 27) {
      this.send('closeModal', true);
    }
    else if (event.keyCode === 13) {
      this.send('transferCall');
    }
    else {
      let action = this.get('shortcuts').resolveAction({ keyCode: event.keyCode, shiftKey: event.shiftKey });
      if (action) {
        this.send(action.action, action.argument);
      }
    }
  },

  didInsertElement() {
    this.set('number', '');
    this.eventBus.on('transferCallId', this.transferCallIdHandler.bind(this));
  },

  didRender() {
    this.get('element').querySelector('.window').focus();
  },

  transferCallIdHandler(callId) {
    this.set('callIdToTransfer', callId);
    this.set('show', true);
  },

  actions: {
    closeModal(forceClose = false) {
      if (
        (!$('.window').is(':focus') && !$('.dialpad-number').is(':focus'))
        || forceClose
      ) {
        this.set('show', false);
      }
    },

    keyPress(key) {
      let number = this.get('number');
      this.set('number', number + key);
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
    },

    removeLastDigit() {
      let number = this.get('number');
      this.set('number', number.substring(0, number.length - 1));
    },

    transferCall() {
      this.set('show', false);
      this.get('transferCall')(this.get('callIdToTransfer'), this.get('number'));
      this.set('number', '');
    },
  },
});
