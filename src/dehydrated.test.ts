import { Dehydrated } from './dehydrated.js';
import { ElementAccessor } from './element-accessor.js';
import { isHydrated, Properties } from './hydration.js';
import { parseHtml } from './testing.js';

class ParamsElForTyping extends HTMLElement {
  declare tagName: 'DEHYDRATED-PARAMS-CE';

  foo!: string;
  bar!: number;
  baz!: boolean;
}

declare global {
  interface HTMLElementHydrationParamsMap {
    'dehydrated-params-ce': Properties<ParamsElForTyping, {
      required: 'foo',
      optional: 'bar' | 'baz',
    }>;
  }
}

describe('dehydrated', () => {
  describe('Dehydrated', () => {
    class DefinedElement extends HTMLElement {}
    customElements.define('dehydrated-defined', DefinedElement);

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

    describe('access', () => {
      it('returns the underlying native element wrapped in an `ElementAccessor`', () => {
        const el = document.createElement('div');

        expect(Dehydrated.from(el).access().element).toBe(el);
      });

      it('returns the underlying native element with an explicit class wrapped in an `ElementAccessor`', () => {
        const el = document.createElement('div');

        expect(Dehydrated.from(el).access(HTMLDivElement).element).toBe(el);
      });

      it('returns the underlying hydrated custom element wrapped in an `ElementAccessor`', () => {
        const el = document.createElement('dehydrated-defined') as
            DefinedElement;

        expect(Dehydrated.from(el).access(DefinedElement).element).toBe(el);
      });

      it('returns the underlying hydrated custom element wrapped in an `ElementAccessor` from a super-class definition', () => {
        const el = document.createElement('dehydrated-defined');

        const dehydrated = Dehydrated.from(el);
        expect(dehydrated.access(HTMLElement))
            .toBeInstanceOf(ElementAccessor);
      });

      it('throws an error when given a custom element with no class', () => {
        const el = document.createElement('dehydrated-defined');

        const dehydrated = Dehydrated.from(el);
        expect(() => dehydrated.access())
            .toThrowError(/requires an element class/);
      });

      it('throws an error when given the wrong class for the provided custom element', () => {
        const el = document.createElement('dehydrated-defined');

        const dehydrated = Dehydrated.from(el);
        expect(() => dehydrated.access(HTMLDivElement))
            .toThrowError(/does not extend `HTMLDivElement`/);
      });

      it('throws an error when given a not-yet-defined custom element', () => {
        const el = document.createElement('not-yet-defined');

        const dehydrated = Dehydrated.from(el);
        expect(() => dehydrated.access(HTMLElement))
            .toThrowError(/not defined/);
      });

      it('throws an error when given a defined, but not-yet-upgraded custom element', () => {
        const doc = document.implementation.createHTMLDocument();
        const el = doc.createElement('dehydrated-defined');

        const dehydrated = Dehydrated.from(el);
        expect(() => dehydrated.access(HTMLElement))
            .toThrowError(/not been upgraded/);
      });

      it('narrows the return type to the given class', () => {
        // Type-only test, only needs to compile, not execute.
        expect().nothing();
        () => {
          const dehydrated = {} as Dehydrated<Element>;

          dehydrated.access(HTMLDivElement) satisfies
              ElementAccessor<HTMLDivElement>;
        };
      });

      it('prevents accessing via a super-class', () => {
        // Type-only test, only needs to compile, not execute.
        expect().nothing();
        () => {
          const dehydrated = {} as Dehydrated<DefinedElement>;

          // @ts-expect-error
          dehydrated.access(Element);
        };
      });
    });

    describe('hydrate', () => {
      it('hydrates and returns the underlying native element wrapped in an `ElementAccessor`', () => {
        const el = document.createElement('div');
        el.setAttribute('defer-hydration', '');

        const hydrated = Dehydrated.from(el).hydrate(HTMLDivElement).element;

        expect(hydrated).toBe(el);
        expect(isHydrated(hydrated)).toBeTrue();
      });

      it('hydrates and returns the underlying custom element wrapped in an `ElementAccessor`', () => {
        const el = document.createElement('dehydrated-defined');
        el.setAttribute('defer-hydration', '');

        const hydrated = Dehydrated.from(el).hydrate(DefinedElement).element;

        expect(hydrated).toBe(el as DefinedElement);
        expect(isHydrated(hydrated)).toBeTrue();
      });

      it('narrows the return type to the given class', () => {
        // Type-only test, only needs to compile, not execute.
        expect().nothing();
        () => {
          const dehydrated = {} as Dehydrated<Element>;

          dehydrated.hydrate(HTMLDivElement) satisfies
              ElementAccessor<HTMLDivElement>;
        };
      });

      it('narrows the props type to hydration params', () => {
        // Type-only test, only needs to compile, not execute.
        expect().nothing();
        () => {
          const dehydrated = {} as Dehydrated<Element>;

          dehydrated.hydrate(ParamsElForTyping, {
            foo: 'test',
            bar: 1234,
            baz: true,

            // @ts-expect-error Extra properties not allowed.
            hello: 'world',
          });
        };
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

    describe('shadow', () => {
      it('supports querying the shadow root', () => {
        const el = Dehydrated.from(parseHtml(HTMLDivElement, `
          <div>
            <template shadowrootmode="open">
              <span>Shadow</span>
              <slot></slot>
            </template>
            <span>Light</span>
          </div>
        `));

        expect(el.shadow.query('span').unvalidatedElement.textContent)
            .toBe('Shadow');
        expect(el.query('span').unvalidatedElement.textContent)
            .toBe('Light');
      });
    });
  });
});
