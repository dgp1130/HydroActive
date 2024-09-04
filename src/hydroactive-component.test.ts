import './testing/noop-component.js';

import { OnConnect, OnDisconnect } from './connectable.js';
import { ComponentRef } from './component-ref.js';
import { HydroActiveComponent } from './hydroactive-component.js';
import { testCase, useTestCases } from './testing/test-cases.js';
import { ComponentAccessor } from './component-accessor.js';

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
      const hydrate = jasmine.createSpy<Hydrate>('hydrate')
          .and.callFake(function (this: HydroActiveComponent): void {
            const accessor = ComponentAccessor.fromComponent(this);
            const ref = ComponentRef._from(accessor);
            this._registerComponentRef(ref);
          });

      customElements.define(
        'already-rendered',
        class extends HydroActiveComponent {
          override hydrate = hydrate;
        },
      );

      expect(hydrate).toHaveBeenCalledTimes(1);
    }));

    it('hydrates on connect', () => {
      const hydrate = jasmine.createSpy<Hydrate>('hydrate')
          .and.callFake(function (this: HydroActiveComponent): void {
            const accessor = ComponentAccessor.fromComponent(this);
            const ref = ComponentRef._from(accessor);
            this._registerComponentRef(ref);
          });

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
      const hydrate = jasmine.createSpy<Hydrate>('hydrate')
          .and.callFake(function (this: HydroActiveComponent): void {
            const accessor = ComponentAccessor.fromComponent(this);
            const ref = ComponentRef._from(accessor);
            this._registerComponentRef(ref);
          });

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
        const hydrate = jasmine.createSpy<Hydrate>('hydrate')
            .and.callFake(function (this: HydroActiveComponent): void {
              const accessor = ComponentAccessor.fromComponent(this);
              const ref = ComponentRef._from(accessor);
              this._registerComponentRef(ref);
            });

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
        const hydrate = jasmine.createSpy<Hydrate>('hydrate')
            .and.callFake(function (this: HydroActiveComponent): void {
              const accessor = ComponentAccessor.fromComponent(this);
              const ref = ComponentRef._from(accessor);
              this._registerComponentRef(ref);
            });

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
        const ref = el.getComponentRef();

        const effect = jasmine.createSpy<() => void>('effect');

        ref.effect(effect);
        await expectAsync(el.stable()).toBePending();
        expect(effect).not.toHaveBeenCalled();

        // Eventually resolves.
        await expectAsync(el.stable()).toBeResolved();
        expect(effect).toHaveBeenCalledOnceWith();
      });
    });
  });
});
