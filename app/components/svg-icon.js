import Component from '@ember/component';

export default Component.extend({

  classNameBindings: ['isMuted'],

  didInsertElement() {
    this.set('classNames', this.get('class').split(' '));
  },
});
