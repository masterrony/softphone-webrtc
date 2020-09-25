import Component from '@ember/component';
import { inject as service } from '@ember/service';

export default Component.extend({

  userAgent: service('sip-user-agent'),

  classNames: ['modal', 'options'],
  classNameBindings: ['show:open'],

  sip_trace_enable: false,

  actions: {
    closeModal() {
      this.set('show', false);
    },

    supressClose() {

    },

    toggleSIPTrace() {
      this.set('sip_trace_enable', !this.get('sip_trace_enable'));
      this.userAgent.setSipTrace(this.get('sip_trace_enable'));
    },
  },
});
