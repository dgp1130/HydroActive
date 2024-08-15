/**
 * @fileoverview Exposes a `run` function which runs a Jasmine test suite for the given entry point.
 *
 * Forked from https://github.com/blueprintui/web-test-runner-jasmine/blob/d07dad01e9e287ea96c41c433c6f787f6170566a/src/index.ts.
 */

import {
  getConfig,
  sessionFailed,
  sessionFinished,
  sessionStarted,
} from '@web/test-runner-core/browser/session.js';

// Initialize Jasmine on the page.
const jasmine = jasmineRequire.core(jasmineRequire);
const jasmineGlobal = jasmine.getGlobal();
jasmineGlobal.jasmine = jasmine;

const jasmineEnv = jasmine.getEnv();

Object.assign(jasmineGlobal, jasmineRequire.interface(jasmine, jasmineEnv));

// Web Test Runner uses a different HTML page for every test, so we only get
// one `testFile` for the single `*.js` file we need to execute.
const { testFile: htmlFile, testFrameworkConfig } = await getConfig();
const config = {
  defaultTimeoutInterval: 60_000,
  ...(testFrameworkConfig ?? {}),
};
const testFile = htmlFile.replace(/\.html(?=\?|$)/, '.js');

jasmine.DEFAULT_TIMEOUT_INTERVAL = config.defaultTimeoutInterval;
jasmineEnv.configure(config);

const allSpecs = [];
const failedSpecs = [];

jasmineEnv.addReporter({
  specDone(result) {
    const expectations = [
      ...result.passedExpectations,
      ...result.failedExpectations,
    ];
    allSpecs.push(...expectations.map((e) => ({
      name: e.fullName,
      passed: e.passed,
    })));

    for (const e of result.failedExpectations) {
      const message = `${result.fullName}\n${e.message}\n${e.stack}`;
      console.error(message);
      failedSpecs.push({
        message,
        name: e.fullName,
        stack: e.stack,
        expected: e.expected,
        actual: e.actual,
      });
    }

    if (result.status === 'failed' && expectations.length === 0
        && config.failSpecWithNoExpectations) {
      console.error(`Spec ran no expectations - "${result.fullName}"`);
    }
  },

  async jasmineDone(result) {
    console.log(`Tests ${result.overallStatus}!`);

    // Tests may be "incomplete" if no spec is found (no `it`) or a test was
    // focused (`fit`).
    if (result.incompleteReason) {
      failedSpecs.push({
        message: result.incompleteReason,
      });
    }

    await sessionFinished({
      passed: result.overallStatus === 'passed',
      errors: failedSpecs,
      testResults: {
        name: '',
        suites: [],
        tests: allSpecs,
      },
    });
  },
});

await sessionStarted();

// Load the test file and evaluate it.
try {
  await import(new URL(testFile, document.baseURI).href);

  // Execute the test functions.
  jasmineEnv.execute();
} catch (err) {
  console.error(err);
  await sessionFailed(err);
}
