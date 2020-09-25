import EmberObject from '@ember/object';
import { alias } from '@ember/object/computed';

const Contact = EmberObject.extend({
  init() {
    this.set('messages', []);
  },
});

export { Contact };
