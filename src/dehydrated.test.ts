import { Dehydrated } from './dehydrated.js';
import { parseHtml } from './testing.js';

describe('dehydrated', () => {
  describe('Dehydrated', () => {
    describe('from', () => {
      it('creates a new `Dehydrated`', () => {
        const dehydrated = Dehydrated.from(document.createElement('div'));
        expect(dehydrated).toBeInstanceOf(Dehydrated);
      });
    });

    describe('unvalidatedElement', () => {
      it('returns the wrapped element', () => {
        const el = document.createElement('div');

        const dehydrated = Dehydrated.from(el);

        expect(dehydrated.unvalidatedElement).toBe(el);
      });
    });

    describe('query', () => {
      it('returns the first queried element', () => {
        const el = Dehydrated.from(parseHtml(HTMLDivElement, `
          <div>
            <span>First</span>
            <span>Second</span>
          </div>
        `));

        expect(el.query('span').unvalidatedElement.textContent)
            .toBe('First');
      });

      it('throws when no element is found by default', () => {
        const el = Dehydrated.from(parseHtml(HTMLDivElement, `
          <div>
            <span>Hello, World!</span>
          </div>
        `));

        expect(() => el.query('input'))
            .toThrowError(/did not resolve to an element/);
      });

      it('returns `null` when no element is found and explicitly `optional`', () => {
        const el = Dehydrated.from(parseHtml(HTMLDivElement, `
          <div>
            <span>Hello, World!</span>
          </div>
        `));

        expect(el.query('input', { optional: true })).toBeNull();
      });

      it('throws when no element is found and explicitly not `optional`', () => {
        const el = Dehydrated.from(parseHtml(HTMLDivElement, `
          <div>
            <span>Hello, World!</span>
          </div>
        `));

        expect(() => el.query('input', { optional: false }))
            .toThrowError(/did not resolve to an element/);
      });

      it('type checks the result by parsing the selector query', () => {
        // Type only test, only needs to compile, not execute.
        expect().nothing();
        () => {
          const el = {} as Dehydrated<Element>;
          const result = el.query('.foo #bar > [baz] input');

          result satisfies Dehydrated<HTMLInputElement>;
        };
      });

      it('returns a non-nullish value by default', () => {
        // Type only test, only needs to compile, not execute.
        expect().nothing();
        () => {
          const el = {} as Dehydrated<Element>;
          const result = el.query('input');

          // @ts-expect-error
          null satisfies typeof result;
        };
      });

      it('returns a non-nullish value when explicitly not optional', () => {
        // Type only test, only needs to compile, not execute.
        expect().nothing();
        () => {
          const el = {} as Dehydrated<Element>;
          const result = el.query('input', { optional: false });

          // @ts-expect-error
          null satisfies typeof result;
        };
      });

      it('returns a nullish value when explicitly optional', () => {
        // Type only test, only needs to compile, not execute.
        expect().nothing();
        () => {
          const el = {} as Dehydrated<Element>;
          const result = el.query('input', { optional: true });

          null satisfies typeof result;
        };
      });

      it('returns a nullish value when optionality is unknown', () => {
        // Type only test, only needs to compile, not execute.
        expect().nothing();
        () => {
          const el = {} as Dehydrated<Element>;
          const optional = false as boolean;
          const result = el.query('input', { optional });

          null satisfies typeof result;
        };
      });
    });

    describe('queryAll', () => {
      it('returns the first queried element', () => {
        const el = Dehydrated.from(parseHtml(HTMLDivElement, `
          <div>
            <span>First</span>
            <span>Second</span>
            <span>Third</span>
          </div>
        `));

        const items = Array.from(el.queryAll('span'))
            .map((span) => span.unvalidatedElement.textContent);
        expect(items).toEqual([ 'First', 'Second', 'Third' ]);
      });

      it('throws when no element is found by default', () => {
        const el = Dehydrated.from(parseHtml(HTMLDivElement, `
          <div>
            <span>Hello, World!</span>
          </div>
        `));

        expect(() => el.queryAll('input'))
            .toThrowError(/did not resolve to any elements/);
      });

      it('returns empty list when no element is found and explicitly `optional`', () => {
        const el = Dehydrated.from(parseHtml(HTMLDivElement, `
          <div>
            <span>Hello, World!</span>
          </div>
        `));

        expect(Array.from(el.queryAll('input', { optional: true })))
            .toEqual([]);
      });

      it('throws when no element is found and explicitly not `optional`', () => {
        const el = Dehydrated.from(parseHtml(HTMLDivElement, `
          <div>
            <span>Hello, World!</span>
          </div>
        `));

        expect(() => el.queryAll('input', { optional: false }))
            .toThrowError(/did not resolve to any elements/);
      });

      it('type checks the result by parsing the selector query', () => {
        // Type only test, only needs to compile, not execute.
        expect().nothing();
        () => {
          const el = {} as Dehydrated<Element>;
          const result = el.queryAll('.foo #bar > [baz] input');

          result satisfies Array<Dehydrated<HTMLInputElement>>;
        };
      });
    });
  });
});
