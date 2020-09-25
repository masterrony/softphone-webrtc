import Component from '@ember/component';
import { computed } from '@ember/object';
import { inject as service } from '@ember/service';

export default Component.extend({
  attributeBindings: ['role'],
  role: 'button',
  classNames: ['contact', 'action'],
  classNameBindings: [
    'contact.active:active',
    'contact.selected:selected',
    'contact.unregistered:unregistered',
    'contact.calling:calling',
    'contact.talking:talking',
    'contact.available:available',
  ],
  canGetPresence: computed('contact.{contact_type,presence_uri}', {
    get() {
      return this.contact.contact_type === 'directory' && this.contact.presence_uri !== '';
    }
  }),
  contactsService: service('contacts-api'),
  userAgent: service('sip-user-agent'),
  eventBus: service(),

  didInsertElement() {
    if (this.get('contact.favorite') && this.get('canGetPresence')) {
      let subscription = this.get('userAgent').addPresenceSubscription(this.get('contact.presence_uri'));
      subscription.on('notify', this.notifyHandler.bind(this));
    }
  },

  click() {
    this.set('contact.selected', true);
    if (this.get('contact.hasNewMessages')) {
      this.set('contact.hasNewMessages', false);
    }
    this.eventBus.trigger('setActiveConversation', { id: this.get('contact.id'), phone: this.get('contact.telephone')[0].number });
  },

  notifyHandler: function(payload) {
    if (this.isDestroyed) {
      return;
    }
    if (payload.request.body.includes('rdelgrosso')) {
      //console.log(payload);
    }
    //console.log(payload);
    let openMatch = /<basic>(.*)<\/basic>/g;
    let isOpenResult = openMatch.exec(payload.request.body);
    // Remove all existing presence classes
    //this.get('contact').setProperties({ unregistered: false, calling: false, talking: false, available: false });
    // Only process subscriptions that are open
    if (isOpenResult[1] !== 'open') {
      // Blank the state when we close the subscription so we don't leave stale data
      this.set('contact.status', '');
      return;
    }
    let presenceMatch = /<dm:note>(.*)<\/dm:note>/g;
    let presenceState = presenceMatch.exec(payload.request.body);
    let presenceDescription = presenceState[1];
    // Add current presence class
    // if (presenceDescription.includes('Unregistered')) {
    //   this.get('contact').set('unregistered', true);
    // } else if (presenceDescription.includes('Ring')) {
    //   this.get('contact').set('calling', true);
    // } else if (presenceDescription.includes('Call')) {
    //   this.get('contact').set('calling', true);
    // } else if (presenceDescription.includes('Talk')) {
    //   this.get('contact').set('talking', true);
    // } else {
    //   this.get('contact').set('available', true);
    // }
    this.set('contact.status', presenceDescription);
  },

  dragOver(event) {
    event.preventDefault();
  },

  dragLeave(event) {
    event.preventDefault();
  },

  drop(event) {
    let destination;
    if (this.get('contact.presence_uri')) {
      destination = this.get('contact.presence_uri').split('@')[0];
    } else {
      destination = this.get('contact.telephone')[0].number;
    }

    let callId = event.dataTransfer.getData('text/data');
    this.userAgent.transfer(callId, destination);
  },

  actions: {

    toggleFavorite() {
      let action;
      if (this.get('contact.favorite')) {
        action = this.get('contactsService').removeFavorite(this.get('contact.telephone')[0].number);
        action.then(success => {
          this.get('userAgent').removePresenceSubscription(this.get('contact.presence_uri'));
          this.set('contact.favorite', false);
          this.set('contact.status', '');
          this.eventBus.trigger('contactLastUpdated', this.get('contact.id'));
        });
      }
      else {
        action = this.get('contactsService').addFavorite(this.get('contact.telephone')[0].number);
        action.then(success => {
          let subscription = this.get('userAgent').addPresenceSubscription(this.get('contact.presence_uri'));
          subscription.on('notify', this.notifyHandler.bind(this));
          this.set('contact.favorite', true);
          this.eventBus.trigger('contactLastUpdated', this.get('contact.id'));
        });
      }
      return false;
    },

    makeCall() {
      if (this.get('contact.presence_uri')) {
        this.get('userAgent').placeCall(this.get('contact.presence_uri').split('@')[0]);
      }
      else {
        this.get('userAgent').placeCall(this.get('contact.telephone')[0].number);
      }
    },

    makeVideoCall() {
      if (this.get('contact.presence_uri')) {
        this.get('userAgent').placeCall(this.get('contact.presence_uri').split('@')[0], true);
      }
      else {
        this.get('userAgent').placeCall(this.get('contact.telephone')[0].number, true);
      }
    },
  },
});
