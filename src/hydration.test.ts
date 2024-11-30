import { hydrate, isHydrated, Properties } from './hydration.js';
import { NoopComponent } from './testing/noop-component.js';
import { testCase, useTestCases } from './testing/test-cases.js';

class ParamsElForTyping extends HTMLElement {
  declare tagName: 'HYDRATION-PARAMS-CE';

  foo!: string;
  bar!: number;
  baz!: boolean;
}

declare global {
  interface HTMLElementHydrationParamsMap {
    'hydration-params-ce': Properties<ParamsElForTyping, {
      required: 'foo',
      optional: 'bar' | 'baz',
    }>;
  }
}

class UntaggedElForTyping extends HTMLElement {
  // Element *without* a tightly-defined `tagName` property.
  // declare tagName: 'HYDRATION-UNTAGGED-CE';

  foo!: string;
}

declare global {
  // Unused due to lack of known tag name.
  interface HTMLElementHydrationParamsMap {
    'hydration-untagged-ce': Properties<UntaggedElForTyping, {
      optional: 'foo',
    }>;
  }
}

class UndeclaredParamsElForTyping extends HTMLElement {
  declare tagName: 'HYDRATION-UNDECLARED-CE';

  foo!: string;
}

declare global {
  interface HTMLElementHydrationParamsMap {
    // Element *without* an entry in the property map.
    // 'hydration-undeclared-ce': Properties<UndeclaredParamsElForTyping, {}>;
  }
}

describe('hydrate', () => {
  describe('isHydrated', () => {
    customElements.define('hydrate-ce', class extends HTMLElement {});

    it('returns `true` when given a non-deferred, defined, and upgraded custom element', () => {
      const el = document.createElement('hydrate-ce');

      expect(isHydrated(el)).toBeTrue();
    });

    it('returns `true` when given a non-deferred native element', () => {
      expect(isHydrated(document.createElement('div'))).toBeTrue();
    });

    it('returns `false` when given a deferred custom element', () => {
      const el = document.createElement('hydrate-ce');
      el.setAttribute('defer-hydration', '');

      expect(isHydrated(el)).toBeFalse();
    });

    it('returns `false` when given a custom element with `defer-hydration` set to arbitrary text', () => {
      const el = document.createElement('hydrate-ce');
      el.setAttribute('defer-hydration', 'abc123');

      expect(isHydrated(el)).toBeFalse();
    });

    it('returns `false` when given a not-yet-defined element', () => {
      const el = document.createElement('hydrate-ce-not-defined');

      expect(isHydrated(el)).toBeFalse();
    });

    it('returns `false` when given a defined, but not yet upgraded element', () => {
      const doc = document.implementation.createHTMLDocument();

      // Background elements are not upgraded immediately.
      const el = doc.createElement('hydrate-ce');
      expect(isHydrated(el)).toBeFalse();

      // Adopt and manually upgrade the element.
      document.adoptNode(el);
      customElements.upgrade(el);
      expect(isHydrated(el)).toBeTrue();
    });

    it('returns `false` when given a deferred native element', () => {
      const el = document.createElement('div');
      el.setAttribute('defer-hydration', '');

      expect(isHydrated(el)).toBeFalse();
    });
  });

  describe('hydrate', () => {
    useTestCases();

    afterEach(() => {
      for (const node of document.body.childNodes) node.remove();
    });

    it('hydrates the given element', testCase('deferred', (el) => {
      expect(isHydrated(el)).toBeFalse();

      expect(() => hydrate(el, NoopComponent)).not.toThrow();

      expect(isHydrated(el)).toBeTrue();
      expect((el as NoopComponent).hydrated).toBeTrue();
    }));

    it('applies the given parameters prior to hydration', () => {
      let fooAtHydration: string | undefined = undefined;

      class ParamsCE extends HTMLElement {
        public foo!: string;

        static readonly observedAttributes = [ 'defer-hydration' ];
        attributeChangedCallback(
          name: string,
          _oldValue: string | null,
          newValue: string | null,
        ): void {
          if (name === 'defer-hydration' && newValue === null) this.hydrate();
        }

        private hydrate(): void {
          fooAtHydration = this.foo;
        }
      }
      customElements.define('params-ce', ParamsCE);

      const el = document.createElement('params-ce') as ParamsCE;
      el.setAttribute('defer-hydration', '');
      document.body.append(el);

      hydrate(el, ParamsCE, {
        foo: 'test',
      });

      expect(fooAtHydration!).toBe('test');
    });

    it('throws an error when given the wrong class', testCase('deferred', (el) => {
      class WrongComponent extends HTMLElement {}

      expect(() => hydrate(el, WrongComponent))
          .toThrowError(/did not extend provided class/);
    }));

    it('throws an error when given an element which has already hydrated', () => {
      const el = document.createElement('noop-component');
      document.body.append(el); // Not deferred, automatically hydrates.

      expect(() => hydrate(el, NoopComponent)).toThrowError(/already hydrated/);
    });

    it('throws an error when hydrating a not-yet-defined element', () => {
      const el = document.createElement('hydrate-not-defined-ce');
      el.setAttribute('defer-hydration', '');

      expect(() => hydrate(el, Element))
          .toThrowError(/element is not upgraded/);
    });

    it('throws an error when hydrating a defined, but not-yet-upgraded element', () => {
      const doc = document.implementation.createHTMLDocument();
      const el = doc.createElement('noop-component');
      el.setAttribute('defer-hydration', '');

      expect(() => hydrate(el, Element))
          .toThrowError(/element is not upgraded/);
    });

    it('narrows the input element type', () => {
      // Type-only test, only needs to compile, not execute.
      expect().nothing();
      () => {
        const el = {} as Element;

        hydrate(el, NoopComponent);

        el satisfies NoopComponent;
      };
    });

    it('narrows the props type to hydration params', () => {
      // Type-only test, only needs to compile, not execute.
      expect().nothing();
      () => {
        const el = {} as Element;
        hydrate(el, ParamsElForTyping, {
          foo: 'test',
          bar: 1234,
          baz: true,

          // @ts-expect-error Extra properties not allowed.
          hello: 'world',
        });
      };
    });

    it('requires required params', () => {
      // Type-only test, only needs to compile, not execute.
      expect().nothing();
      () => {
        const el = {} as Element;

        // @ts-expect-error Params object required.
        hydrate(el, ParamsElForTyping);

        // @ts-expect-error Required `foo` missing.
        hydrate(el, ParamsElForTyping, {
          bar: 1234,
          baz: true,
        });
      };
    });

    it('does not require optional params', () => {
      // Type-only test, only needs to compile, not execute.
      expect().nothing();
      () => {
        const el = {} as Element;

        hydrate(el, ParamsElForTyping, {
          foo: 'test',
          // Missing `bar` and `baz` are allowed.
        });
      };
    });

    it('type checks individual params', () => {
      // Type-only test, only needs to compile, not execute.
      expect().nothing();
      () => {
        const el = {} as Element;

        hydrate(el, ParamsElForTyping, {
          // @ts-expect-error Should be string.
          foo: 1234,

          // @ts-expect-error Should be number.
          bar: 'test',

          // @ts-expect-error Should be boolean.
          baz: 'test',
        });
      };
    });

    it('considers all properties optional for untagged elements', () => {
      // Type-only test, only needs to compile, not execute.
      expect().nothing();
      () => {
        const el = {} as Element;

        // No properties required.
        hydrate(el, UntaggedElForTyping);
        hydrate(el, UntaggedElForTyping, {});

        hydrate(el, UntaggedElForTyping, {
          // Can set any arbitrary properties.
          foo: 'test',

          // Even properties from the super class.
          hidden: true,

          // @ts-expect-error Unknown properties disallowed.
          bar: 'test',
        });
      };
    });

    it('considers all properties optional for elements not in the map', () => {
      // Type-only test, only needs to compile, not execute.
      expect().nothing();
      () => {
        const el = {} as Element;

        // No properties required.
        hydrate(el, UndeclaredParamsElForTyping);
        hydrate(el, UndeclaredParamsElForTyping, {});

        hydrate(el, UndeclaredParamsElForTyping, {
          // Can set any arbitrary properties.
          foo: 'test',

          // Even properties from the super class.
          hidden: true,

          // @ts-expect-error Unknown properties disallowed.
          bar: 'test',
        });
      };
    });
  });
});
