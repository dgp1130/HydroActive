import * as fs from 'fs';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const jasminePath = require.resolve('jasmine-core/lib/jasmine-core/jasmine.js');

const testFramework = {
  config: {
    timeout: 1_000,
  },
};

// TODO: Export this plugin (or a Mocha version) as WTR doesn't seem to make prerendered HTML tests easy.
// See: https://modern-web.dev/docs/dev-server/writing-plugins/overview/
const jasminePlugin = {
  name: 'jasmine',
  transform(ctx) {
    if (!ctx.response.is('html') || ctx.url === '/') return;

    const testEntryPoint = ctx.url.replace(/\?.*/, '').replace(/\.html$/, '.js');
    return { body: ctx.body.replace('</head>', () => `${testRunner(testEntryPoint)}</head>`) };
  },
};

export default {
  testFramework,
  rootDir: 'dist/',
  nodeResolve: true,
  plugins: [ jasminePlugin ],
};

// See: https://github.com/blueprintui/web-test-runner-jasmine/blob/d07dad01e9e287ea96c41c433c6f787f6170566a/src/index.ts
function testRunner(entryPoint) {
  return `
<!-- Inject Jasmine dependency. This seems to require "sloppy" mode. -->
<script>${fs.readFileSync(jasminePath, 'utf8')}</script>

<!-- Run the tests. -->
<script type="module">
${fs.readFileSync('jasmine-runner.mjs', 'utf8')}

run('${entryPoint}', ${JSON.stringify(testFramework, null, 4)});
</script>
  `.trim();
}
