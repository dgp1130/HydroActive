import { Dehydrated, hydrate } from './hydration.js';
import { parseHtml } from './testing.js';
import { defineBrokenComponent } from './testing/broken-component.js';
import { NoopComponent } from './testing/noop-component.js';

describe('hydration', () => {
  describe('hydrate', () => {
    it('hydrates the given component', () => {
      const comp = parseHtml(NoopComponent, `
        <noop-component defer-hydration></noop-component>
      `);

      expect(comp.hydrated).toBeUndefined();

      hydrate(comp, NoopComponent);

      expect(comp.hydrated).toBeTrue();
      expect(comp.hasAttribute('defer-hydration')).toBeFalse();
    });

    it('throws an error when the given component is not defined', () => {
      const comp = document.createElement('does-not-exist');

      expect(() => hydrate(comp, NoopComponent))
          .toThrowError(/has not been defined yet/);
    });

    it('throws an error when given the wrong class', () => {
      class WrongComponent extends HTMLElement {}

      const comp = parseHtml(NoopComponent, `
        <noop-component defer-hydration></noop-component>
      `);

      expect(() => hydrate(comp, WrongComponent))
          .toThrowError(/Expected element to be an instance of/);
    });

    it('throws an error when given an already hydrated component', () => {
      const comp = parseHtml(NoopComponent, `
        <noop-component></noop-component>
      `);

      expect(() => hydrate(comp, NoopComponent))
          .toThrowError(/already hydrated/);
    });

    it('hydrates non-custom elements', () => {
      const el = parseHtml(HTMLDivElement, `<div defer-hydration></div>`);

      expect(() => hydrate(el, HTMLDivElement)).not.toThrow();

      expect(el.hasAttribute('defer-hydration')).toBeFalse();
    });

    it('hydrates with the super class of an element', () => {
      const comp = parseHtml(NoopComponent, `
        <noop-component defer-hydration></noop-component>
      `);

      expect(() => hydrate(comp, Element)).not.toThrow();

      expect(comp.hydrated).toBeTrue();
    });

    it('does not propagate hydration errors', async () => {
      // Ignore uncatchable `attributeChangedCallback` errors in broken
      // components. See this discussion for why the errors are uncatchable:
      // https://github.com/webcomponents-cg/community-protocols/pull/15#issuecomment-1962284394
      await jasmine.spyOnGlobalErrorsAsync(async () => {
        const error = new Error('Oh noes!');
        const Broken = defineBrokenComponent('hydration-broken', error);

        const comp = parseHtml(Broken, `
          <hydration-broken defer-hydration></hydration-broken>
        `);

        expect(() => hydrate(comp, Broken)).not.toThrow();
      });
    });

    it('narrows the element type to the class definition', () => {
      // Type-only test, only needs to compile, not run.
      expect().nothing();
      () => {
        const comp = {} as Element;
        hydrate(comp, NoopComponent);
        comp satisfies NoopComponent;
      };
    });

    it('gives a compile-time error when hydrating components of the wrong type', () => {
      // Type-only test, only needs to compile, not run.
      expect().nothing();
      () => {
        class WrongComponent extends HTMLElement {
          // Need something here or else `WrongComponent` happens to implement
          // the `NoopComponent` interface.
          data?: string;
        }
        const comp = {} as Dehydrated<typeof NoopComponent>;

        // @ts-expect-error
        hydrate(comp, WrongComponent);
      };
    });
  });
});
