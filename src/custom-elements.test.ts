import { isCustomElement, isUpgraded } from './custom-elements.js';

describe('custom-elements', () => {
  describe('isCustomElement', () => {
    it('returns `true` when given a defined custom element', () => {
      customElements.define('ce-defined-test', class extends HTMLElement {});

      expect(isCustomElement(document.createElement('ce-defined-test')))
          .toBeTrue();
    });

    it('returns `true` when given a not-yet-defined custom element', () => {
      expect(isCustomElement(document.createElement('ce-not-defined-test')))
          .toBeTrue();
    });

    it('returns `false` when given a native HTML element', () => {
      expect(isCustomElement(document.createElement('div'))).toBeFalse();
    });
  });

  describe('isUpgraded', () => {
    it('returns `true` when given a defined custom element', () => {
      customElements.define('ce-defined-test-2', class extends HTMLElement {});

      expect(isUpgraded(document.createElement('ce-defined-test-2')))
          .toBeTrue();
    });

    it('returns `false` when given a not-yet-defined custom element', () => {
      expect(isUpgraded(document.createElement('ce-not-yet-defined-test')))
          .toBeFalse();
    });

    it('returns `false` when given a defined class but non-upgraded element', () => {
      customElements.define('ce-defined-test-3', class extends HTMLElement {});

      const backgroundDocument = document.implementation.createHTMLDocument();

      // Background elements are not upgraded immediately.
      const el = backgroundDocument.createElement('ce-defined-test-3');
      expect(isUpgraded(el)).toBeFalse();

      // Adopt and manually upgrade the element.
      document.adoptNode(el);
      customElements.upgrade(el);
      expect(isUpgraded(el)).toBeTrue();
    });

    it('throws when given a native HTML element', () => {
      expect(() => isUpgraded(document.createElement('div')))
          .toThrowError(/not a custom element/);
    });
  });
});
