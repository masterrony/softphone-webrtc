import Controller from '@ember/controller';
import { inject as service } from '@ember/service';
import { v4 as uuidv4 } from 'ember-uuid';

export default Controller.extend({

  ajax: service(),
  userAgent: service('sip-user-agent'),
  messages: null,
  instance_id: null,

  init() {
    this._super(...arguments);
    this.set('messages', []);
    this.set('instance_id', uuidv4());
    //Capture console methods
    let nativeLog = console.log.bind(console);
    let nativeDebug = console.debug.bind(console);
    let nativeWarn = console.warn.bind(console);
    let nativeError = console.error.bind(console);
    let nativeInfo = console.info.bind(console);
    //Override console methods
    console.debug = function(text) {
      this.uploadLog(text, 'DEBUG');
      nativeDebug(text);
    }.bind(this);
    console.info = function(text) {
      this.uploadLog(text, 'INFO');
      nativeInfo(text);
    }.bind(this);
    console.log = function(text) {
      this.uploadLog(text, 'DEBUG');
      nativeLog(text);
    }.bind(this);
    console.warn = function(text) {
      this.uploadLog(text, 'WARNING');
      nativeWarn(text);
    }.bind(this);
    console.error = function(text) {
      this.uploadLog(text, 'ERROR');
      nativeError(text);
    }.bind(this);
  },

  uploadLog(message, level) {
    if (typeof message === 'string') {
      let message_segments = message.split('|');
      if (message_segments.length > 1) {
        message_segments.shift();
      }
      message = message_segments.join('|').trim();
    }
    else if (typeof message === 'string') {
      
    }
    else {
      message = JSON.stringify(message);
    }
    if (this.userAgent.active_call) {
      this.messages.push({ message: message, level: level, call_id: this.userAgent.active_call.id, instance_id: this.instance_id, timestamp: new Date().toISOString() });
    }
    else {
      this.messages.push({ message: message, level: level, instance_id: this.instance_id, timestamp: new Date().toISOString() });
    }
    if (this.messages.length > 10) {
      let toSend = this.messages.slice(0, 10);
      for (let i = 9; i >= 0; i--) {
        this.messages.splice(i, 1);
      }
      // this.get('ajax').request('/logging/softphone', {
      //   method: 'POST',
      //   data: {
      //     messages: toSend
      //   }
      // });
    }
  }
});
