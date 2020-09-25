import { computed } from '@ember/object';
import AjaxService from 'ember-ajax/services/ajax';
import { inject as service } from '@ember/service';

export default AjaxService.extend({
  session: service(),
  headers: computed('session.data.authenticated.access_token', {
    get() {
      let headers = {};
      const authToken = this.get('session.data.authenticated.access_token');
      if (authToken) {
        headers['Authorization'] = 'Bearer: ' + authToken;
      }
      return headers;
    }
  }),
  contentType: 'application/json; charset=utf-8'
});
