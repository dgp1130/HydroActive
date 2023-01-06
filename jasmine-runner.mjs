/**
 * @fileoverview Exposes a `run` function which runs a Jasmine test suite for the given entry point.
 * 
 * Forked from https://github.com/blueprintui/web-test-runner-jasmine/blob/d07dad01e9e287ea96c41c433c6f787f6170566a/src/index.ts.
 */

import { getConfig, sessionStarted, sessionFinished, sessionFailed } from '@web/test-runner-core/browser/session.js';

async function run(entryPoint, testFramework) {
  const jasmine = jasmineRequire.core(window.jasmineRequire);
  jasmine.DEFAULT_TIMEOUT_INTERVAL = testFramework?.config?.timeout ?? jasmine.DEFAULT_TIMEOUT_INTERVAL;
  const global = jasmine.getGlobal();
  global.jasmine = jasmine;
  const env = jasmine.getEnv();
  Object.assign(window, jasmineRequire.interface(jasmine, env));
  window.onload = function () {};

  const failedSpecs = [];
  const allSpecs = [];
  const failedImports = [];

  env.addReporter({
    jasmineStarted: () => {},
    suiteStarted: () => {},
    specStarted: () => {},
    suiteDone: () => {},
    specDone: result => {
      [...result.passedExpectations, ...result.failedExpectations].forEach(e => {
        allSpecs.push({
          name: e.description,
          passed: e.passed,
        });
      });

      if (result.status !== 'passed' || result.status !== 'incomplete') {
        result.failedExpectations.forEach(e => {
          const message = result.description + ': ' + e.stack;
          console.error(message);
          failedSpecs.push({
            message,
            name: e.description,
            stack: e.stack,
            expected: e.expected,
            actual: e.actual,
          });
        });
      }
    },
    jasmineDone: result => {
      console.log(`Tests ${result.overallStatus}`);
      sessionFinished({
        passed: result.overallStatus === 'passed',
        errors: [...failedSpecs, ...failedImports],
        testResults: {
          name: '',
          suites: [],
          tests: allSpecs,
        },
      });
    },
  });

  sessionStarted();
  const { testFile, testFrameworkConfig } = await getConfig();
  const config = { defaultTimeoutInterval: 60000, ...(testFrameworkConfig ?? {}) };

  jasmine.DEFAULT_TIMEOUT_INTERVAL = config.defaultTimeoutInterval;

  await import(entryPoint).catch(error => {
    failedImports.push({ file: testFile, error: { message: error.message, stack: error.stack } });
  });

  try {
    env.execute();
  } catch (error) {
    console.error(error);
    sessionFailed(error);
    return;
  }
}
