module.exports = {
  globals: {
    server: true,
    SIP: true,
  },
  root: true,
  parserOptions: {
    ecmaVersion: 2017,
    sourceType: 'module'
  },
  plugins: [
    'ember'
  ],
  extends: [
    'eslint:recommended',
    'plugin:ember/recommended'
  ],
  env: {
    browser: true
  },
  rules: {
    'no-unused-vars' : 'off',
    'no-console' : 'off',
    'ember/no-side-effects' : 'off',
    'quotes': ['error', 'single'],
    'no-multi-spaces': 'error',
    'comma-dangle': ['error', 'only-multiline'],
    'eol-last': ['error', 'always'],
    'no-multiple-empty-lines': ['error', { 'max': 1, 'maxEOF': 1 }],
    'no-trailing-spaces': ['error', { 'skipBlankLines': true }],
    'no-var': 'error',
    'eqeqeq': ['error', 'always'],
    'indent': ['error', 2],
    'linebreak-style': ['error', 'unix'],
    'semi': ['error', 'always'],
    'space-before-function-paren': ['error', 'never'],
    'space-before-blocks': 'error',
    'func-call-spacing': ['error', 'never'],
    'keyword-spacing': ['error'],
  },
  overrides: [
    // node files
    {
      files: [
        '.template-lintrc.js',
        'ember-cli-build.js',
        'testem.js',
        'blueprints/*/index.js',
        'config/**/*.js',
        'lib/*/index.js'
      ],
      parserOptions: {
        sourceType: 'script',
        ecmaVersion: 2015
      },
      env: {
        browser: false,
        node: true
      }
    }
  ]
};
