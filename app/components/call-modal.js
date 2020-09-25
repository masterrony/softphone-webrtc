import Component from '@ember/component';
import { inject as service } from '@ember/service';

export default Component.extend({
  
  desktop: service(),
  eventBus: service(),
  notificationHandle: null,

  classNames: ['modal', 'calling'],
  classNameBindings: ['show:open'],

  init() {
    this._super(...arguments);
    this.eventBus.on('incomingCall', function(callData) {
      let notification = this.get('desktop').display('Incoming call from ' + callData.request.from.uri.user);
      this.set('notificationHandle', notification);
    }.bind(this));
  },

  didInsertElement() {
    this._super(...arguments);
  },

  actions: {
    closeModal() {
      this.set('show', false);
      this.get('ignoreCall')();
      //this.get('notificationHandle').close.bind(notification);
    },

    acceptCall() {
      this.get('acceptCall')();
    },

    rejectCall() {
      this.get('rejectCall')();
    },

    ignoreCall() {
      this.get('ignoreCall')();
    }
  },
});
