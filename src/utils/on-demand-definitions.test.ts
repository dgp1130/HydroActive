import '@webcomponents/scoped-custom-element-registry';

import { createDefine, defineIfSupported } from './on-demand-definitions.js';

describe('on-demand-definitions', () => {
  describe('defineIfSupported', () => {
    it('calls static `define` on a supporting class', () => {
      class MyElement extends HTMLElement {
        static define = jasmine.createSpy<() => void>('define');
      }

      defineIfSupported(MyElement);

      expect(MyElement.define).toHaveBeenCalledOnceWith();
    });

    it('ignores classes which do not implement the protocol', () => {
      class MyElement extends HTMLElement {
        // No `define` property.
        // static define(): void { /* ... */ }
      }

      expect(() => defineIfSupported(MyElement)).not.toThrow();
    });
  });

  describe('createDefine', () => {
    it('defines in the global registry', () => {
      class MyElement extends HTMLElement {
        static define = createDefine('on-demand--global-reg', this);
      }

      expect(customElements.get('on-demand--global-reg')).toBeUndefined();

      MyElement.define();

      expect(customElements.get('on-demand--global-reg')).toBe(MyElement);
    });

    it('no-ops when called multiple times', () => {
      class MyElement extends HTMLElement {
        static define = createDefine('on-demand--multi', this);
      }

      MyElement.define();
      expect(() => MyElement.define()).not.toThrow();
    });

    it('no-ops when `customElements.define` was already called', () => {
      class MyElement extends HTMLElement {
        static define = createDefine('on-demand--already-defined', this);
      }

      customElements.define('on-demand--already-defined', MyElement);

      expect(() => MyElement.define()).not.toThrow();
    });

    it('throws when the element was already defined with a different class', () => {
      class MyElement extends HTMLElement {
        static define = createDefine('on-demand--conflict', this);
      }

      customElements.define(
          'on-demand--conflict', class extends HTMLElement {});

      expect(() => MyElement.define()).toThrowError(/already defined/);
    });

    it('passes through element definition options', () => {
      class MyElement extends HTMLParagraphElement {
        static define = createDefine('on-demand--options', this, {
          extends: 'p',
        });
      }

      MyElement.define();

      const p = document.createElement('p', {
        is: 'on-demand--options',
      });
      expect(p).toBeInstanceOf(MyElement);
    });

    it('throws when given a tag name on the global registry', () => {
      class MyElement extends HTMLElement {
        static define = createDefine('on-demand--global-tag', this);
      }

      // Omitting registry throws.
      expect(() => MyElement.define(undefined, 'on-demand--new-tag')).toThrow();
      expect(customElements.get('on-demand--new-tag')).toBeNull();

      // Explicitly providing default registry throws.
      expect(() => MyElement.define(customElements, 'on-demand--new-tag'))
          .toThrow();
      expect(customElements.get('on-demand--new-tag')).toBeNull();
    });

    it('defines the element on a provided scoped registry', () => {
      class MyElement extends HTMLElement {
        static define = createDefine('on-demand--scoped', this);
      }

      const registry = new CustomElementRegistry();
      MyElement.define(registry);

      expect(registry.get('on-demand--scoped')).toBe(MyElement);
      expect(customElements.get('on-demand--scoped')).toBeNull();
    });

    it('allows redefining the tag name in a scoped registry', () => {
      class MyElement extends HTMLElement {
        static define = createDefine('on-demand--custom-tag', this);
      }

      const registry = new CustomElementRegistry();
      MyElement.define(registry, 'on-demand--different-tag');

      expect(registry.get('on-demand--different-tag')).toBe(MyElement);
      expect(registry.get('on-demand--custom-tag')).toBeNull();

      expect(customElements.get('on-demand--different-tag')).toBeNull();
      expect(customElements.get('on-demand--custom-tag')).toBeNull();
    });
  });
});
