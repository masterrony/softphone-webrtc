// app/controllers/login.js
import Controller from '@ember/controller';
import { inject as service } from '@ember/service';

export default Controller.extend({
  session: service('session'),
  notifications: service('notification-messages'),

  actions: {
    authenticate: function() {
      const credentials = this.getProperties('username', 'password');
      const authenticator = 'authenticator:jwt';

      this.get('session').authenticate(authenticator, credentials).then(() => {
        this.transitionToRoute('index');
      }, (reason) => {
        this.get('notifications').error('Login failed. Invalid username or password.', {
          autoClear: true,
          clearDuration: 6200
        });
      });
    }
  }
});
