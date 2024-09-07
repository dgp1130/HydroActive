import { type SignalHydrateLifecycle, defineSignalComponent } from './signal-component.js';
import { HydroActiveComponent } from './hydroactive-component.js';
import { SignalComponentAccessor } from './signal-component-accessor.js';
import { ReactiveRootImpl } from './signals/reactive-root.js';
import { TestScheduler } from './signals/schedulers/test-scheduler.js';
import { testCase, useTestCases } from './testing/test-cases.js';

describe('signal-component', () => {
  useTestCases();

  afterEach(() => {
    for (const child of Array.from(document.body.childNodes)) {
      child.remove();
    }
  });

  describe('defineSignalComponent', () => {
    it('upgrades already rendered components', testCase('already-rendered', () => {
      const hydrate = jasmine.createSpy<SignalHydrateLifecycle>('hydrate');
      defineSignalComponent('already-rendered', hydrate);

      expect(hydrate).toHaveBeenCalledTimes(1);
    }));

    it('upgrades components rendered after definition', () => {
      const hydrate = jasmine.createSpy<SignalHydrateLifecycle>('hydrate');

      defineSignalComponent('new-component', hydrate);
      expect(hydrate).not.toHaveBeenCalled();

      const comp = document.createElement('new-component');
      expect(hydrate).not.toHaveBeenCalled();

      document.body.appendChild(comp);
      expect(hydrate).toHaveBeenCalledTimes(1);
    });

    it('invokes hydrate callback without a `this` value', () => {
      // Can't use Jasmine spies here because they will default `this` to `window`
      // because they are run in "sloppy mode".
      let self: unknown = 'defined' /* initial value other than undefined */;
      function hydrate(this: unknown): void {
        self = this;
      }

      defineSignalComponent('this-component', hydrate);

      const comp = document.createElement('this-component');
      document.body.appendChild(comp);

      expect(self).toBeUndefined();
    });

    it('invokes hydrate callback with a `SignalComponentAccessor` of the component host', () => {
      const hydrate = jasmine.createSpy<SignalHydrateLifecycle>('hydrate');
      defineSignalComponent('host-component', hydrate);

      const comp =
          document.createElement('host-component') as HydroActiveComponent;
      document.body.appendChild(comp);

      const root = ReactiveRootImpl.from(
          comp._connectable, TestScheduler.from());
      const accessor = SignalComponentAccessor.fromSignalComponent(comp, root);
      expect(hydrate).toHaveBeenCalledOnceWith(accessor);
    });

    it('sets the class name', () => {
      const Comp = defineSignalComponent('foo-bar-baz', () => {});
      expect(Comp.name).toBe('FooBarBaz');
    });
  });
});
