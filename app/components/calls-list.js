import Component from '@ember/component';
import { computed } from '@ember/object';
import { inject as service } from '@ember/service';

export default Component.extend({
  userAgent: service('sip-user-agent'),
  notifications: service('notification-messages'),

  tagName: '',
  calls: computed('userAgent.calls.@each.status', function() {
    return this.get('userAgent.calls');
  }),
  isVideoActive: computed('calls', function() {
    return this.calls.some(c => c.isVideo);
  }),

  didInsertElement() {
    this._super(...arguments);
    //this.userAgent.initializeLocalMediaBinding(document.querySelector('#localVideo'));
    this.userAgent.initializeRemoteMediaBinding(document.querySelector('#remoteVideo'));
    this.userAgent.initializeLocalRingbacktoneBinding(document.querySelector('#localRingbacktone'));
  },

  actions: {
    fullScreen: function() {
      let receivedVideo = document.querySelector('#remoteVideo');
      if (receivedVideo.requestFullscreen) {
        receivedVideo.requestFullscreen();
      } else if (receivedVideo.mozRequestFullScreen) {
        receivedVideo.mozRequestFullScreen(); // Firefox
      } else if (receivedVideo.webkitRequestFullscreen) {
        receivedVideo.webkitRequestFullscreen(); // Chrome and Safari
      }
      this.get('notifications').info('Press [Esc] to leave full-screen mode.', {
        autoClear: true,
        clearDuration: 12400,
      });
    },

    disableVideo: function() {
      this.userAgent.toggleVideo();
    },

    enableVideo: function() {
      this.userAgent.toggleVideo();
    }
  }
});
