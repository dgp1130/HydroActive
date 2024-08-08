import { QueryRoot } from './query-root.js';
import { parseHtml } from './testing.js';

describe('query-root', () => {
  describe('QueryRoot', () => {
    describe('from', () => {
      it('creates a `QueryRoot` from the given element', () => {
        const el = document.createElement('div');

        expect(QueryRoot.from(el).root).toBe(el);
      });
    });

    describe('query', () => {
      it('returns the first queried element', () => {
        const el = parseHtml(HTMLDivElement, `
          <div>
            <span>First</span>
            <span>Second</span>
          </div>
        `);

        expect(QueryRoot.from(el).query('span').unvalidatedElement.textContent)
            .toBe('First');
      });

      it('throws when no element is found by default', () => {
        const el = parseHtml(HTMLDivElement, `
          <div>
            <span>Hello, World!</span>
          </div>
        `);

        expect(() => QueryRoot.from(el).query('input'))
            .toThrowError(/did not resolve to an element/);
      });

      it('returns `null` when no element is found and explicitly `optional`', () => {
        const el = parseHtml(HTMLDivElement, `
          <div>
            <span>Hello, World!</span>
          </div>
        `);

        expect(QueryRoot.from(el).query('input', { optional: true }))
            .toBeNull();
      });

      it('throws when no element is found and explicitly not `optional`', () => {
        const el = parseHtml(HTMLDivElement, `
          <div>
            <span>Hello, World!</span>
          </div>
        `);

        expect(() => QueryRoot.from(el).query('input', { optional: false }))
            .toThrowError(/did not resolve to an element/);
      });
    });

    describe('queryAll', () => {
      it('returns the first queried element', () => {
        const el = parseHtml(HTMLDivElement, `
          <div>
            <span>First</span>
            <span>Second</span>
            <span>Third</span>
          </div>
        `);

        const items = QueryRoot.from(el).queryAll('span')
            .map((span) => span.unvalidatedElement.textContent);
        expect(items).toEqual([ 'First', 'Second', 'Third' ]);
      });

      it('throws when no element is found by default', () => {
        const el = parseHtml(HTMLDivElement, `
          <div>
            <span>Hello, World!</span>
          </div>
        `);

        expect(() => QueryRoot.from(el).queryAll('input'))
            .toThrowError(/did not resolve to any elements/);
      });

      it('returns empty list when no element is found and explicitly `optional`', () => {
        const el = parseHtml(HTMLDivElement, `
          <div>
            <span>Hello, World!</span>
          </div>
        `);

        expect(QueryRoot.from(el).queryAll('input', { optional: true }))
            .toEqual([]);
      });

      it('throws when no element is found and explicitly not `optional`', () => {
        const el = parseHtml(HTMLDivElement, `
          <div>
            <span>Hello, World!</span>
          </div>
        `);

        expect(() => QueryRoot.from(el).queryAll('input', { optional: false }))
            .toThrowError(/did not resolve to any elements/);
      });
    });
  });
});
