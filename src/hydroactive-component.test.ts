import './testing/noop-component.js';

import { applyDefinition, HydroActiveComponent } from './hydroactive-component.js';
import { testCase, useTestCases } from './testing/test-cases.js';

type Hydrate = HydroActiveComponent['hydrate'];

describe('hydroactive-component', () => {
  useTestCases();

  afterEach(() => {
    for (const child of Array.from(document.body.childNodes)) {
      child.remove();
    }
  });

  describe('HydroActiveComponent', () => {
    it('hydrates on upgrade when already connected to the DOM', testCase('already-rendered', () => {
      const hydrate = jasmine.createSpy<Hydrate>('hydrate');

      customElements.define(
        'already-rendered',
        class extends HydroActiveComponent {
          override hydrate = hydrate;
        },
      );

      expect(hydrate).toHaveBeenCalledTimes(1);
    }));

    it('hydrates on connect', () => {
      const hydrate = jasmine.createSpy<Hydrate>('hydrate');

      customElements.define(
        'new-component',
        class extends HydroActiveComponent {
          override hydrate = hydrate;
        },
      );
      expect(hydrate).not.toHaveBeenCalled();

      const comp = document.createElement('new-component');
      expect(hydrate).not.toHaveBeenCalled();

      document.body.appendChild(comp);
      expect(hydrate).toHaveBeenCalledTimes(1);
    });

    it('does not hydrate a second time when moved around the DOM', () => {
      const hydrate = jasmine.createSpy<Hydrate>('hydrate');

      customElements.define(
        'another-component',
        class extends HydroActiveComponent {
          override hydrate = hydrate;
        },
      );

      const el = document.createElement('another-component');
      document.body.appendChild(el);
      expect(hydrate).toHaveBeenCalledTimes(1);
      hydrate.calls.reset();

      el.remove();
      document.body.appendChild(el);
      expect(hydrate).not.toHaveBeenCalled();
    });

    describe('`defer-hydration`', () => {
      it('defers hydration', testCase('deferred', (el) => {
        const hydrate = jasmine.createSpy<Hydrate>('hydrate');

        customElements.define(
          'deferred-component',
          class extends HydroActiveComponent {
            override hydrate = hydrate;
          },
        );

        // Should not implicitly hydrate due to `defer-hydration`.
        expect(hydrate).not.toHaveBeenCalled();

        // Should synchronously hydrate when `defer-hydration` is removed.
        el.removeAttribute('defer-hydration');
        expect(hydrate).toHaveBeenCalledTimes(1);
      }));

      it('does not hydrate when imperatively created', () => {
        const hydrate = jasmine.createSpy<Hydrate>('hydrate');
        customElements.define(
          'imperative-creation',
          class extends HydroActiveComponent {
            override hydrate = hydrate;
          },
        );

        document.createElement('imperative-creation');
        expect(hydrate).not.toHaveBeenCalled();
      });

      it('does not hydrate when a component is upgraded while disconnected', () => {
        const el = document.createElement('disconnected-upgrade');

        const hydrate = jasmine.createSpy<Hydrate>('hydrate');
        customElements.define(
          'disconnected-upgrade',
          class extends HydroActiveComponent {
            override hydrate = hydrate;
          },
        );
        expect(hydrate).not.toHaveBeenCalled();

        customElements.upgrade(el);
        expect(hydrate).not.toHaveBeenCalled();
      });

      it('hydrates when `defer-hydration` is removed while disconnected from the DOM', testCase('disconnected-hydration', (el) => {
        const hydrate = jasmine.createSpy<Hydrate>('hydrate');

        customElements.define(
          'disconnected-hydration',
          class extends HydroActiveComponent {
            override hydrate = hydrate;
          },
        );
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
        const hydrate = jasmine.createSpy<Hydrate>('hydrate');
        customElements.define(
          'imperative-connect',
          class extends HydroActiveComponent {
            override hydrate = hydrate;
          },
        );

        const el = document.createElement('imperative-connect');
        el.setAttribute('defer-hydration', '');
        expect(hydrate).not.toHaveBeenCalled();

        // Since the element has `defer-hydration` set, this should *not*
        // trigger hydration.
        document.body.appendChild(el);
        expect(hydrate).not.toHaveBeenCalled();
      });
    });

    describe('stable', () => {
      it('resolves when the component is stable of all effects', async () => {
        const el = document.createElement('noop-component');
        document.body.appendChild(el);
        const accessor = el.getComponentAccessor();

        const effect = jasmine.createSpy<() => void>('effect');

        accessor.effect(effect);
        await expectAsync(el.stable()).toBePending();
        expect(effect).not.toHaveBeenCalled();

        // Eventually resolves.
        await expectAsync(el.stable()).toBeResolved();
        expect(effect).toHaveBeenCalledOnceWith();
      });
    });
  });

  describe('applyDefinition', () => {
    const hydrate = jasmine.createSpy<Hydrate>('hydrate');
    class CompDef extends HydroActiveComponent {
      override hydrate = hydrate;

      existing(): void {}
    }
    customElements.define('comp-def', CompDef);

    it('applies the given component definition', () => {
      const el = document.createElement('comp-def') as CompDef;
      const def = { foo: 'bar', hello: 'world' };

      applyDefinition(el, def);

      expect(el.foo).toBe('bar');
      expect(el.hello).toBe('world');
    });

    it('throws when overwriting an existing owned property', () => {
      const el = document.createElement('comp-def') as CompDef;
      const def = { existing: 'test' };

      expect(() => applyDefinition(el, def))
          .toThrowError(/Cannot redefine existing property/);
    });

    it('throws when overwriting an existing inherited property', () => {
      const el = document.createElement('comp-def') as CompDef;
      const def = { connectedCallback: 'test' };

      expect(() => applyDefinition(el, def))
          .toThrowError(/Cannot redefine existing property/);
    });
  });
});
