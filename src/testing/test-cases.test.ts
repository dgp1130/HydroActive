import { testCase, useTestCases } from './test-cases.js';

describe('test-cases', () => {
  describe('testCase', () => {
    useTestCases();

    it('runs standard test case', testCase('first', (el) => {
      expect(el.tagName).toBe('H1');
      expect(el.textContent).toBe('First test');
    }));

    it('runs a second test case', testCase('second', (el) => {
      expect(el.tagName).toBe('H1');
      expect(el.textContent).toBe('Second test');
    }));

    it('runs a single test case a second time', testCase('first', (el) => {
      expect(el.tagName).toBe('H1');
      expect(el.textContent).toBe('First test');
    }));

    it('throws when given a non-existent test case', async () => {
      await expectAsync(testCase('does-not-exist', () => {})())
          .toBeRejectedWithError(/No test case named `does-not-exist`\./);
    });

    it('throws when given a test case with no root element', async () => {
      await expectAsync(testCase('no-root', () => {})())
          .toBeRejectedWithError(
              /Test case `no-root` must contain exactly \*one\* root element\./);
    });

    it('throws when given a test case with multiple root elements', async () => {
      await expectAsync(testCase('multiple-roots', () => {})())
          .toBeRejectedWithError(
              /Test case `multiple-roots` must contain exactly \*one\* root element\./);
    });

    it('throws when given a test case with a node instead of an element', async () => {
      await expectAsync(testCase('multiple-roots', () => {})())
          .toBeRejectedWithError(
              /Test case `multiple-roots` must contain exactly \*one\* root element\./);
    });
  });

  describe('testCase with empty document', () => {
    const rootChildren: Node[] = [];
    beforeAll(() => {
      for (const el of Array.from(document.body.children)) {
        rootChildren.push(el);
        el.remove();
      }
    });

    afterAll(() => {
      for (const el of rootChildren) {
        document.body.append(el);
      }

      rootChildren.splice(0, rootChildren.length);
    });

    useTestCases();

    it('throws an error that no test cases were added', async () => {
      await expectAsync(testCase('does-not-exist', () => {})())
          .toBeRejectedWithError(/No test cases were found on the page\./);
    });
  });

  describe('testCase without useTestCases', () => {
    it('throws an error that no tests cases were found', async () => {
      await expectAsync(testCase('does-not-exist', () => {})())
          .toBeRejectedWithError(/No test cases were found on the page\./);
    });
  });
});
