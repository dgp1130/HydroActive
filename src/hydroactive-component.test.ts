import './testing/noop-component.js';

import { ComponentRef, OnConnect, OnDisconnect } from './component-ref.js';
import { ElementRef } from './element-ref.js';
import { HydroActiveComponent } from './hydroactive-component.js';
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
      const hydrate = jasmine.createSpy<Hydrate>('hydrate')
          .and.callFake(function (this: HydroActiveComponent): void {
            const ref = ComponentRef._from(ElementRef.from(this));
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
            const ref = ComponentRef._from(ElementRef.from(this));
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
            const ref = ComponentRef._from(ElementRef.from(this));
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
              const ref = ComponentRef._from(ElementRef.from(this));
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
              const ref = ComponentRef._from(ElementRef.from(this));
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

    describe('_registerComponentRef', () => {
      it('registers the `ComponentRef` and invokes its lifecycle hooks', () => {
        const onDisconnect = jasmine.createSpy<OnDisconnect>('onDisconnect');
        const onConnect = jasmine.createSpy<OnConnect>('onConnect')
            .and.returnValue(onDisconnect);

        customElements.define(
          'lifecycle-comp',
          class extends HydroActiveComponent {
            hydrate(): void {}
          },
        );

        const el =
            document.createElement('lifecycle-comp') as HydroActiveComponent;
        const ref = ComponentRef._from(ElementRef.from(el));
        el._registerComponentRef(ref);

        ref.connected(onConnect);

        // Invokes the `onConnect` listener when connected.
        document.body.appendChild(el);
        expect(onConnect).toHaveBeenCalledTimes(1);
        expect(onDisconnect).not.toHaveBeenCalled();

        onConnect.calls.reset();

        // Invokes the `onDisconnect` listener when disconnected.
        el.remove();
        expect(onConnect).not.toHaveBeenCalled();
        expect(onDisconnect).toHaveBeenCalledTimes(1);
      });

      it('does *not* invoke connect listener prior to hydration', () => {
        let hydrated = false;
        const onConnect = jasmine.createSpy<OnConnect>('onConnect')
            .and.callFake(() => {
              // Connection happens before hydration.
              expect(hydrated).toBeFalse();
            });

        customElements.define(
          'hydration-connect',
          class extends HydroActiveComponent {
            override hydrate(): void {
              hydrated = true;
            }
          },
        );

        const el = document.createElement('hydration-connect') as
            HydroActiveComponent;
        const ref = ComponentRef._from(ElementRef.from(el));
        el._registerComponentRef(ref);
        ref.connected(onConnect);
        expect(onConnect).not.toHaveBeenCalled();

        document.body.appendChild(el);

        // Verify that `onConnect` was invoked, which itself should have
        // verified that `hydrate` was *not* called before it.
        expect(onConnect).toHaveBeenCalled();
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
