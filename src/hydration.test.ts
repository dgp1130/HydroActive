import { hydrate, isHydrated } from './hydration.js';
import { NoopComponent } from './testing/noop-component.js';
import { testCase, useTestCases } from './testing/test-cases.js';

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
  });
});
