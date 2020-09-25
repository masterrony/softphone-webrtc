import Component from '@ember/component';
import { inject as service } from '@ember/service';
import $ from 'jquery';
import { computed } from '@ember/object';

export default Component.extend({

  ajax: service(),
  session: service(),
  eventBus: service(),
  notifications: service('notification-messages'),
  userAgent: service('sip-user-agent'),
  shortcuts: service('shortcuts'),
  desktop: service(),

  displayContacts: false,
  displayMessages: false,

  showMenu: false,
  showOptions: false,
  showPad: computed('filter', function() {
    return this.filter === 0;
  }),
  isRegistered: false,
  registrationMessage: '',
  isDND: false,

  init() {
    this._super(...arguments);
    this.get('userAgent').startConfig();
    this.get('desktop').checkPermissions();
  },

  keyUp(event) {
    if ($('#dashboardEnterPhone').is(':focus')) {
      if (event.keyCode === 32) {
        this.userAgent.resetServer(this.userAgent);
      }
      if (event.keyCode === 13 && !event.shiftKey) {
        event.preventDefault();
        this.makeCall(this.get('filter'));
      }
      else if (event.keyCode === 13 && event.shiftKey) {
        event.preventDefault();
        this.send('startConversation');
      }
    }
  },

  didInsertElement() {
    this._super(...arguments);
    this.userAgent.checkMediaAvailability();
    navigator.mediaDevices.ondevicechange = function(event) { this.userAgent.checkMediaAvailability(); }.bind(this);
    this.sipInit();
    this.set('ringtone', document.querySelector('#incoming-call'));
  },

  sipInit() {
    this.set('callVolume', this.userAgent.remote_video.volume);
    this.set('microphoneVolume', this.userAgent.local_video.volume);

    this.eventBus.on('registrationState', function(isRegistered, reason, cause) {
      this.set('isRegistered', isRegistered);
      if (cause) {
        // console.log(reason);
        console.log(cause);
      }
      if (!isRegistered) {
        this.set('registrationMessage', reason + '; ' + cause);
      } else {
        //this.set('registrationMessage', 'Registered and ready receive calls');
      }
    }.bind(this));

    this.userAgent.on('incomingCall', call => {
      this.set('incomingCall', call);
      //Changed for DEBUGGING
      this.set('showIncomingModal', true);
      this.get('ringtone').currentTime = 0;
      if (this.userAgent.active_call) {
        this.get('ringtone').setAttribute('src', '/softphone/ringwaittone.wav');
        this.get('ringtone').volume = 0.1;
      } else {
        this.get('ringtone').setAttribute('src', '/softphone/ringtone.wav');
        this.get('ringtone').volume = 1.0;
      }
      this.get('ringtone').play();
      //console.log('ringtone promise:');
      //console.log(promise);
      //call.accept();

      call.on('cancel', () => {
        this.set('incomingCall', null);
        this.set('showIncomingModal', false);
        this.get('ringtone').pause();
      });

      call.on('terminate', (response, code) => {
        this.set('incomingCall', null);
        this.set('showIncomingModal', false);
        this.get('ringtone').pause();
      });

      call.on('terminated', (message, cause) => {
        this.set('incomingCall', null);
        this.set('showIncomingModal', false);
        this.get('ringtone').pause();
      });
    });

    this.userAgent.on('mwiUpdate', request => {
      let mwiMatch = /Voice-Message: (\d*)/g;
      let match = mwiMatch.exec(request.body);
      // TODO: Debug this and what happens with the Ikantam Test account, cause it breaks.
      this.set('voicemailCount', match[1]);
    });

    // Handle the window unloading for any reason by trying to unregister and not leave orphans on the switch
    if (window && window.addEventListener) {
      window.addEventListener('beforeunload', this.unregister);
      window.addEventListener('unload', this.unregister);
    }
  },

  unregister() {
    if (this.userAgent && this.userAgent.isRegistered) {
      this.userAgent.unregister();
    }
  },

  startConversation(number) {
    
  },

  async makeCall(number, isVideo = false) {
    //console.log('makeCall with Video option');
    let callAttempt = await this.userAgent.placeCall(number, isVideo);
    this.set('filter', '');
    callAttempt.on('failed', (error, cause) => {
      if (cause !== 'WebRTC Error') {
        this.get('notifications').info('Call canceled', {
          autoClear: true,
          clearDuration: 6200,
        });
      }
    });
  },

  actions: {
    removeLastDigit() {
      let number = this.get('filter');
      this.set('filter', number.substring(0, number.length - 1));
    },

    showDialpad() {
      this.set('showDialpad', true);
    },

    showTransfer() {
      this.set('showTransfer', true);
    },

    sendKey(key) {
      this.userAgent.sendDTMF(key, 100);
    },

    setCallVolume(volume) {
      this.userAgent.remote_video.volume = volume;
    },

    setMicrophoneVolume(volume) {
      if (this.userAgent.active_call) {
        if (volume === 0) {
          this.userAgent.active_call.sessionDescriptionHandler.peerConnection.getSenders()[0].track.enabled = false;
        } else if (!this.userAgent.active_call.sessionDescriptionHandler.peerConnection.getSenders()[0].track.enabled) {
          this.userAgent.active_call.sessionDescriptionHandler.peerConnection.getSenders()[0].track.enabled = true;
        }
      } else {
        this.userAgent.local_video.volume = volume;
      }
    },

    startConversation() {
      let number = this.get('filter');
      if (!number.startsWith('+')) {
        if (number.startsWith('1')) {
          number = '+' + number;
        } else {
          number = '+1' + number;
        }
      }
      this.eventBus.trigger('outgoingSMS', number);
      this.set('filter', '');
    },

    reregister() {
      this.userAgent.register();
    },

    transferCall(callId, destination) {
      //console.log('transferCall for Modal!');
      //console.log('callId: ' + callId);
      //console.log('destination: ' + destination);
      this.userAgent.transfer(callId, destination);
      // callAttempt.on('failed', error => {
      //   this.get('notifications').error('Unable to complete your call!', {
      //     autoClear: true,
      //     clearDuration: 6200,
      //   });
      // });
    },

    //makeCall(number, isVideo = false) {
    async makeCall() {
      //console.log('makeCall without Video option');
      let number = this.get('filter');
      //let callAttempt = await this.userAgent.placeCall(number, isVideo);
      let callAttempt = await this.userAgent.placeCall(number, false);
      this.set('filter', '');
      callAttempt.on('failed', (error, cause) => {
        if (cause !== 'WebRTC Error') {
          this.get('notifications').info('Call canceled', {
            autoClear: true,
            clearDuration: 6200,
          });
        }
      });
    },

    acceptCall() {
      if (this.userAgent.active_call) {
        this.userAgent.hold();
      }
      this.get('incomingCall').accept(this.userAgent.getAudioOnlyConstraints());
      this.set('showIncomingModal', false);
      this.get('ringtone').pause();
    },

    rejectCall() {
      this.get('incomingCall').reject();
      this.set('showIncomingModal', false);
      this.get('ringtone').pause();
    },

    ignoreCall() {
      this.set('showIncomingModal', false);
      this.get('ringtone').pause();
    },

    options() {
      this.set('showOptions', true);
      this.set('showMenu', false);
    },

    logout() {
      this.set('showMenu', false);
      this.get('session').invalidate();
    },

    toggleMenu() {
      this.set('showMenu', !this.get('showMenu'));
    },

    enableDND() {
      this.set('userAgent.dnd_enabled', true);
      this.set('isDND', true);
    },

    disableDND() {
      this.set('userAgent.dnd_enabled', false);
      this.set('isDND', false);
    },
  },
});
