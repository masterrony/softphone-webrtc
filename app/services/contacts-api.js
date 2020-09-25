import Service from '@ember/service';
import { inject as service } from '@ember/service';
import { Contact } from '../utils/contact';
import { isBlank } from '@ember/utils';

export default Service.extend({
  ajax: service(),
  notifications: service('notification-messages'),
  cachedContacts: null,

  init() {
    this._super(...arguments);
    this.fetchForCache();
    this.fetchContactsLoop();
  },

  fetchContactsLoop() {
    setTimeout(function() {
      this.fetchForCache();
      return this.fetchContactsLoop();
    }.bind(this), 600000);
  },

  fetchForCache() {
    this.get('ajax')
      .request('/contacts/softphone_roster')
      .then(
        function(success) {
          this.set('cachedContacts', success);
          // let fetchTime = new Date();
          // let phones, firstPhone, username;
          // this.set('cachedContacts', success.map(item => {
          //   phones = item.telephone || [];
          //   firstPhone = phones.find(phone => phone.type === 'phone');
          //   if (item.contact_type === 'directory') {
          //     username = item.presence_uri.split('@',1)[0];
          //   } else {
          //     username = item.user.split('@',1)[0] || item.phone;
          //   }
          //   if (isBlank(username)) {
          //     username = item.phone;
          //   }
          //   return Contact.create({
          //     name: item.name,
          //     phone: firstPhone && firstPhone.number,
          //     username: username,
          //     uri: item.presence_uri,
          //     lastUpdated: fetchTime,
          //     favorite: item.favorite
          //   });
          // }));
        }.bind(this),
        function(failure) {
          this.get('notifications').error('Failed to retrieve contacts: ' + failure, {
            autoClear: true,
            clearDuration: 60000
          });
        }.bind(this));
  },

  async getContacts() {
    while (this.cachedContacts === null) {
      await this.sleep(100);
    }
    return this.get('cachedContacts');
  },

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  },

  addFavorite(contactId) {
    return this.get('ajax')
      .post('/contacts/favorites/' + contactId)
      .then(
        function(success) {
          return true;
        },
        function(failure) {
          this.get('notifications').error('Failed to add favorite: ' + failure, {
            autoClear: true,
            clearDuration: 60000
          });
          return false;
        }.bind(this));
  },

  removeFavorite(contactId) {
    return this.get('ajax')
      .delete('/contacts/favorites/' + contactId)
      .then(
        function(success) {
          return true;
        },
        function(failure) {
          this.get('notifications').error('Failed to remove favorite: ' + failure, {
            autoClear: true,
            clearDuration: 60000
          });
          return false;
        }.bind(this));
  },
});
