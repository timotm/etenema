var require = {
  baseUrl: "/js/",
  paths: {
    'jquery': 'lib/jquery-2.1.1.min',
    'bacon': 'lib/bacon-0.7.22.min',
    'lodash': 'lib/lodash-2.4.1.min',
    'flot': 'lib/flot/jquery.flot.min',
    'flot-resize': 'lib/flot/jquery.flot.resize.min',
    'handlebars': 'lib/handlebars-v1.3.0',
    'hbs': 'lib/require-handlebars-plugin/hbs'
  },
  shim: {
    'handlebars': {
      exports: 'Handlebars'
    },
    'flot': {
      deps: ['jquery']
    },
    'flot-resize': {
      deps: ['flot']
    },
    'bacon': {
      deps: ['jquery']
    }
  },
  hbs: {
    helpers: false,
    i18n: false,
    templateExtension: 'hbs',
    partialsUrl: 'templates/'
  },
  waitSeconds: 10
}
