import { OnConnect, OnDisconnect } from './component-ref.js';
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

      const comp = document.createElement('another-component');
      document.body.appendChild(comp);
      expect(hydrate).toHaveBeenCalledTimes(1);
      hydrate.calls.reset();

      comp.remove();
      document.body.appendChild(comp);
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

    describe('_registerLifecycleHooks', () => {
      it('registers the connect and disconnect hooks', () => {
        const onConnect = jasmine.createSpy<OnConnect>('onConnect');
        const onDisconnect = jasmine.createSpy<OnDisconnect>('onDisconnect');

        customElements.define(
          'lifecycle-comp',
          class extends HydroActiveComponent {
            hydrate(): void {}
          },
        );

        const comp =
            document.createElement('lifecycle-comp') as HydroActiveComponent;
        comp._registerLifecycleHooks({ onConnect, onDisconnect });
        expect(onConnect).not.toHaveBeenCalled();
        expect(onDisconnect).not.toHaveBeenCalled();

        // Invokes the `onConnect` listener when connected.
        document.body.appendChild(comp);
        expect(onConnect).toHaveBeenCalledTimes(1);
        expect(onDisconnect).not.toHaveBeenCalled();

        onConnect.calls.reset();

        // Invokes the `onDisconnect` listener when disconnected.
        comp.remove();
        expect(onConnect).not.toHaveBeenCalled();
        expect(onDisconnect).toHaveBeenCalledTimes(1);
      });

      it('maintains multiple registered callbacks', () => {
        const onConnect1 = jasmine.createSpy<OnConnect>('onConnect1');
        const onDisconnect1 = jasmine.createSpy<OnDisconnect>('onDisconnect1');
        const onConnect2 = jasmine.createSpy<OnConnect>('onConnect2');
        const onDisconnect2 = jasmine.createSpy<OnDisconnect>('onDisconnect2');

        customElements.define(
          'multi-lifecycle-comp',
          class extends HydroActiveComponent {
            hydrate(): void {}
          },
        );

        const comp = document.createElement('multi-lifecycle-comp') as
            HydroActiveComponent;

        comp._registerLifecycleHooks({
          onConnect: onConnect1,
          onDisconnect: onDisconnect1,
        });
        expect(onConnect1).not.toHaveBeenCalled();
        expect(onDisconnect1).not.toHaveBeenCalled();

        comp._registerLifecycleHooks({
          onConnect: onConnect2,
          onDisconnect: onDisconnect2,
        });
        expect(onConnect2).not.toHaveBeenCalled();
        expect(onDisconnect2).not.toHaveBeenCalled();

        // Invokes the `onConnect` listeners when connected.
        document.body.appendChild(comp);
        expect(onConnect1).toHaveBeenCalledTimes(1);
        expect(onDisconnect1).not.toHaveBeenCalled();
        expect(onConnect2).toHaveBeenCalledTimes(1);
        expect(onDisconnect2).not.toHaveBeenCalled();

        onConnect1.calls.reset();
        onConnect2.calls.reset();

        // Invokes the `onDisconnect` listener when disconnected.
        comp.remove();
        expect(onConnect1).not.toHaveBeenCalled();
        expect(onDisconnect1).toHaveBeenCalledTimes(1);
        expect(onConnect2).not.toHaveBeenCalled();
        expect(onDisconnect2).toHaveBeenCalledTimes(1);
      });

      it('does not invoke connect listeners added during hydration', () => {
        const onConnect = jasmine.createSpy<OnConnect>('onConnect');

        customElements.define(
          'hydration-connect',
          class extends HydroActiveComponent {
            override hydrate(): void {
              this._registerLifecycleHooks({ onConnect });
            }
          },
        );

        document.body.appendChild(document.createElement('hydration-connect'));

        // Components are connected *before* they hydrate, therefore this event
        // should not be called.
        expect(onConnect).not.toHaveBeenCalled();
      });
    });
  });
});
