import Component from '@ember/component';
import { inject as service } from '@ember/service';
import { computed } from '@ember/object';
import moment from 'moment';
import { Message } from '../utils/message';
import { later } from '@ember/runloop';

export default Component.extend({
  userAgent: service('sip-user-agent'),
  eventBus: service(),
  tagName: 'section',
  classNames: ['messages'],
  classNameBindings: ['display:open'],
  isMessageEmpty: computed('reply', function() {
    return !this.reply;
  }),
  messages: null,
  activeContactId: null,
  activeMessages: computed('messages', 'activeContactId', 'messages.length', function() {
    let conversation = this.messages.filter(m => m.contactId === this.activeContactId);
    if (conversation) {
      this.setMilestones();
      conversation.sort(function(first, second) { return new Date(second.date) - new Date(first.date); });
      return conversation;
    }
    return [];
  }),

  init() {
    this._super(...arguments);
    this.set('messages', []);
    this.milestones = [];
    this.milestones.pushObjects(
      [
        { date: moment().subtract(100, 'years').startOf('year'), label: 'Dinosaurs yet not died out' },
        { date: moment().startOf('year'), label: 'This year' },
        { date: moment().startOf('month'), label: 'This month' },
        { date: moment().startOf('week'), label: 'This week' },
        { date: moment().subtract(1, 'day').startOf('day'), label: 'Yesterday' },
        { date: moment().startOf('day'), label: 'Today' },
      ]
    );
    this.eventBus.on('incomingContactMessage', this.incomingContactMessageHandler.bind(this));
    this.eventBus.on('setActiveConversation', this.activeConversationHandler.bind(this));
  },

  incomingContactMessageHandler(messageData) {
    let message = Message.create({
      from: messageData.from,
      to: this.userAgent.configuration.phone,
      createdAt: messageData.createdAt,
      text: messageData.text,
      milestone: this.get('milestones.lastObject'),
      sameMilestone: this.get('messages.lastObject.milestone.date') === this.get('milestones.lastObject.date'),
      contactId: messageData.contactId,
    });
    this.get('messages').addObject(message);
    this.eventBus.trigger('contactLastUpdated', message.contactId);
  },

  activeConversationHandler(contactData) {
    this.set('activeContactId', contactData.id);
    this.set('contactPhone', contactData.phone);
    this.get('element').querySelector('.sms-input').focus();
    later(this, this.scrollMessageList, 10);
  },

  scrollMessageList() {
    let list = this.get('element').querySelector('.messages-list');
    if (list && list.lastElementChild) {
      list.lastElementChild.scrollIntoView();
    }
  },

  setMilestones() {
    let same;
    this.get('messages').forEach((message, index, array) => {
      message.set('milestone', this.get('milestones').filter((milestone) => {
        return message.createdAt > milestone.date;
      }).get('lastObject'));
      if (index > 0) {
        same = array[index - 1].get('milestone.date') === message.milestone.date;
        message.set('sameMilestone', same);
      }
    });
  },

  didUpdateAttrs() {
    // if (this.get('contact')) {
    //   this.get('contact.messages').sortBy('createdAt');
    //   this.setMilestones();
    // }
  },

  actions: {
    sendMessage() {
      let sentMessage = this.userAgent.sendMessage(this.get('contactPhone'), this.get('reply'));
      sentMessage.on('accepted', (data) => {
        let message = Message.create({
          from: this.userAgent.configuration.phone,
          to: data.to.uri.user,
          createdAt: moment().toDate(),
          text: this.get('reply'),
          milestone: this.get('milestones.lastObject'),
          sameMilestone: this.get('messages.lastObject.milestone.date') === this.get('milestones.lastObject.date'),
          contactId: this.get('activeContactId'),
        });
        this.get('messages').addObject(message);
        this.eventBus.trigger('contactLastUpdated', this.get('activeContactId'));
        this.set('reply', '');
      });
    },

    // closeMessages() {
    //   this.get('onCloseMessages')();
    // },
  },
});
