import Service from '@ember/service';

export default Service.extend({

  init() {
    this._super(...arguments);
    this.shortcuts = [];
    this.shortcuts.pushObjects(
      [
        { keyCode: new Set([8]), shiftKey: new Set([false, true]), action: 'removeLastDigit', argument: null },
        { keyCode: new Set([27]), shiftKey: new Set([false, true]), action: 'closeModal', argument: null },
        { keyCode: new Set([49, 97]), shiftKey: new Set([false, true]), action: 'keyPress', argument: '1' },
        { keyCode: new Set([50, 98, 65, 66, 67]), shiftKey: new Set([false, true]), action: 'keyPress', argument: '2' },
        { keyCode: new Set([99, 68, 69, 70]), shiftKey: new Set([false, true]), action: 'keyPress', argument: '3' },
        { keyCode: new Set([51]), shiftKey: new Set([false]), action: 'keyPress', argument: '3' },
        { keyCode: new Set([52, 100, 71, 72, 73]), shiftKey: new Set([false, true]), action: 'keyPress', argument: '4' },
        { keyCode: new Set([53, 101, 74, 75, 76]), shiftKey: new Set([false, true]), action: 'keyPress', argument: '5' },
        { keyCode: new Set([54, 102, 77, 78, 79]), shiftKey: new Set([false, true]), action: 'keyPress', argument: '6' },
        { keyCode: new Set([55, 103, 80, 81, 82, 83]), shiftKey: new Set([false, true]), action: 'keyPress', argument: '7' },
        { keyCode: new Set([56]), shiftKey: new Set([false]), action: 'keyPress', argument: '8' },
        { keyCode: new Set([104, 84, 85, 86]), shiftKey: new Set([false, true]), action: 'keyPress', argument: '8' },
        { keyCode: new Set([57, 105, 87, 88, 89, 90]), shiftKey: new Set([false, true]), action: 'keyPress', argument: '9' },
        { keyCode: new Set([48, 96]), shiftKey: new Set([false, true]), action: 'keyPress', argument: '0' },
        { keyCode: new Set([61, 107]), shiftKey: new Set([false, true]), action: 'keyPress', argument: '+' },
        { keyCode: new Set([56]), shiftKey: new Set([true]), action: 'keyPress', argument: '*' },
        { keyCode: new Set([106]), shiftKey: new Set([false, true]), action: 'keyPress', argument: '*' },
        { keyCode: new Set([51]), shiftKey: new Set([true]), action: 'keyPress', argument: '#' },
        { keyCode: new Set([13]), shiftKey: new Set([false]), action: 'makeCall', argument: null },
      ]
    );
    this.dashboardShortcuts = [];
    this.dashboardShortcuts.pushObjects(
      [
        { keyCode: new Set([8]), shiftKey: new Set([false, true]), action: 'removeLastDigit', argument: null },
        { keyCode: new Set([13]), shiftKey: new Set([false]), action: 'makeCall', argument: null },
        { keyCode: new Set([13]), shiftKey: new Set([true]), action: 'startConversation', argument: null },
      ]
    );
  },

  resolveAction(key) {
    let shortcut = this.get('shortcuts').find((item) => {
      return item.keyCode.has(key.keyCode) && item.shiftKey.has(key.shiftKey);
    });
    return shortcut;
  },

  resolveDashboardAction(key) {
    let shortcut = this.get('dashboardShortcuts').find((item) => {
      return item.keyCode.has(key.keyCode) && item.shiftKey.has(key.shiftKey);
    });
    return shortcut;
  }

});
