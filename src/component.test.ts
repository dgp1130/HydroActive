import { component, HydrateLifecycle } from './component.js';
import { ElementRef } from './element-ref.js';
import { testCase, useTestCases } from './testing/test-cases.js';

describe('component', () => {
  useTestCases();

  afterEach(() => {
    for (const child of Array.from(document.body.childNodes)) {
      child.remove();
    }
  });

  describe('component', () => {
    it('upgrades already rendered components', testCase('already-rendered', () => {
      const hydrate = jasmine.createSpy<HydrateLifecycle>('hydrate');
      component('already-rendered', hydrate);

      expect(hydrate).toHaveBeenCalledTimes(1);
    }));

    it('upgrades components rendered after definition', () => {
      const hydrate = jasmine.createSpy<HydrateLifecycle>('hydrate');

      component('new-component', hydrate);
      expect(hydrate).not.toHaveBeenCalled();

      const comp = document.createElement('new-component');
      expect(hydrate).not.toHaveBeenCalled();

      document.body.appendChild(comp);
      expect(hydrate).toHaveBeenCalledTimes(1);
    });

    it('does not hydrate a second time when moved in the DOM', () => {
      const hydrate = jasmine.createSpy<HydrateLifecycle>('hydrate');
      component('another-component', hydrate);

      const comp = document.createElement('another-component');
      document.body.appendChild(comp);
      expect(hydrate).toHaveBeenCalledTimes(1);
      hydrate.calls.reset();

      comp.remove();
      document.body.appendChild(comp);
      expect(hydrate).not.toHaveBeenCalled();
    });

    it('invokes hydrate callback without a `this` value', () => {
      // Can't use Jasmine spies here because they will default `this` to `window`
      // because they are run in "sloppy mode".
      let self: unknown = 'defined' /* initial value other than undefined */;
      function hydrate(this: unknown): void {
        self = this;
      }

      component('this-component', hydrate);

      const comp = document.createElement('this-component');
      document.body.appendChild(comp);

      expect(self).toBeUndefined();
    });

    it('invokes hydrate callback with an `ElementRef` of the component host', () => {
      const hydrate = jasmine.createSpy<HydrateLifecycle>('hydrate');
      component('host-component', hydrate);

      const comp = document.createElement('host-component');
      document.body.appendChild(comp);

      expect(hydrate).toHaveBeenCalledOnceWith(ElementRef.from(comp));
    });

    it('invokes hydrate callback with an `ElementRef` typed to `HTMLElement`', () => {
      // Type-only test, only needs to compile, not execute.
      expect().nothing();
      () => {
        const Comp = component('host-type', (host) => {
          // Host is assignable to an `ElementRef<HTMLElement>`.
          const ref: ElementRef<HTMLElement> = host;
        });
      };
    });

    it('sets the class name', () => {
      {
        const Comp = component('foo-bar-baz', () => {});
        expect(Comp.name).toBe('FooBarBaz');
      }

      {
        const Comp = component('foo-bar-', () => {});
        expect(Comp.name).toBe('FooBar');
      }

      {
        const Comp = component('foo-----bar', () => {});
        expect(Comp.name).toBe('FooBar');
      }
    });

    describe('`defer-hydration`', () => {
      it('defers hydration', testCase('deferred', (el) => {
        const hydrate = jasmine.createSpy<HydrateLifecycle>('hydrate');
        component('deferred-component', hydrate);

        // Should not implicitly hydrate due to `defer-hydration`.
        expect(hydrate).not.toHaveBeenCalled();

        // Should synchronously hydrate when `defer-hydration` is removed.
        el.removeAttribute('defer-hydration');
        expect(hydrate).toHaveBeenCalledTimes(1);
      }));

      it('does not hydrate when imperatively created', () => {
        const hydrate = jasmine.createSpy<HydrateLifecycle>('hydrate');
        component('imperative-creation', hydrate);

        document.createElement('imperative-creation');
        expect(hydrate).not.toHaveBeenCalled();
      });

      it('does not hydrate when a component is upgraded while disconnected', () => {
        const el = document.createElement('disconnected-upgrade');

        const hydrate = jasmine.createSpy<HydrateLifecycle>('hydrate');
        component('disconnected-upgrade', hydrate);
        expect(hydrate).not.toHaveBeenCalled();

        customElements.upgrade(el);
        expect(hydrate).not.toHaveBeenCalled();
      });

      it('hydrates when `defer-hydration` is removed while disconnected from the DOM', testCase('disconnected-hydration', (el) => {
        const hydrate = jasmine.createSpy<HydrateLifecycle>('hydrate');
        component('disconnected-hydration', hydrate);
        expect(hydrate).not.toHaveBeenCalled();

        el.remove();
        expect(hydrate).not.toHaveBeenCalled();

        // Removing `defer-hydration` should trigger hydration even though the
        // element is disconnected.
        el.removeAttribute('defer-hydration');
        expect(hydrate).toHaveBeenCalledTimes(1);
        hydrate.calls.reset();

        // Should not re-hydrate when connected to the DOM.
        document.body.appendChild(el);
        expect(hydrate).not.toHaveBeenCalled();
      }));

      it('does not hydrate when imperatively connected with `defer-hydration`', () => {
        const hydrate = jasmine.createSpy<HydrateLifecycle>('hydrate');
        component('imperative-connect', hydrate);

        const el = document.createElement('imperative-connect');
        el.setAttribute('defer-hydration', '');
        expect(hydrate).not.toHaveBeenCalled();

        // Since the element has `defer-hydration` set, this should *not*
        // trigger hydration.
        document.body.appendChild(el);
        expect(hydrate).not.toHaveBeenCalled();
      });
    });
  });
});
