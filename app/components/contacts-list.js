import Component from '@ember/component';
import { sort } from '@ember/object/computed';
import { computed } from '@ember/object';
import { inject as service } from '@ember/service';
import { set } from '@ember/object';
import { v4 as uuidv4 } from 'ember-uuid';

export default Component.extend({
  notifications: service('notification-messages'),
  userAgent: service('sip-user-agent'),
  contactsService: service('contacts-api'),
  eventBus: service(),

  classNames: ['contacts-list'],
  contactSort: Object.freeze(['last_updated:desc', 'hasNewMessages:desc', 'favorite:desc', 'name:asc']),
  sortedContacts: sort('contacts', 'contactSort'),
  contacts: null,

  liveContacts: computed('filter', 'filteredContacts', 'filteredContacts.@each.last_updated', 'contacts.@each.last_updated', function() {
    this.filterContacts();
    return this.get('filteredContacts');
  }),

  init() {
    this._super(...arguments);
    this.set('contacts', []);
  },

  didInsertElement() {
    this._super(...arguments);
    this.contactsService.getContacts().then(this.contactsFetchHandler.bind(this));
    this.fetchContactsLoop();
    this.eventBus.on('contactLastUpdated', this.contactLastUpdatedHandler.bind(this));
    this.eventBus.on('outgoingCall', this.outgoingCallHandler.bind(this));
    this.eventBus.on('incomingCall', this.incomingCallHandler.bind(this));
    this.eventBus.on('setActiveConversation', this.contactSelectedHandler.bind(this));
    this.eventBus.on('outgoingSMS', this.outgoingSMSHandler.bind(this));
    this.userAgent.on('incomingSMS', this.incomingSMSHandler.bind(this));
  },

  didDestroyElement() {
    this._super(...arguments);
  },

  didReceiveAttrs() {
    this._super(...arguments);
  },

  contactsFetchHandler(result) {
    let fetchTime = new Date();
    result.forEach(contact => {
      if (!this.contacts.some((item) => item.id === contact.id)) {
        set(contact, 'last_updated', fetchTime);
        this.contacts.pushObject(contact);
      }
    });
    this.contacts.forEach(contact => {
      if (!result.some((item) => item.id === contact.id) && !contact.localOnly) {
        this.contacts.removeObject(contact);
      }
    });
    this.filterContacts();
  },

  contactLastUpdatedHandler(contactId) {
    let contact = this.contacts.find(x => x.id === contactId);
    set(contact, 'last_updated', new Date());
  },

  contactSelectedHandler(contactData) {
    this.get('contacts').filter(contact => contact.id !== contactData.id).forEach(contact => set(contact, 'selected', false));
  },

  outgoingCallHandler(callData) {
    let contactId = this.getContactId(callData.request.to.uri.user);
    this.eventBus.trigger('contactLastUpdated', contactId);
  },

  incomingCallHandler(callData) {
    let contactId = this.getContactId(callData.request.from.uri.user);
    this.eventBus.trigger('contactLastUpdated', contactId);
  },

  incomingSMSHandler(messageData) {
    let contactId = this.getContactId(messageData.request.from.uri.user);
    let message = {
      from: messageData.request.from.uri.user,
      createdAt: new Date(),
      //createdAt: moment().toDate(),
      text: messageData.body,
      contactId: contactId,
    };
    let contact = this.get('contacts').find(c => c.id === contactId);
    if (!contact.selected) {
      set(contact, 'hasNewMessages', true);
    }
    this.eventBus.trigger('incomingContactMessage', message);
    this.eventBus.trigger('contactLastUpdated', contactId);
  },

  outgoingSMSHandler(phoneNumber) {
    let contactId = this.getContactId(phoneNumber);
    this.eventBus.trigger('setActiveConversation', { id: contactId, phone: phoneNumber });
  },

  //"Private" Methods
  filterContacts() {
    let filter = this.filter || '';
    filter = filter.replace(/\*+/g, '');
    filter = filter.replace(/#+/g, '');
    let contactRegExp = new RegExp(filter, 'i');
    this.set('filteredContacts', this.sortedContacts.filter(function(contact) {
      let isMatch = contactRegExp.test(contact.name);
      if (!isMatch) {
        contact.telephone.forEach(function(item) {
          //Stop actually once we get a match
          if (!isMatch) {
            isMatch = contactRegExp.test(item.number);
          }
        });
      }
      return isMatch;
    }));
  },

  // uuidv4() {
  //   return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
  //     let r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
  //     return v.toString(16);
  //   });
  // },

  fetchContactsLoop() {
    setTimeout(function() {
      this.contactsService.getContacts().then(this.contactsFetchHandler.bind(this));
      return this.fetchContactsLoop();
    }.bind(this), 600000);
  },

  getContactId(remoteParty) {
    let existingContact;
    let remotenum = remoteParty;
    this.contacts.forEach(function(contact) {

      if (remoteParty.startsWith('+1')) {
        remoteParty = remoteParty.slice(2);
      }
      else if (remoteParty.startsWith('1') && remoteParty.length > 10) {
        remoteParty = remoteParty.slice(1);
      } else if (remoteParty.startsWith('011')) {
        //Outbound international should match e164 syntax, since we are assuming that's how international contact numbers would be stored
        remoteParty = '+' + remoteParty.slice(3);
      }

      if (contact.presence_uri && !existingContact) {
        if (remoteParty === contact.presence_uri.split('@')[0]) {
          existingContact = contact;
        }
      }
      if (contact.telephone && !existingContact) {
        contact.telephone.forEach(function(entry) {
          if (remotenum === entry.number) {
            existingContact = contact;
          }
        });
      }
    });

    if (existingContact) {
      return existingContact.id;
    } else {
      let contactId = uuidv4();
      this.contacts.pushObject({
        localOnly: true,
        name: remoteParty,
        id: contactId,
        last_updated: new Date(),
        telephone: [{
          number: remotenum,
          type: 'phone'
        }]
      });
      return contactId;
    }
  },
});
