import Service from '@ember/service';

export default Service.extend({

  init() {
    this._super(...arguments);
    this.checkPermissions();
  },

  checkPermissions() {
    if (window.Notification && Notification.permission !== 'granted') {
      Notification.requestPermission(function(status) {
        if (Notification.permission !== status) {
          Notification.permission = status;
        }
      });
    }
  },

  display(message, closeAfter) {
    let notification = new Notification(message);
    if (closeAfter) {
      setTimeout(notification.close.bind(notification), closeAfter);
    }
    return notification;
  }
});
