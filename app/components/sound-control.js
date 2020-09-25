import Component from '@ember/component';

export default Component.extend({
  classNames: ['control'],

  isMuted: false,
  previousVolume: 0,
  icon_name: '',
  muted_name: '',
  showSlider: false,

  didInsertElement() {
    this.set('icon_name', this.get('icon'));
    this.set('muted_name', this.get('icon') + '-muted');
  },

  actions: {
    setVolume(volume) {
      this.get('setVolume')(volume);
      if (this.get('isMuted')) {
        this.set('isMuted', false);
        this.set('previousVolume', 0);
      }
    },

    toggleMute() {

      this.set('isMuted', !this.get('isMuted'));
      if (this.get('isMuted')) {
        this.set('previousVolume', this.get('volume'));
        this.set('volume', 0);
        this.get('setVolume')(0);
      } else {
        this.get('setVolume')(this.get('previousVolume'));
        this.set('volume', this.get('previousVolume'));
        this.set('previousVolume', 0);
      }
    }
  }
});
