import DS from 'ember-data';
import Inflector from 'ember-inflector';
import { camelize } from '@ember/string';
import { isPresent } from '@ember/utils';
import DataAdapterMixin from 'ember-simple-auth/mixins/data-adapter-mixin';

export default DS.JSONAPIAdapter.extend(DataAdapterMixin, {

  authorize(xhr) {
    let { access_token } = this.get('session.data.authenticated');
    if (isPresent(access_token)) {
      xhr.setRequestHeader('Authorization', `Bearer ${access_token}`);
    }
  },

  pathForType(modelName) {
    let camelized = camelize(modelName);
    return Inflector.inflector.pluralize(camelized.toLowerCase());
  }
});
