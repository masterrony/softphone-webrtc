import Service from '@ember/service';
import Evented from '@ember/object/evented';
//import { isEmpty } from '@ember/utils';
import { computed } from '@ember/object';
import { inject as service } from '@ember/service';
import { later } from '@ember/runloop';

export default Service.extend(Evented, {
  user_agent: null,
  configuration: null,
  active_call: null,
  calls_on_hold: null,
  started_call: null,
  remote_video: null,
  local_video: null,
  local_ringbacktone: null,
  local_audio_track: null,
  local_video_track: null,
  subscribes: null,
  call_is_active: computed('active_call', {
    get() {
      if (!this.active_call) { return false; }
      return this.active_call !== null;
    }
  }),
  call_start_time: null,
  sip_trace_enabled: false,
  dnd_enabled: false,

  ajax: service(),
  contactsService: service('contacts-api'),
  notifications: service('notification-messages'),
  eventBus: service(),

  calls: computed('active_call', 'calls_on_hold', 'calls_on_hold.@each.key', 'started_call', function() {
    let callData = [], tmpData = [];
    if (this.active_call) {
      //console.log(this.active_call);
      tmpData.pushObject({
        id: this.active_call.id,
        phone: this.active_call.remoteIdentity.uri.user,
        startTime: this.call_start_time,
        holdTime: null,
        status: 'active',
        session: this.active_call,
        isVideo: this.active_call.sessionDescriptionHandler.constraints.video
      });
    }
    if (this.calls_on_hold) {
      this.calls_on_hold.forEach(function(callObject) {
        //console.log(callObject);
        tmpData.pushObject({
          id: callObject.key,
          phone: callObject.call.remoteIdentity.uri.user,
          startTime: callObject.call_start_time,
          holdTime: callObject.call_hold_time,
          status: 'onhold',
          session: callObject.call,
          isVideo: callObject.call.sessionDescriptionHandler.constraints.video
        });
      });
    }
    this.call_order.forEach(function(key) {
      let callitem = tmpData.find(x => key.includes(x.id));
      if (callitem) {
        callData.pushObject(callitem);
      }
    });
    if (this.started_call) {
      //console.log(this.started_call);
      callData.pushObject({
        id: this.started_call.request.call_id,
        phone: this.started_call.remoteIdentity.uri.user,
        startTime: null,
        holdTime: null,
        status: 'calling',
        session: this.started_call,
        isVideo: this.started_call.sessionDescriptionHandlerOptions.constraints.video
      });
    }
    return callData;
  }),

  init() {
    this._super(...arguments);
    this.set('subscribes', []);
    this.set('calls_on_hold', []);
    this.set('call_order', []);
    this.set('active_server', [0]);
    this.set('cycle_server', 0);
    this.remote_video = document.createElement('video');
    this.local_video = document.createElement('video');
    this.local_ringbacktone = document.createElement('audio');
  },

  initializeLocalMediaBinding(localVideo) {
    this.set('local_video', localVideo);
    // navigator.mediaDevices.getUserMedia({ audio: true, video: true }).then(function (stream) {
    //   this.set('local_audio_track', stream.getAudioTracks()[0]);
    //   this.set('local_video_track', stream.getVideoTracks()[0]);
    //   if (this.local_video.srcObject == null) {
    //     this.local_video.srcObject = new MediaStream();
    //   }
    //   this.local_video.srcObject.addTrack(stream.getVideoTracks()[0]);
    // }.bind(this));
  },

  initializeRemoteMediaBinding(remoteVideo) {
    this.set('remote_video', remoteVideo);
  },

  initializeLocalRingbacktoneBinding(localRingbacktone) {
    this.set('local_ringbacktone', localRingbacktone);
  },

  startConfig() {
    this.set('isReady', new Promise((resolve, reject) => {
      this.get('ajax')
        .request('/config/softphone')
        .then(config => {
          this.configure(config);
          this.register();
          resolve();
        },
        failure => {
          this.get('notifications').error('Failed to retrieve config: ' + failure, {
            autoClear: true,
            clearDuration: 6200,
          });
          reject(failure);
        });
    }));
  },

  configure(config) {
    let serverlen = config.server.length;
    if (config.server) {
      config.server.forEach((item, index) => {
        if (typeof item === 'object') {
          config.server[index].weight = serverlen - index;
        } else if (typeof item === 'string') {
          config.server[index] = {'ws_uri': item, 'weight': serverlen - index};
        }
      });
    }
    this.set('configuration', {
      transportOptions: {
        wsServers: config.server,
        traceSip: this.sip_trace_enabled
      },
      uri: config.uri,
      phone: config.extension,
      password: config.password,
      register: true,
      autostart: false,
      registerExpires: 900,
      allowLegacyNotifications: true,
      hackWssInTransport: true,
      sessionDescriptionHandlerFactoryOptions: {
        peerConnectionOptions: {
          rtcpMuxPolicy: 'negotiate'
        }
      }
    });
  },

  resetServer() {
    let config = this.get('configuration');
    let serverlist = config.transportOptions.wsServers;
    let len = this.get('active_server').length;

    if (serverlist.length === len) {
      this.set('cycle_server', this.get('cycle_server') + 1);
      if (this.get('cycle_server') > 1) {
        this.set('active_server', []);
        this.set('cycle_server', 0);
        return false;
      } else {
        this.set('active_server', []);
      }
      len = 0;
    }
    serverlist.forEach((item, index) => {
      if (index === len) serverlist[index].weight = 1;
      else serverlist[index].weight = 0;
    });
    this.active_server.push(len);
    config.transportOptions.wsServers = serverlist;
    this.set('configuration', config);
    this.register();
    return true;
  },

  setSipTrace(value) {
    let config = this.get('configuration');
    config.transportOptions.traceSip = value;
    this.set('configuration', config);
    this.register();
  },

  register() {
    if (this.user_agent === null || !this.user_agent.isRegistered()) {
      this.set('user_agent', new SIP.UA(this.configuration));
      this.addUserAgentHandlers();
      this.user_agent.start();
      this.subscribeForMWI();
    } else {
      this.user_agent.transport.on('disconnecting', function() {
        this.set('user_agent', new SIP.UA(this.configuration));
        this.addUserAgentHandlers();
        this.user_agent.start();
        this.subscribeForMWI();
      }.bind(this));
      this.unregister();
    }
  },

  unregister() {
    this.subscribes.forEach(subscription => subscription.close());
    if (this.active_call) {
      this.active_call.terminate();
      this.set('active_call', null);
      this.set('call_start_time', null);
    }
    this.calls_on_hold.forEach(x => x.terminate());
    return this.user_agent.unregister() && this.user_agent.stop() && this.user_agent.transport.disconnect();
  },

  async checkMediaAvailability() {
    let hasAudio = false;
    await navigator.mediaDevices.enumerateDevices()
      .then(function(devices) {
        devices.forEach(function(device) {
          //console.log(device);
          if (device.kind === 'audioinput') {
            hasAudio = true;
          }
        });
      });
    if (hasAudio) {
      this.get('notifications').clearAll();
    } else {
      let no_mic_message = 'Unable to find your microphone! You will be unable to make or receive calls without a microphone.';
      if (!this.get('notifications.content').some(function(element) {
        return element.message === no_mic_message;
      })) {
        this.get('notifications').error(no_mic_message, {
          autoClear: false
        });
      }
    }
  },

  async placeCall(destinationNumber, isVideo = false) {
    if (destinationNumber.startsWith('+')) {
      destinationNumber = destinationNumber.slice(1);
    }
    if (this.active_call) {
      this.hold();
    }
    let session = this.user_agent.invite(destinationNumber, isVideo ? this.getAudioVideoConstraints() : this.getAudioOnlyConstraints());
    this.set('started_call', session);
    this.addTrackHandler(session);
    this.addTerminatedHandler(session);
    session.on('accepted', function(data) {
      this.set('started_call', null);
      this.set('active_call', session);
      this.call_order.push(session.id);
      this.set('call_start_time', new Date());
      this.local_ringbacktone.setAttribute('src', '');
      session.sessionDescriptionHandler.getDescription();
    }.bind(this));
    session.on('progress', function(response) {
      if (response.status_code === 183 && response.body) {

        session.sessionDescriptionHandler.setDescription(response.body, session.sessionDescriptionHandlerOptions, session.modifiers)
          .catch((reason)=> {
            session.logger.warn(reason);
            session.failed(response, SIP.C.causes.BAD_MEDIA_DESCRIPTION);
            session.terminate({ status_code: 488, reason_phrase: 'Bad Media Description'});
          });
      }
      if (response.status_code === 180) {
        this.local_ringbacktone.setAttribute('src', '/softphone/ringbacktone.wav');
      }
    }.bind(this));
    this.eventBus.trigger('outgoingCall', session);
    this.trigger('outgoingCall', session);
    return session;
  },

  sendMessage(destinationNumber, message) {
    let request = this.user_agent.message(destinationNumber, message);
    this.trigger('outgoingSMS', request);
    return request;
  },

  addPresenceSubscription(targetUser) {
    if (!targetUser) { return null; }
    let existingSubscription = this.subscribes.find(sub => sub.event === 'presence' && sub.remoteIdentity.uri.aor === targetUser);
    if (!existingSubscription) {
      let subscription = this.user_agent.subscribe(targetUser, 'presence');
      this.subscribes.pushObject(subscription);
      return subscription;
    }
    return existingSubscription;
  },

  removePresenceSubscription(targetUser) {
    if (targetUser) {
      let subscription = this.subscribes.find(sub => sub.event === 'presence' && sub.remoteIdentity.uri.aor === targetUser);
      if (subscription) {
        subscription.close();
        this.subscribes.removeObject(subscription);
      }
    }
  },

  hangUp(id) {
    if (this.active_call && this.active_call.id === id) {
      this.remote_video.srcObject = null;
      this.local_video.srcObject = null;
      //this.local_audio_track = null;
      this.local_video_track = null;

      let termination = this.active_call.terminate();
      this.set('active_call', null);
      this.set('call_start_time', null);
      return termination;
    }
    else if (this.started_call && this.started_call.request.call_id === id) {
      let termination = this.started_call.terminate();
      this.set('started_call', null);
      return termination;
    }
    else {
      let held_call = this.calls_on_hold.find(x => x.key === id);
      if (held_call) {
        let termination = held_call.call.terminate();
        this.calls_on_hold.removeObject(held_call);
        return termination;
      }
    }
  },

  getCallsOnHold() {
    return this.calls_on_hold;
  },

  hold() {
    if (!this.active_call) {
      return false;
    }
    this.active_call.hold();
    this.calls_on_hold.pushObject({
      key: this.active_call.request.call_id,
      call: this.active_call,
      call_start_time: this.call_start_time,
      call_hold_time: new Date(),
    });
    this.set('active_call', null);
    return true;
  },

  unhold(callId) {
    if (!this.calls_on_hold) { return false; }
    let callToUnhold = this.calls_on_hold.find(x => x.key === callId);
    if (callToUnhold) {
      if (this.active_call) {
        this.hold();
      }
      this.set('active_call', callToUnhold.call);
      this.calls_on_hold.removeObject(callToUnhold);
      this.active_call.unhold();
      return true;
    }
    return false;
  },

  transfer(callId, target) {
    let call = this.get('calls').find(x => x.id === callId);
    if (call) {
      call.session.on('referRequested', function(context) {
        // Outgoing REFER Request
        if (context instanceof SIP.ReferClientContext) {
          //Set up event listeners
          context.on('referAccepted', function(referClientContext) {
            //console.log('referAccepted!');
            //console.log(referClientContext);
            if (call.status === 'active') {
              this.set('active_call', null);
            } else {
              this.calls_on_hold.removeObject(call);
            }
          }.bind(this));
          context.on('referRejected', function(referClientContext) {
            //console.log('referRejected!');
            //console.log(referClientContext);
            this.get('notifications').error('Failed to transfer call to ' + target, {
              autoClear: true,
              clearDuration: 6200,
            });
          }.bind(this));
          return;
        }
      }.bind(this));
      call.session.refer(target);
    }
  },

  sendDTMF(key, duration) {
    if (!this.active_call) { return; }
    let options = {
      'duration': duration
    };
    //console.log('sendDTMF: ' + key);
    this.active_call.dtmf(key, options);
  },

  toggleVideo() {
    if (this.get('local_video_track')) {
      this.set('local_video_track.enabled', !this.get('local_video_track.enabled'));
    }
  },

  // setMicrophoneMute(isMuted) {
  //   this.set('is_mic_muted', isMuted);
  //   if (this.active_call) {
  //       let pc = this.active_call.sessionDescriptionHandler.peerConnection;
  //       pc.getSenders().forEach(function (sender) {
  //           sender.track.enabled = !isMuted;
  //       });
  //   }
  // },

  reinvite(withVideo = false) {
    return this.active_call.reinvite(withVideo
      ? this.getAudioVideoConstraints()
      : this.getAudioOnlyConstraints());
  },

  takeRingingCall(extension) {
    return this.placeCall('*53' + extension);
  },

  //"Private" Methods
  subscribeForMWI() {
    let subscription = this.user_agent.subscribe(this.configuration.uri, 'message-summary');
    this.subscribes.pushObject(subscription);
  },

  addUserAgentHandlers() {
    this.user_agent.on('registered', () => {
      this.set('cycle_server', 0);
      this.eventBus.trigger('registrationState', true, 'Successfully registered');
    });
    this.user_agent.on('registrationFailed', (response, cause) => {
      if (cause !== 'AUTHENTICATION_ERROR') {
        this.eventBus.trigger('registrationState', false, response, cause);
        let obj = this;
        if (!this.resetServer()) {

          setTimeout(this.resetServer, 60000);

          this.get('notifications').error('Could not establish a connection to any WSS servers, waiting 60s to try again', {
            autoClear: true,
            clearDuration: 6200,
          });
        }
      }
    });
    this.user_agent.on('unregistered', (response, cause) => {
      this.trigger('unregistered', response, cause);
    });
    this.user_agent.on('message', data => {
      //this.eventBus.trigger('newConversation', data);
      return this.trigger('incomingSMS', data);
    });
    this.user_agent.on('transportCreated', (transport) => {
      //console.log('transportCreated!');
    });
    if (this.user_agent.transport) {
      this.user_agent.transport.on('transportError', () => {
        console.log('transportError!');
      });
    }
    this.user_agent.on('invite', session => {
      if (this.get('dnd_enabled')) {
        console.log('Call Rejected - DND');
        session.reject();
        return;
      }
      if (session.request.headers['Call-Info']) {
        this.trigger('call-info', session.request.headers['Call-Info']);
        console.log('Call-Info Header: ' + session.request.headers['Call-Info']);
      }
      session.on('accepted', function(message) {
        if (this.active_call) {
          this.active_call.hold();
        }
        this.set('active_call', session);
        this.call_order.push(session.id);
        this.set('call_start_time', new Date());
      }.bind(this));
      this.addTrackHandler(session);
      this.addTerminatedHandler(session);
      this.eventBus.trigger('incomingCall', session);
      this.trigger('incomingCall', session);
    });
    this.user_agent.on('notify', payload => {
      if (payload.request.body.includes('Messages-Waiting')) {
        this.trigger('mwiUpdate', payload.request);
      } else {
        this.trigger('presenceUpdate', payload.request);
      }
    });
  },

  addTrackHandler(session) {
    session.on('trackAdded', () => {
      let pc = session.sessionDescriptionHandler.peerConnection;
      // Gets remote tracks
      let remoteStream = new MediaStream();
      pc.getReceivers().forEach(receiver => {
        remoteStream.addTrack(receiver.track);
      });
      this.remote_video.srcObject = remoteStream;
      let remotePlayPromise = this.remote_video.play();
      if (remotePlayPromise !== undefined) {
        remotePlayPromise.catch(error => {
          // Don't bark if the stream isn't active
          if (remoteStream.active) {
            //console.error('remoteStream error!');
            //console.error(remoteStream);
            //console.error(error);
          }
        });
      }

      //Rethink all this, maybe we handle senders ourselves?

      // pc.getSenders().forEach(sender => {
      //   console.log(sender);
      //   //Only attach video streams
      //   if (sender.track != null && sender.track.kind == "video") {
      //     if (sender.track != null) {
      //       console.log(sender.track);
      //       if (this.local_video.srcObject == null) {
      //         this.local_video.srcObject = new MediaStream();
      //       }
      //       this.set('local_video_track', sender.track);
      //       this.local_video.srcObject.addTrack(sender.track);
      //     }
      //   }
      //   // else if (sender.track != null && sender.track.kind == "audio") {
      //   //   this.set('local_audio_track', sender.track);
      //   //   //this.local_audio_track = sender.track;
      //   // }
      //   else {
      //     console.log(sender);
      //   }
      // });

      //Remove the manual grabbing of the camera for now
      // if (this.local_video.srcObject == null && navigator.mediaDevices.getUserMedia) {
      //   navigator.mediaDevices.getUserMedia({ video: true })
      //     .then(function (stream) {
      //       this.local_video.srcObject = stream;
      //     }.bind(this)).catch(function (error) {
      //       console.log(error);
      //     });
      // }

      //console.log(this.local_video);
      //console.log(this.local_video.srcObject.getVideoTracks());
      //console.log(this.local_video.srcObject.getAudioTracks());

      // if (this.local_video.srcObject == null && navigator.mediaDevices.getUserMedia) {
      //   navigator.mediaDevices.getUserMedia({ audio: true })
      //     .then(function (stream) {
      //       this.local_video.srcObject = stream;
      //     }.bind(this)).catch(function (error) {
      //       console.log(error);
      //     });
      // }

      let localStream = new MediaStream();
      pc.getSenders().forEach(sender => {
        //console.log(sender);
        //Only attach video streams
        if (sender.track !== null) {
          if (this.local_video.volume === 0) {
            sender.track.enabled = false;
          }
          localStream.addTrack(sender.track);
        }
        //Only attach video streams
        // if (sender.track != null && sender.track.kind === "video") {
        //   localStream.addTrack(sender.track);
        // }
      });
      this.local_video.srcObject = localStream;
      /*
      let localPlayPromise = this.local_video.play();
      if (localPlayPromise !== undefined) {
        localPlayPromise.catch(error => {
          // Don't bark if the stream isn't active
          if (localStream.active) {
            console.error('localStream error!');
            console.error(localStream);
            console.error(error);
          }
        });
      }
      */
    });
  },

  addTerminatedHandler(session) {
    // call.session.on('terminated', (message, cause) => {
    //   this.get('calls').removeCall(call.id);
    // });
    // call.session.on('rejected', (response, cause) => {
    //   this.get('calls').removeCall(call.id);
    // });
    // call.session.on('cancel', data => {
    // });
    // call.session.on('bye', data => {
    // });
    // call.session.on('failed', data => {
    //   this.get('calls').removeCall(call.id);
    // });
    session.on('terminated', function(message, cause) {
      if (message) {
        let call_id = message.call_id;
        if (this.active_call && this.active_call.request && this.active_call.request.call_id === call_id) {
          this.set('active_call', null);
        }
        if (this.started_call && this.started_call.request && this.started_call.request.call_id === call_id) {
          this.set('started_call', null);
        }
        if (this.calls_on_hold && this.calls_on_hold.find(x => x.key === call_id)) {
          let callToRemove = this.calls_on_hold.find(x => x.key === call_id);
          this.calls_on_hold.removeObject(callToRemove);
        }
      }
    }.bind(this));
    session.on('cancel', function() {
      this.get('notifications').info('Call canceled', {
        autoClear: true,
        clearDuration: 6200,
      });
    }.bind(this));
    session.on('failed', function(response, cause) {
      let msgTxt = response ? response.status_code + ':' : '';
      if (msgTxt === '487:') return;
      if (cause.toLowerCase() !== 'webrtc error' && cause.toLowerCase() !== 'request terminated' && cause.toLowerCase() !== 'canceled') {
        this.get('notifications').error(`${msgTxt} ${cause}`, {
          autoClear: true,
          clearDuration: 6200,
        });
      }
    }.bind(this));
  },

  getAudioOnlyConstraints() {
    return {
      sessionDescriptionHandlerOptions: {
        constraints: {
          audio: true,
          video: false
        },
      },
    };
  },

  getAudioVideoConstraints() {
    return {
      sessionDescriptionHandlerOptions: {
        constraints: {
          audio: true,
          video: true
        },
      },
    };
  }
});
