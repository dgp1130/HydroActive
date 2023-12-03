/**
 * @fileoverview Utilities for testing prerendered HTML.
 *
 * Usage:
 *
 * ```html
 * <html>
 *   <head><!-- ... --></head>
 *   <body>
 *     <template test-case="my-test-case">
 *       <div>Hello, World!</div>
 *     </template>
 *   </body>
 * </html>
 * ```
 *
 * ```typescript
 * import { testCase, useTestCases } from './testing/test-cases.js';
 *
 * describe('tests', () => {
 *   useTestCases();
 *
 *   // Renders and provides `my-test-case` from the prerendered template.
 *   it('does a thing', testCase('my-test-case', (el) => {
 *     expect(el.textContent).toBe('Hello, World!');
 *   }));
 * });
 * ```
 */

/** Holds number of test case templates keyed by their name. */
const testCaseMap = new Map<string, HTMLTemplateElement>();

/**
 * A "hook" to be called in a `describe` block which identifies and removes all
 * test cases from the DOM, tracking them to be rendered and added by
 * {@link testCase} when needed.
 */
export function useTestCases(): void {
  // Find all test cases before tests run and remove them from the DOM.
  beforeAll(() => {
    for (const rootEl of Array.from(document.body.children)) {
      if (!(rootEl instanceof HTMLTemplateElement)) continue;

      const name = rootEl.getAttribute('test-case');
      if (!name) continue;

      rootEl.remove();
      testCaseMap.set(name, rootEl);
    }
  });

  // Clean up just in case `useTestCases` is called in multiple `describe`
  // blocks.
  afterAll(() => {
    testCaseMap.clear();
  });
}

/**
 * Wraps a Jasmine test callback and scopes it to a specific test case DOM
 * element. This will render the test case to the document body and invoke the
 * callback with a reference to the element.
 *
 * @param name The test case name to render.
 * @param callback The Jasmine test implementation to test the DOM.
 */
export function testCase(
  name: string,
  callback: (el: Element) => ReturnType<jasmine.ImplementationCallback>,
): () => ReturnType<jasmine.ImplementationCallback> {
  return async () => {
    if (testCaseMap.size === 0) {
      throw new Error('No test cases were found on the page. Did you forget to call `useTestCases`?');
    }

    // Find the associated test case.
    const testCase = testCaseMap.get(name);
    if (!testCase) {
      throw new Error(`No test case named \`${
          name}\`. Did you forget to add a \`<template test-case="...">\` element?`);
    }

    // Clone the test case element in case it is used and mutated by multiple
    // tests.
    const cloneFragment =
        testCase.content.cloneNode(true /* deep */) as DocumentFragment;
    const [ cloneRoot ] = cloneFragment.children;
    if (!cloneRoot || cloneFragment.children.length > 1) {
      throw new Error(`Test case \`${
          name}\` must contain exactly *one* root element.`);
    }
    document.body.appendChild(cloneRoot);

    // Invoke the underlying test.
    let result: ReturnType<jasmine.ImplementationCallback>;
    try {
      result = await callback(cloneRoot);
    } finally {
      // Clean up the test case.
      cloneRoot.remove();
    }

    return result;
  };
}
