const path = require('path')
const { svenchify } = require('svench/snowpack')

module.exports = svenchify(require('./snowpack.config.js'))

// module.exports = svenchify(require('./snowpack.config.js'), {
//   enabled: true,
//
//   svelte: {
//     css: true, // CSS in JS
//   },
//
//   // The root dir that Svench will parse and watch.
//   dir: './src',
//
//   // svenchDir: '.svench',
//
//   override: {
//     mount: {
//       '.svench/public': { url: '/', static: true },
//       public: { url: '/', static: true },
//       '.svench/src': { url: '/_svench_' },
//       src: { url: '/dist' },
//     },
//     devOptions: {
//       port: 4242,
//     },
//   },
//
//   resolveRouteImport: x => '/dist/' + path.relative('src', x),
//
//   // index: true,
//   index: {
//     source: 'public/index.html',
//     replace: {
//       '/dist/index.js': '/_svench_/svench.js',
//       'Snowpack App': 'Svench app',
//     },
//     write: '.svench/public/index.html',
//   },
// })
