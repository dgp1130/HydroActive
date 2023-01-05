// TODO: Export this plugin as WTR doesn't seem to make prerendered HTML tests easy.
// See: https://modern-web.dev/docs/dev-server/writing-plugins/overview/
const serveHtmlPlugin = {
  name: 'serve-html',
  transform(ctx) {
    if (!ctx.response.is('html') || ctx.url === '/') return;

    const testEntryPoint = ctx.url.replace(/\?.*/, '').replace(/\.html$/, '.js');
    return {
      body: ctx.body
        .replace('</head>', `<script type="module">${testRunner(testEntryPoint)}</script></head>`)
        .replace('<body>', '<body><div id="mocha"></div>'), // TODO: Better reporter.
    };
  }
};

export default {
  rootDir: 'dist/',
  nodeResolve: true,
  plugins: [ serveHtmlPlugin ],
};

// See: https://modern-web.dev/docs/test-runner/test-frameworks/mocha/#writing-html-tests
function testRunner(entryPoint) {
  return `
import { mocha, sessionFinished, sessionFailed } from '@web/test-runner-mocha';

try {
  // setup mocha
  mocha.setup({ ui: 'bdd' });

  // import test file
  await import('${entryPoint}');

  // run the tests, and notify the test runner after finishing
  mocha.run((...args) => {
    sessionFinished();
  });
} catch (error) {
  console.error(error);
  // notify the test runner about errors
  sessionFailed(error);
}
  `.trim();
}
