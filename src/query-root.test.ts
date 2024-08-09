import { QueryRoot } from './query-root.js';

describe('query-root', () => {
  describe('QueryRoot', () => {
    describe('from', () => {
      it('creates a `QueryRoot` from the given element', () => {
        const el = document.createElement('div');

        expect(QueryRoot.from(el).root).toBe(el);
      });
    });
  });
});
