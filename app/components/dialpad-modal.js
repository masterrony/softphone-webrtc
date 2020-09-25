import Component from '@ember/component';
import { inject as service } from '@ember/service';
import { observer } from '@ember/object';
import $ from 'jquery';

export default Component.extend({
  shortcuts: service('shortcuts'),
  classNames: ['modal', 'dialpad'],
  classNameBindings: ['show:open'],

  init() {
    this._super(...arguments);
  },

  showChanged: observer('show', function() {
    this.get('show') ? this.get('element').querySelector('input').focus() : null;
  }),

  keyUp(event) {
    event.preventDefault();
    if (event.keyCode === 27) {
      this.send('closeModal', true);
    } else {
      let action = this.get('shortcuts').resolveAction({ keyCode: event.keyCode, shiftKey: event.shiftKey });
      if (action) {
        this.send(action.action, action.argument);
      }
    }
  },

  didInsertElement() {
    this.set('number', '');
  },

  didRender() {
    this.get('element').querySelector('.window').focus();
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
      this.get('sendKey')(key);
    },

    removeLastDigit() {
      let number = this.get('number');
      this.set('number', number.substring(0, number.length - 1));
    },

    makeCall() {
      this.set('show', false);
      this.get('makeCall')(this.get('number'));
      this.set('number', '');
    },

    makeVideoCall() {
      this.set('show', false);
      this.get('makeCall')(this.get('number'), true);
      this.set('number', '');
    },
  },
});
