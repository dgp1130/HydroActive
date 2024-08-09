import { Queryable, query, queryAll } from './queryable.js';
import { parseHtml } from './testing.js';

describe('queryable', () => {
  describe('Queryable', () => {
    describe('query', () => {
      it('type checks the result by parsing the selector query', () => {
        // Type only test, only needs to compile, not execute.
        expect().nothing();
        () => {
          const queryable = {} as Queryable<Element>;
          const result = queryable.query('.foo #bar > [baz] input');

          result satisfies Queryable<HTMLInputElement>;
        };
      });

      it('returns a non-nullish value by default', () => {
        // Type only test, only needs to compile, not execute.
        expect().nothing();
        () => {
          const queryable = {} as Queryable<Element>;
          const result = queryable.query('input');

          // @ts-expect-error
          null satisfies typeof result;
        };
      });

      it('returns a non-nullish value when explicitly not optional', () => {
        // Type only test, only needs to compile, not execute.
        expect().nothing();
        () => {
          const queryable = {} as Queryable<Element>;
          const result = queryable.query('input', { optional: false });

          // @ts-expect-error
          null satisfies typeof result;
        };
      });

      it('returns a nullish value when explicitly optional', () => {
        // Type only test, only needs to compile, not execute.
        expect().nothing();
        () => {
          const queryable = {} as Queryable<Element>;
          const result = queryable.query('input', { optional: true });

          null satisfies typeof result;
        };
      });

      it('returns a nullish value when optionality is unknown', () => {
        // Type only test, only needs to compile, not execute.
        expect().nothing();
        () => {
          const queryable = {} as Queryable<Element>;
          const optional = false as boolean;
          const result = queryable.query('input', { optional });

          null satisfies typeof result;
        };
      });

      it('can query a shadow root', () => {
        // Type only test, only needs to compile, not execute.
        expect().nothing();
        () => {
          const queryable = {} as Queryable<ShadowRoot>;
          const result = queryable.query('input');

          result satisfies Queryable<HTMLInputElement>;
        };
      });
    });

    describe('queryAll', () => {
      it('type checks the result by parsing the selector query', () => {
        // Type only test, only needs to compile, not execute.
        expect().nothing();
        () => {
          const queryable = {} as Queryable<Element>;
          const result = queryable.queryAll('.foo #bar > [baz] input');

          result satisfies Array<Queryable<HTMLInputElement>>;
        };
      });

      it('can query a shadow root', () => {
        // Type only test, only needs to compile, not execute.
        expect().nothing();
        () => {
          const queryable = {} as Queryable<ShadowRoot>;
          const result = queryable.queryAll('input');

          result satisfies Array<Queryable<HTMLInputElement>>;
        };
      });
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

      expect(query(el, 'span')!.textContent).toBe('First');
    });

    it('throws when no element is found by default', () => {
      const el = parseHtml(HTMLDivElement, `
        <div>
          <span>Hello, World!</span>
        </div>
      `);

      expect(() => query(el, 'input'))
          .toThrowError(/did not resolve to an element/);
    });

    it('returns `null` when no element is found and explicitly `optional`', () => {
      const el = parseHtml(HTMLDivElement, `
        <div>
          <span>Hello, World!</span>
        </div>
      `);

      expect(query(el, 'input', { optional: true })).toBeNull();
    });

    it('throws when no element is found and explicitly not `optional`', () => {
      const el = parseHtml(HTMLDivElement, `
        <div>
          <span>Hello, World!</span>
        </div>
      `);

      expect(() => query(el, 'input', { optional: false }))
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

      const items = Array.from(queryAll(el, 'span'))
          .map((span) => span.textContent);
      expect(items).toEqual([ 'First', 'Second', 'Third' ]);
    });

    it('throws when no element is found by default', () => {
      const el = parseHtml(HTMLDivElement, `
        <div>
          <span>Hello, World!</span>
        </div>
      `);

      expect(() => queryAll(el, 'input'))
          .toThrowError(/did not resolve to any elements/);
    });

    it('returns empty list when no element is found and explicitly `optional`', () => {
      const el = parseHtml(HTMLDivElement, `
        <div>
          <span>Hello, World!</span>
        </div>
      `);

      expect(Array.from(queryAll(el, 'input', { optional: true }))).toEqual([]);
    });

    it('throws when no element is found and explicitly not `optional`', () => {
      const el = parseHtml(HTMLDivElement, `
        <div>
          <span>Hello, World!</span>
        </div>
      `);

      expect(() => queryAll(el, 'input', { optional: false }))
          .toThrowError(/did not resolve to any elements/);
    });
  });
});
