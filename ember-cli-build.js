'use strict';

const EmberApp = require('ember-cli/lib/broccoli/ember-app');

module.exports = function(defaults) {
  let app = new EmberApp(defaults, {
    svgstore: {
      files: {
        sourceDirs: ['public/img/icons'],
        outputFile: 'img/icons.svg',
      },
      svgstoreOpts: {
        cleanDefs: true,
        cleanSymbols: true,
        symbolAttrs: {
          viewBox: '0 0 24 24',
          fill: 'currentColor'
        }
      }
    },
  });
  app.import({
    development: 'node_modules/sip.js/dist/sip.js',
    production:  'node_modules/sip.js/dist/sip.min.js'
  });
  app.import('node_modules/normalize.css/normalize.css');
  return app.toTree();
};
